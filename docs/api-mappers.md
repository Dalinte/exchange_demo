# Entity → Mapper → View

Prisma-сущности не уходят на провод напрямую. Между ORM-моделью и JSON-ответом стоит **слой мапперов** — по одному рядом с сервисом каждой фичи (`apps/api/src/<feature>/<feature>.mapper.ts`). Он отвечает за:

1. Сериализацию `Prisma.Decimal → string` и `Date → ISO`.
2. Скрытие БД-полей, которые фронту не нужны (`tradingPairId` → `symbol`, внутренние `accountId`/`updatedAt`/`isActive`, и т.п.).
3. Добавление **производных** полей, которые фронту удобно получить готовыми: `total` ордера, `valueUsdt` баланса, 24h-статистика по паре.

В результате `@exchange/shared/schemas/views/*` описывают то, что **реально приходит на фронт**, а не структуру БД.

## Поток

```
Prisma entity (Decimal, Date, FK-id) ──► Mapper ──► View (string, ISO, symbol, derived fields)
                                                ▲
                                                └─ опц. внешние данные (Binance ticker24h)
```

- Сервис делает Prisma-запрос с нужными `include` (например, `include: { tradingPair: true }`) и передаёт результат в `XxxMapper.toView(entity)`.
- Маппер возвращает уже готовый объект, валидный по соответствующей view-схеме.
- Контроллер просто `return` — без дополнительных преобразований.

## Кто за что отвечает

| Маппер              | Вход                                                       | Выход (View)                                | Производные поля                                                                                          |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `TradingPairMapper` | `TradingPair`                                              | `TradingPair`                               | —                                                                                                         |
| `TradingPairMapper` | `TradingPair` + `BinanceTicker24h`                         | `TradingPairWithStats`                      | `lastPrice`, `priceChangePercent24h`, `highPrice24h`, `lowPrice24h`, `volume24h`, `quoteVolume24h`        |
| `BalanceMapper`     | `Balance[]`                                                | `BalanceMap` (`{ [asset]: BalanceItem }`)   | `total = free + locked`, `valueUsdt = total × price` (через `BinancePriceService.getCurrentPrice`)        |
| `OrderMapper`       | `Order & { tradingPair: TradingPair }`                     | `OrderView`                                 | `symbol` (из пары), `total` = `filledQuantity × averageFillPrice` (FILLED/PARTIALLY) или `quantity × price` (PENDING LIMIT), иначе `"0"` |
| `TradeMapper`       | `Trade & { tradingPair: TradingPair }`                     | `TradeView`                                 | `symbol` (из пары)                                                                                        |

Каждый маппер живёт рядом со своим сервисом и регистрируется в `providers` соответствующего фича-модуля — никаких глобальных `MappersModule` нет. Cross-feature импортов сейчас тоже нет (каждый маппер используется только своим сервисом). Если когда-нибудь понадобится — нужно добавить маппер в `exports` модуля-владельца.

## Стоимость и кэширование

- `BalanceMapper` дёргает `BinancePriceService.getCurrentPrice` для каждого ненулевого актива, отличного от USDT. У `BinancePriceService` есть in-memory кэш на 1 секунду — это защищает от каскада запросов.
- `TradingPairsService.findActiveWithStats` за раз тянет `GET /api/v3/ticker/24hr` (без `symbol`) — один HTTP-запрос на всю выдачу. Кэш на 5 секунд внутри `BinancePriceService.getAllTickers24h`.
- Если Binance недоступен / ассет не торгуется к USDT — `valueUsdt` ставится в `"0"` и пишется warning в лог. Ответ всё равно отдаётся.

## Эндпоинты, использующие мапперы

| Эндпоинт                  | View                       | Маппер                  |
| ------------------------- | -------------------------- | ----------------------- |
| `GET /api/balances`       | `BalanceMap`               | `BalanceMapper`         |
| `GET /api/trading-pairs`  | `TradingPair[]`            | `TradingPairMapper`     |
| `GET /api/tickers`        | `TradingPairWithStats[]`   | `TradingPairMapper` + `BinancePriceService.getAllTickers24h` |
| `GET /api/orders`         | `OrderView[]`              | `OrderMapper`           |
| `POST /api/orders`        | `OrderView`                | `OrderMapper`           |
| `GET /api/trades`         | `TradeView[]`              | `TradeMapper`           |

`POST /api/account/reset` мапперов не использует — возвращает `204 No Content` и обновлённую cookie; новые балансы фронт подтягивает следующим `GET /api/balances`.

## Где это лежит

- [`apps/api/src/trading-pairs/trading-pair.mapper.ts`](../apps/api/src/trading-pairs/trading-pair.mapper.ts)
- [`apps/api/src/balances/balance.mapper.ts`](../apps/api/src/balances/balance.mapper.ts)
- [`apps/api/src/orders/order.mapper.ts`](../apps/api/src/orders/order.mapper.ts)
- [`apps/api/src/trades/trade.mapper.ts`](../apps/api/src/trades/trade.mapper.ts)
- [`apps/api/src/binance/binance-price.service.ts`](../apps/api/src/binance/binance-price.service.ts) — `getCurrentPrice`, `getTicker24h`, `getAllTickers24h` с кэшами.
- [`packages/shared/src/schemas/views/`](../packages/shared/src/schemas/views/) — Zod-схемы View, на которые мапперы должны соответствовать.

## Известные ограничения

- **Output-валидация не включена.** Если маппер случайно отдал поле, не совпадающее с View-схемой, рантайм этого не поймает (то же самое касается всех ответов — см. [api-schema.md](api-schema.md)). Помогает TypeScript на этапе компиляции.
- **`valueUsdt` молча равен `"0"` при недоступности котировки.** Это сознательное решение: не валить весь `/balances`, если у одного экзотического актива пропала пара к USDT. В логах будет warning.
- **`BalanceMap` — `Record<asset, BalanceItem>`, а не массив.** Порядок ключей соответствует порядку из БД-запроса (USDT первым, дальше по убыванию `free`) — JS сохраняет insertion order для string-ключей, но рассчитывать на это в логике фронта не стоит. Если нужна стабильная сортировка для UI — сортировать на месте.
- **`BalanceMapper` асинхронный (остальные — синхронные).** Из-за обращения к ценам. Внутри он обходит балансы последовательно — для типичного аккаунта с 1–5 активами это OK, но при батчевых сценариях (например, валюация по большому списку аккаунтов) стоит распараллелить через `Promise.all` или сначала прогреть кэш `BinancePriceService`.
- **`totalEquityUsdt` считается на фронте.** Сервер отдаёт только `valueUsdt` по каждому активу (`BalanceMap`); сумму фронт собирает сам, например `Object.values(balances).reduce((sum, b) => sum.plus(b.valueUsdt), new Decimal(0))`.
