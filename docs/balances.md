# Балансы

Единственный read-эндпоинт по балансам текущего аккаунта. Запись в `Balance` идёт **не отсюда** — её делают: `AnonymousUserMiddleware` при создании пользователя (10 000 USDT), `OrdersService.placeMarketOrder` при исполнении и `AccountsService.reset` при сбросе аккаунта. Этот документ — про чтение и про то, как фронт интерпретирует то, что получает.

## Эндпоинт

`GET /api/balances` — приватный, требует cookie `account_id` (см. [auth.md](auth.md)).

Возвращает [`BalanceMap`](../packages/shared/src/schemas/views/balance.ts) — `Record<asset, BalanceItem>`:

```jsonc
{
  "USDT": { "asset": "USDT", "free": "9850.5", "locked": "0", "total": "9850.5", "valueUsdt": "9850.5" },
  "BTC":  { "asset": "BTC",  "free": "0.00298", "locked": "0", "total": "0.00298", "valueUsdt": "149.5" }
}
```

## Поток

1. Запрос приходит на `GET /api/balances` с cookie.
2. `AnonymousUserMiddleware` либо находит пользователя, либо создаёт нового с одним балансом `USDT = 10000`. Для свежего посетителя первый ответ — `{ "USDT": { "free": "10000", ... } }`.
3. `BalancesService.findForAccount`:
   1. `prisma.balance.findMany({ where: { accountId } })`.
   2. **Сортировка в JS** (порядок свойств map):
      - USDT всегда первый.
      - Остальные — по убыванию `free` (`Decimal.cmp`).
   3. Передаёт массив в `BalanceMapper.toViewMap`.
4. `BalanceMapper` для каждого баланса:
   1. `total = free + locked` (через `decimal.js`).
   2. `valueUsdt`:
      - `asset === "USDT"` → `valueUsdt = total`.
      - `total === 0` → `valueUsdt = 0` (без запроса к Binance — экономим).
      - Иначе → `BinancePriceService.getCurrentPrice("{asset}USDT")`, и `valueUsdt = total × price`. Цена кэшируется на 1 секунду внутри сервиса.
      - На любой ошибке (Binance недоступен, пары `{asset}USDT` не существует) → `valueUsdt = "0"` + `logger.warn`. `200 OK` сохраняется.
5. Контроллер возвращает `BalanceMap`.

## Структура `BalanceItem`

| Поле        | Тип             | Источник                                                              |
| ----------- | --------------- | --------------------------------------------------------------------- |
| `asset`     | string          | Тикер актива (`"USDT"`, `"BTC"`, `"ETH"`, …).                         |
| `free`      | `DecimalString` | Из БД, доступно к расходованию (новая ордер-операция спишет отсюда).  |
| `locked`    | `DecimalString` | Из БД, зарезервировано открытыми лимитными ордерами. В MVP всегда `"0"`. |
| `total`     | `DecimalString` | `free + locked`. Считается на бэке.                                   |
| `valueUsdt` | `DecimalString` | Оценка в USDT по текущей цене Binance. См. логику выше.               |

`DecimalString` — `string`, отформатированная через `Decimal.toFixed()` без аргумента (нет экспоненциальной формы, нет потери точности).

## `free` vs `locked`

Поле `locked` есть в схеме БД (`Balance.locked Decimal @default(0)`) и в `BalanceItem`, но в MVP всегда равно `"0"`. Зачем оно тогда:

- **MARKET-ордер** в текущей реализации (см. [orders.md](orders.md)) списывает из `free` и сразу зачисляет встречный актив в `free`. `locked` не трогается.
- **LIMIT-ордер** (когда появится) при размещении переведёт средства `free → locked`. При исполнении — `locked → 0` и зачислит встречный актив в `free`. При отмене — `locked → free`.

То есть `locked` — это "обещанные" средства, которые юзер уже потратил с точки зрения логики, но ещё не лишился их физически. Фронт должен:

