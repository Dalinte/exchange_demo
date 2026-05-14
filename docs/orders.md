# Размещение ордеров

`POST /api/orders` — единственный write-эндпоинт MVP. Размещает рыночный ордер: получает цену с Binance, атомарно списывает один актив и зачисляет встречный, создаёт `Order` и `Trade`. Лимитные ордера возвращают `501 Not Implemented`.

## Поток

1. Запрос приходит на `POST /api/orders`. Глобальный `ZodValidationPipe` валидирует тело по `CreateOrderSchema`.
2. Контроллер смотрит на `type`. `LIMIT` — сразу `501 Not Implemented`. `MARKET` — передаём в сервис.
3. Сервис ищет `TradingPair` по `symbol`. Не нашёл или `isActive=false` — `400 Bad Request`.
4. Округляет `quantity` вниз по `quantityPrecision` пары (например, BTCUSDT — до 5 знаков). Если после округления стало меньше `minQuantity` — `400`.
5. Идёт за ценой в `BinancePriceService.getCurrentPrice` (с 1-секундным in-memory кэшем). Считает `quoteAmount = quantity × price` через `decimal.js`. Это всё **до** транзакции — внешние вызовы не должны держать БД-блокировку.
6. Открывает `prisma.$transaction` с `isolationLevel: Serializable`:
   1. **Списание**: `balance.updateMany` со встроенной проверкой `free >= spendAmount`. Если ни одной строки не задело — `400 Insufficient balance`, транзакция откатывается.
   2. **Зачисление**: `balance.upsert` встречного актива (если строки нет — создаст).
   3. **Создаёт `Order`** со `status=FILLED`, `type=MARKET`, проставляет `filledQuantity`, `averageFillPrice`, `filledAt`.
   4. **Создаёт `Trade`** на этот ордер с теми же `quantity`, `price`, `quoteAmount`.
7. Транзакция коммитится. Сервис прогоняет ордер (вместе с подгруженным `tradingPair`) через `OrderMapper.toView` — он превращает Decimal/Date в строки, подставляет `symbol` из пары и считает производный `total`. Контроллер возвращает `201` с телом `OrderView`.

## Денежная арифметика

- Все вычисления через `decimal.js` — никаких `Number` для денег.
- Количество округляется по `tradingPair.quantityPrecision` с `ROUND_DOWN`. Цена приходит от Binance как есть и не округляется.
- `quoteAmount = roundedQuantity * price` — считается из уже округлённого количества.
- Преобразование `Decimal → string` в БД через `.toFixed()` (без аргумента) — без экспоненциальной формы, которую `Prisma.Decimal` не парсит.

## Атомарность

- Размещение всё в `prisma.$transaction` с `isolationLevel: Serializable` — защита от гонки на параллельных ордерах одного аккаунта.
- Списание делается через `balance.updateMany` с `where: { free: { gte: spendAmount } }`. Если `count === 0` — баланса не хватило (или его нет), бросаем `BadRequestException`. Это единственный безопасный способ "проверить и списать" в одной операции — `update` принимает только unique-ключи в `where`.
- Зачисление — `upsert` (баланс встречного актива может ещё не существовать).

## Цена с Binance

[`BinancePriceService`](../apps/api/src/binance/binance-price.service.ts) — REST `GET /api/v3/ticker/price?symbol=...` с in-memory кэшем 1 секунда (`Map<symbol, { price, fetchedAt }>`). Защищает от спама при множественных запросах подряд. На любой ошибке (HTTP, таймаут 5 с, невалидный ответ) — `503 Service Unavailable`.

## Где это лежит

- [`apps/api/src/orders/orders.controller.ts`](../apps/api/src/orders/orders.controller.ts) — `POST /api/orders`, ветка LIMIT → 501.
- [`apps/api/src/orders/orders.service.ts`](../apps/api/src/orders/orders.service.ts) — `placeMarketOrder`.
- [`apps/api/src/orders/order.mapper.ts`](../apps/api/src/orders/order.mapper.ts) — Entity → `OrderView` (включая расчёт `total`).
- [`apps/api/src/binance/binance-price.service.ts`](../apps/api/src/binance/binance-price.service.ts) — цена с Binance + кэш.
- [`apps/api/src/orders/orders.service.spec.ts`](../apps/api/src/orders/orders.service.spec.ts) — unit-тесты на BUY/SELL, недостаток средств, невалидную/неактивную пару, округление вниз.
- Schemas: [`packages/shared/src/schemas/dto/create-order.ts`](../packages/shared/src/schemas/dto/create-order.ts) (`CreateOrderSchema` — что фронт шлёт), [`packages/shared/src/schemas/views/order.ts`](../packages/shared/src/schemas/views/order.ts) (`OrderViewSchema` — что API отдаёт).

## Ошибки

| Кейс                                  | Код | Сообщение                            |
| ------------------------------------- | --- | ------------------------------------ |
| Невалидное тело (Zod не пропустил)    | 400 | детализация валидации                |
| Пара не найдена / `isActive=false`    | 400 | `Trading pair not found or inactive` |
| `quantity` после округления < min     | 400 | `Quantity below minimum (...)`       |
| Недостаточно `free` на нужном балансе | 400 | `Insufficient balance`               |
| Binance недоступен / таймаут          | 503 | `Price feed unavailable`             |
| `type=LIMIT`                          | 501 | `LIMIT orders are not supported yet` |

## Известные ограничения

- **Только MARKET.** Лимитные ордера не реализованы — отдельная задача (нужен фоновый matcher по цене и блокировка средств в `Balance.locked`).
- **Без комиссии.** `fee = 0`, `feeAsset = "USDT"`. Поле есть в схеме на будущее.
- **Без отмены.** `CANCELED`-статус существует в схеме, но эндпоинта пока нет.
- **Без retry на сериализационный конфликт.** При очень редком конфликте Postgres выкинет транзакцию, клиент получит 500 — повторный submit от пользователя сработает. Автоматический ретрай — отдельная задача.
- **Идентичный `clientOrderId`-ключ не передаётся.** Уникальный индекс `(accountId, clientOrderId)` в схеме есть на будущее, чтобы клиент мог защититься от двойного submit.
- **`Balance.locked` не используется для MARKET.** Поле и логика "free → locked → исполнение" нужны лимитникам.
