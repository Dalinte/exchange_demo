# История ордеров и сделок

Два read-only эндпоинта, через которые фронт берёт прошлое текущего аккаунта: размещённые ордера и фактические исполнения (сделки). Оба — приватные, требуют cookie `account_id` (см. [auth.md](auth.md)) и фильтруют выдачу строго по `accountId` из текущего пользователя.

## Эндпоинты

| Метод | Путь          | Что отдаёт         | Сортировка           |
| ----- | ------------- | ------------------ | -------------------- |
| `GET` | `/api/orders` | `OrderView[]`      | `createdAt desc`     |
| `GET` | `/api/trades` | `TradeView[]`      | `createdAt desc`     |

Оба проходят `AnonymousUserMiddleware` → `@CurrentUser()`: если cookie `account_id` нет, middleware создаёт нового пользователя с балансом 10 000 USDT и проставляет cookie. Поэтому первый вызов `/api/orders` для свежего посетителя вернёт `[]`, а не `401`.

## Ордеры vs сделки

В MVP `MARKET`-ордер всегда порождает **ровно один** `Trade` в той же транзакции (см. [orders.md](orders.md)), поэтому списки выглядят почти одинаково. Разница станет важной, когда появятся `LIMIT`-ордера:

- **`Order`** — намерение пользователя. Живёт со статусами `PENDING` → `PARTIALLY_FILLED` → `FILLED` / `CANCELED` / `REJECTED`. Один на каждый клик "Place order".
- **`Trade`** — фактическое исполнение, частичное или полное. Может быть несколько на один лимитный ордер. Содержит цену, по которой реально прошло, и `quoteAmount`.

Сейчас:

- `/api/orders` — таб "Order history" (показывает статусы, в т. ч. будущие отменённые).
- `/api/trades` — таб "Trade history" / лента сделок (показывает фактические исполнения, у каждого свой `price`).

## Параметры запроса

### `GET /api/orders`

Все опциональны. Валидируются [`GetOrdersQuerySchema`](../packages/shared/src/schemas/dto/queries.ts).

| Параметр | Тип                                                                  | Default | Описание                                                          |
| -------- | -------------------------------------------------------------------- | ------- | ----------------------------------------------------------------- |
| `status` | `PENDING \| PARTIALLY_FILLED \| FILLED \| CANCELED \| REJECTED`       | —       | Точное совпадение статуса.                                        |
| `symbol` | строка                                                               | —       | Нормализуется в верхний регистр (`btcusdt` → `BTCUSDT`).          |
| `limit`  | integer `1..200`                                                     | `50`    | Coerce из query-строки.                                           |

### `GET /api/trades`

Те же `symbol` и `limit` (без `status` — у сделок нет статуса). Схема — [`GetTradesQuerySchema`](../packages/shared/src/schemas/dto/queries.ts).

## Поток

1. Запрос приходит на `GET /api/orders` или `/api/trades` с cookie `account_id`.
2. `AnonymousUserMiddleware` находит / создаёт пользователя и кладёт `currentUser` в `req`.
3. `ZodValidationPipe` через `nestjs-zod` парсит query — `limit` coerce, `symbol` upper-case.
4. Сервис:
   1. Если `symbol` задан — резолвит его в `tradingPairId` через `tradingPair.findUnique`. **Пары нет — сразу `[]`** (без 404, чтобы фронт мог опросить произвольный символ).
   2. `findMany` по `Order` / `Trade` с `where: { accountId, ...tradingPairId, ...status }`, `include: { tradingPair: true }`, `orderBy: { createdAt: 'desc' }`, `take: limit`.
   3. Прогоняет результат через `OrderMapper.toViewList` / `TradeMapper.toViewList` (см. [api-mappers.md](api-mappers.md)).
5. Контроллер возвращает массив View.

## Формат данных

### `OrderView`

| Поле                | Тип                                                              | Примечание                                                                                                                          |
| ------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `id`                | UUID                                                             | —                                                                                                                                   |
| `symbol`            | string                                                           | Берётся из подгруженной `tradingPair`, не из БД-поля.                                                                               |
| `side`              | `BUY \| SELL`                                                    | —                                                                                                                                   |
| `type`              | `MARKET \| LIMIT`                                                | В MVP всегда `MARKET` (`LIMIT` пока `501`).                                                                                         |
| `status`            | `PENDING \| PARTIALLY_FILLED \| FILLED \| CANCELED \| REJECTED`  | Для MARKET всегда `FILLED` (либо ордер не создаётся вообще, если упала транзакция).                                                 |
| `quantity`          | `DecimalString`                                                  | Запрошенное количество (после округления по `quantityPrecision`).                                                                   |
| `filledQuantity`    | `DecimalString`                                                  | Сколько реально исполнилось.                                                                                                        |
| `price`             | `DecimalString \| null`                                          | Цена лимитного ордера, `null` для MARKET.                                                                                           |
| `averageFillPrice`  | `DecimalString \| null`                                          | Средняя цена исполнения. `null` пока ордер `PENDING`.                                                                               |
| `total`             | `DecimalString`                                                  | Производное поле (см. ниже).                                                                                                        |
| `createdAt`         | ISO 8601                                                         | —                                                                                                                                   |
| `filledAt`          | ISO 8601 \| `null`                                               | Момент перехода в `FILLED`. Для MARKET совпадает с `createdAt` с точностью до миллисекунд.                                          |