- Для расчёта "сколько можно потратить в новом ордере" — использовать `free`, **не** `total`.
- Для отображения общего размера портфеля — `total` и `valueUsdt`.
- Никогда не складывать `free` из API с количеством из локального оптимистичного апдейта без учёта `locked` — поле уже есть в схеме, чтобы будущая лимитная логика не сломала ни UI, ни мапперы.

## Сортировка и почему именно map, а не массив

`BalanceMap` — `Record<asset, BalanceItem>`. Это удобно фронту: `balances["USDT"].free` без поиска по массиву, и Zustand-стор может хранить балансы как key-value (см. оптимистичные апдейты ниже).

Сортировка делается на стороне сервера (`balances.service.ts:18-22`):

1. USDT первым (это quote asset и стартовая валюта).
2. Остальные — по убыванию `free`.

JS-движки V8/JSC сохраняют insertion order для string-ключей, поэтому `Object.entries(balanceMap)` на фронте идёт в том же порядке. **Но опираться на это в логике, требующей детерминизма, не стоит** — если порядок важен для UI (например, сортируемая таблица), пересортировать локально по нужному критерию.

## Валуация в USDT

`valueUsdt` — производное поле, его смысл: "если бы я прямо сейчас продал весь `total` этого актива по рыночной цене, сколько бы получил USDT".

Реализация в `BalanceMapper.valueInUsdt`:

- Дёргает `BinancePriceService.getCurrentPrice("{asset}USDT")` — это REST `GET /api/v3/ticker/price?symbol={asset}USDT` с 1-секундным кэшем.
- Никакой проверки на существование пары `{asset}USDT` нет — для всех сидируемых пар она существует. Для экзотических активов, если их когда-то добавят, может вернуться `400` от Binance, и `valueUsdt` молча станет `"0"`.

**`totalEquityUsdt` сервер не считает.** Сумма по портфелю — задача фронта:

```ts
const total = Object.values(balances).reduce(
  (sum, balance) => sum.plus(balance.valueUsdt),
  new Decimal(0),
);
```

Это сознательное решение: суммирование тривиально, а отдельное поле в ответе требовало бы согласованности с попозиционными `valueUsdt`, что только усложняет.

## Производительность и кэширование

- `BinancePriceService.getCurrentPrice` — кэш на 1 секунду per-symbol. Если у юзера 5 активов, кроме USDT, каждый вызов `/api/balances` делает до 4 REST-запросов к Binance (USDT и нулевые балансы пропускаются), но в горячем кэше — 0.
- Маппер обходит балансы **последовательно** (`for…of` + `await`). Для типичных 1–5 активов это OK. Если когда-то появятся аккаунты с десятками активов или батчевые сценарии (валуация многих аккаунтов разом) — стоит распараллелить через `Promise.all` или прогреть кэш `getAllTickers24h` (5-секундный, snapshot всего рынка) и использовать его вместо per-symbol запросов.
- На уровне БД — единственный `findMany` по индексу `@@unique([accountId, asset])`, по сути lookup.

## Изменение балансов

`/api/balances` — read-only. Балансы пишутся в трёх местах:

| Триггер                                      | Что происходит                                                                                                 | Где                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Первый запрос без cookie                     | `User` + `Account` + `Balance{asset:"USDT", free:10000}` создаются в одной транзакции.                         | [`AnonymousUserMiddleware`](../apps/api/src/auth/anonymous-user.middleware.ts)               |
| `POST /api/orders` (MARKET)                  | `balance.updateMany` спишет `free` у `spendAsset` и `balance.upsert` зачислит `free` у `receiveAsset`.         | [`OrdersService.placeMarketOrder`](../apps/api/src/orders/orders.service.ts)                 |
| `POST /api/account/reset`                    | Удаляет старого `User` (cascade на balances/orders/trades), создаёт нового с одним балансом USDT = 10 000.     | [`AccountsService.reset`](../apps/api/src/accounts/accounts.service.ts)                      |

Все три — атомарные транзакции; никаких "прочитал → посчитал → записал" нет.

`STARTING_USDT` — константа в [`apps/api/src/auth/cookie.ts`](../apps/api/src/auth/cookie.ts), `new Prisma.Decimal(10000)`. Единый источник правды для стартового баланса.

## Реактивность на фронте

Балансы — server state, живут в TanStack Query (`['balances']`), не в Zustand. Источники инвалидации/обновления:

- **После размещения ордера** — оптимистичный апдейт по `BalanceMap` прямо в Query Cache. На успешный ответ `POST /api/orders` — `queryClient.invalidateQueries({ queryKey: ['balances'] })`, чтобы синхронизироваться с сервером (см. коммит `877ab15`).
- **После reset аккаунта** — те же инвалидации `['balances']` и `['orders']`/`['trades']` (последние гарантированно пустые).
- **WS-канал балансов не реализован.** `BalanceUpdateSchema` в `@exchange/shared` есть, gateway его пока не шлёт — фронт зависит от Query refetch.

Этот слой подробно опишу в `docs/frontend-state.md`.

## Где это лежит

- [`apps/api/src/balances/balances.controller.ts`](../apps/api/src/balances/balances.controller.ts) — `GET /api/balances`.
- [`apps/api/src/balances/balances.service.ts`](../apps/api/src/balances/balances.service.ts) — `findForAccount`, сортировка USDT-first.
- [`apps/api/src/balances/balance.mapper.ts`](../apps/api/src/balances/balance.mapper.ts) — `toViewMap`, расчёт `valueUsdt`, fallback на `"0"`.
- [`apps/api/src/binance/binance-price.service.ts`](../apps/api/src/binance/binance-price.service.ts) — `getCurrentPrice` с per-symbol кэшем.
- [`apps/api/src/auth/cookie.ts`](../apps/api/src/auth/cookie.ts) — `STARTING_USDT`.
- [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma) — `model Balance` с `free`, `locked`, уникальный индекс `(accountId, asset)`.
- Schemas: [`packages/shared/src/schemas/views/balance.ts`](../packages/shared/src/schemas/views/balance.ts).

## Ошибки

| Кейс                                | Код | Что отдаёт                                                                       |
| ----------------------------------- | --- | -------------------------------------------------------------------------------- |
| Нет cookie                          | 200 | middleware заводит нового юзера и кладёт cookie; ответ — `{ "USDT": { … } }`     |
| Binance недоступен на `getCurrentPrice` | 200 | соответствующий `valueUsdt = "0"` + warning в лог; остальные поля корректны      |
| БД недоступна                       | 500 | стандартный NestJS-обработчик                                                    |

## Известные ограничения

- **`locked` всегда `"0"`.** В MVP нет лимитных ордеров. Поле и логика "free → locked → исполнение" нужны лимитникам и предусмотрены в схеме именно ради того, чтобы появление лимитников не потребовало миграцию баланса. Фронт должен брать `free` для расчёта доступного к расходованию **уже сейчас**, а не позже.
- **`valueUsdt = "0"` молча.** Если у актива нет пары `{asset}USDT` на Binance или Binance ответил ошибкой, фронт увидит "$0", но `total` будет правильный. На UI стоит как минимум визуально различать "ноль балансов" и "нет котировки" — в текущем фронте этого нет.
- **Последовательная валуация.** Для 1–5 активов норм, для больших портфелей — узкое место. Решается через `Promise.all` или прогрев `getAllTickers24h`.
- **`totalEquityUsdt` не возвращается.** Сумма считается на фронте (`reduce` по `valueUsdt`). Если когда-то понадобится атомарный snapshot "сколько у меня всего на момент T" — это уже задача для отдельного эндпоинта, потому что разные `valueUsdt` могут быть получены с разницей в TTL-кэша.
- **Сортировка — по `free`, не по `valueUsdt`.** Логично сортировать по стоимости в USDT, чтобы крупные позиции были сверху. Сейчас этого не делается, потому что `valueUsdt` известен только после маппинга, а сортировка — до. Если важно — пересортировать на фронте.
- **WS-апдейтов балансов нет.** После размещения ордера фронт делает invalidate и refetch. Подписка `BalanceUpdateSchema` в `@exchange/shared` есть в заготовке, но gateway её пока не публикует.