**Как считается `total`** (`OrderMapper.calculateTotal`):

- `FILLED` или `PARTIALLY_FILLED` с непустым `averageFillPrice` → `filledQuantity × averageFillPrice`. Это фактическая стоимость исполненной части.
- `LIMIT` + `PENDING` + непустой `price` → `quantity × price`. Это потенциальная стоимость, которую фронт показывает в открытых ордерах.
- Иначе (`CANCELED`/`REJECTED` без исполнения и т. п.) → `"0"`.

Фронт не должен пересчитывать `total` сам — маппер уже всё сделал.

### `TradeView`

| Поле          | Тип             | Примечание                                                                  |
| ------------- | --------------- | --------------------------------------------------------------------------- |
| `id`          | UUID            | —                                                                           |
| `orderId`     | UUID            | FK на `Order`. Сейчас всегда 1:1 с ордером, в будущем 1:N для LIMIT.        |
| `symbol`      | string          | Из `tradingPair`.                                                           |
| `side`        | `BUY \| SELL`   | Совпадает с `side` ордера.                                                  |
| `quantity`    | `DecimalString` | Сколько прошло в этом исполнении.                                           |
| `price`       | `DecimalString` | По какой цене реально прошло (для MARKET = цена с Binance на момент пласа). |
| `quoteAmount` | `DecimalString` | `quantity × price`. Уже посчитано на бэке.                                  |
| `fee`         | `DecimalString` | В MVP всегда `"0"` — комиссии не берём.                                     |
| `feeAsset`    | string          | В MVP всегда `"USDT"`. Поле есть на будущее.                                |
| `createdAt`   | ISO 8601        | —                                                                           |

## Изоляция между пользователями

Оба сервиса прибивают `where: { accountId }` — пользователь может видеть только свои ордера и сделки. `accountId` берётся из `CurrentUser` (cookie → middleware → request), не из query или body. Подмена через query невозможна: соответствующего параметра просто нет в схемах.

## Где это лежит

- [`apps/api/src/orders/orders.controller.ts`](../apps/api/src/orders/orders.controller.ts) — `GET /api/orders`.
- [`apps/api/src/orders/orders.service.ts`](../apps/api/src/orders/orders.service.ts) — `findForAccount`.
- [`apps/api/src/orders/order.mapper.ts`](../apps/api/src/orders/order.mapper.ts) — `OrderView` + расчёт `total`.
- [`apps/api/src/trades/trades.controller.ts`](../apps/api/src/trades/trades.controller.ts) — `GET /api/trades`.
- [`apps/api/src/trades/trades.service.ts`](../apps/api/src/trades/trades.service.ts) — `findForAccount`.
- [`apps/api/src/trades/trade.mapper.ts`](../apps/api/src/trades/trade.mapper.ts) — `TradeView`.
- Schemas: [`packages/shared/src/schemas/dto/queries.ts`](../packages/shared/src/schemas/dto/queries.ts) (`GetOrdersQuerySchema`, `GetTradesQuerySchema`), [`packages/shared/src/schemas/views/order.ts`](../packages/shared/src/schemas/views/order.ts), [`packages/shared/src/schemas/views/trade.ts`](../packages/shared/src/schemas/views/trade.ts).

## Ошибки

| Кейс                                  | Код | Сообщение                  |
| ------------------------------------- | --- | -------------------------- |
| Невалидный `status` / `limit` > 200   | 400 | детализация валидации Zod  |
| Неизвестный `symbol`                  | 200 | `[]` (пустой массив)       |

Сетевых вызовов наружу здесь нет — `503` от Binance невозможен.

## Известные ограничения

- **Без пагинации.** Только `limit` (max 200), нет ни offset/cursor, ни total count. Для активного трейдера через несколько дней свежие сделки начнут "выпадать" из выдачи. Когда понадобится — добавить cursor по `createdAt + id`.
- **Без диапазона дат.** Фильтра `from`/`to` нет. Сейчас это OK: история короткая, фронт берёт топ-50 и хватает. Появится — когда понадобится экран статистики за период.
- **`symbol` → пустой массив, а не 404.** Сознательно: если фронт спрашивает историю по символу, для которого у пользователя нет ни одного ордера, естественнее вернуть `[]`, а не "не найдено". Различие "пара не существует" vs "пары нет в моей истории" фронту обычно не интересно — на UI оба случая выглядят одинаково (`No orders yet`).
- **`/api/trades` не фильтруется по `orderId`.** Сейчас неактуально (1 trade на 1 order), но при появлении лимитников захочется `GET /api/trades?orderId=...` для деталки конкретного ордера. Можно добавить через расширение `GetTradesQuerySchema`.
- **`fee` всегда `"0"`.** Поле в схеме есть, но политика комиссий не определена. Когда появится — считать в той же транзакции, что и `Trade.create` (см. [orders.md](orders.md)).
- **Резолв `symbol` → `tradingPairId` делается отдельным запросом.** Один лишний SELECT, когда `symbol` задан. Можно было бы джойнить через `tradingPair: { symbol }`, но текущий вариант проще и явно отдаёт `[]` для неизвестного символа.
- **`createdAt desc` без вторичного ключа.** Если два ордера создались в одну миллисекунду, порядок не детерминирован между запросами. На практике невозможно (Postgres `timestamp(3)` + размещение одного ордера занимает десятки мс), но при пагинации по курсору это всплывёт — там нужно сортировать `(createdAt desc, id desc)`.
