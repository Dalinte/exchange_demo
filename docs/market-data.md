# Market data (REST)

Метаданные торговых пар и историческая рыночная информация, которые фронт берёт **до** того, как поднимется WebSocket. Источник — комбинация локальной БД (список пар) и Binance REST (24h-статистика и свечи). Real-time апдейты — отдельная история, см. [realtime.md](realtime.md).

## Эндпоинты

| Метод | Путь                 | Что отдаёт                                           | Источник                                              |
| ----- | -------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| `GET` | `/api/trading-pairs` | `TradingPair[]` — статичные метаданные активных пар  | Локальная БД (Prisma)                                 |
| `GET` | `/api/tickers`       | `TradingPairWithStats[]` — те же пары + 24h-статы    | БД + Binance `GET /api/v3/ticker/24hr` (snapshot all) |
| `GET` | `/api/klines`        | `Kline[]` — свечи (open/high/low/close/volume + время) | Прокси к Binance `GET /api/v3/klines`                 |

Все три — публичные, не требуют cookie, проходят глобальный rate limit `@nestjs/throttler` (100/мин на IP).

## Зачем два эндпоинта на пары

`/trading-pairs` и `/tickers` отдают пересекающиеся данные, но решают разные задачи:

- **`/trading-pairs`** — дешёвый, без сетевых вызовов наружу. Возвращает только то, что нужно для размещения ордера: `symbol`, `baseAsset`, `quoteAsset`, `pricePrecision`, `quantityPrecision`, `minQuantity`. Подходит для форм, селекторов символов, валидации на стороне фронта.
- **`/tickers`** — для главного экрана / списка рынков, где нужен `lastPrice` и 24h-статистика. Делает один HTTP-запрос к Binance за **снапшот всех символов** и матчит его с локальным списком активных пар. Пары, у которых Binance не вернул тикер, **пропускаются** (с warning в лог).

Если фронту нужен и список пар, и цены — берёт `/tickers` и из его ответа достаёт остальное.

## Поток `/tickers`

1. Запрос приходит на `GET /api/tickers`.
2. `TradingPairsService.findActiveWithStats`:
   1. Тянет из БД все `TradingPair` с `isActive=true`, упорядоченные по `symbol`.
   2. Зовёт `BinancePriceService.getAllTickers24h()` — внутри один `GET /api/v3/ticker/24hr` без параметра `symbol` (возвращает массив тикеров по всем символам Binance, обычно ~2000 элементов). Кэш 5 секунд.
   3. Складывает тикеры в `Map<symbol, BinanceTicker24h>`.
   4. Для каждой пары ищет тикер в Map. Нашёл — `TradingPairMapper.toViewWithStats(pair, ticker)`. Не нашёл — `logger.warn` и пропуск.
3. Контроллер возвращает массив `TradingPairWithStats`.

`/trading-pairs` — тривиальный путь: `findMany` + `toView` (без `lastPrice` и 24h-полей), без сетевых вызовов.

## Поток `/klines`

1. Запрос приходит на `GET /api/klines?symbol=BTCUSDT&interval=1m&limit=500`.
2. `ZodValidationPipe` валидирует query по [`GetKlinesQuerySchema`](../packages/shared/src/schemas/dto/queries.ts):
   - `symbol` — обязательный, нормализуется в верхний регистр (`btcusdt` → `BTCUSDT`).
   - `interval` — один из `1m | 5m | 15m | 1h | 4h | 1d` (тот же enum, что в WS-канале `kline:`).
   - `limit` — целое, `1..1000`, default `500`. Coerce из строки (query всегда строка).
3. `BinancePriceService.getKlines` строит URL к Binance, делает `fetch` с таймаутом 5 с.
4. На `400` от Binance — извлекает `msg` из тела и пробрасывает как `BadRequestException` (например, "Invalid symbol"). На сетевых ошибках / таймауте / `5xx` — `ServiceUnavailableException`.
5. Массив пар приходит как `[[openTime, open, high, low, close, volume, closeTime, quoteVolume, trades, ...], ...]`. Каждая строка прогоняется через `KlineSchema.parse` — Zod проверяет типы и заодно служит контрактом, который ничего не пропускает мимо.

Никакого кэширования: каждый запрос → отдельный поход в Binance. Это сознательно — последняя свеча должна быть свежая на момент рендера графика, дальше график получает апдейты через WS (`kline:SYMBOL:INTERVAL`).

## Формат данных

- **`TradingPair`** — `symbol`, `baseAsset`, `quoteAsset`, `pricePrecision` (число знаков после запятой для цены), `quantityPrecision` (для количества), `minQuantity` (как `DecimalString`).
- **`TradingPairWithStats`** — `TradingPair` + `lastPrice`, `priceChangePercent24h`, `highPrice24h`, `lowPrice24h`, `volume24h`, `quoteVolume24h`. Все числовые поля — `DecimalString`, без потери точности.
- **`Kline`** — `openTime`, `closeTime` (Unix ms, целые), `open`, `high`, `low`, `close`, `volume`, `quoteVolume` (`DecimalString`), `trades` (целое). Порядок — по возрастанию `openTime` (как отдаёт Binance).

`DecimalString` — это `string`, валидируется как корректное десятичное число. На фронте парсится в `decimal.js` (или сразу в `Lightweight Charts` для свечей, который принимает `number`).

## Кэширование Binance-запросов

| Метод                          | Кэш    | TTL  | Где                                  |
| ------------------------------ | ------ | ---- | ------------------------------------ |
| `getCurrentPrice(symbol)`      | per-symbol | 1 с | `BinancePriceService.cache`          |
| `getTicker24h(symbol)`         | per-symbol | 5 с | `BinancePriceService.ticker24hCache` |
| `getAllTickers24h()`           | global | 5 с | `BinancePriceService.allTickers24hCache` |
| `getKlines(symbol, interval, limit)` | — | — | _нет_ |

5-секундный кэш на `/api/v3/ticker/24hr` важен: один запрос возвращает ~600 КБ JSON, и без кэша несколько одновременных открытий главной страницы устроили бы DDoS на собственный API. На свечи кэша нет осознанно — `/klines` зовут один раз при монтировании графика, дальше идут WS-апдейты.

## Где это лежит

- [`apps/api/src/trading-pairs/trading-pairs.controller.ts`](../apps/api/src/trading-pairs/trading-pairs.controller.ts) — `GET /api/trading-pairs`, `GET /api/tickers`.
- [`apps/api/src/trading-pairs/trading-pairs.service.ts`](../apps/api/src/trading-pairs/trading-pairs.service.ts) — `findActive`, `findActiveWithStats` (логика пропуска пар без тикера).
- [`apps/api/src/trading-pairs/trading-pair.mapper.ts`](../apps/api/src/trading-pairs/trading-pair.mapper.ts) — entity → `TradingPair` / `TradingPairWithStats`.
- [`apps/api/src/klines/klines.controller.ts`](../apps/api/src/klines/klines.controller.ts) — `GET /api/klines`.
- [`apps/api/src/binance/binance-price.service.ts`](../apps/api/src/binance/binance-price.service.ts) — `getAllTickers24h`, `getKlines` + кэши и парсинг ошибок Binance.
- Schemas: [`packages/shared/src/schemas/views/trading-pair.ts`](../packages/shared/src/schemas/views/trading-pair.ts), [`packages/shared/src/schemas/views/kline.ts`](../packages/shared/src/schemas/views/kline.ts), [`packages/shared/src/schemas/dto/queries.ts`](../packages/shared/src/schemas/dto/queries.ts) (`GetKlinesQuerySchema`).
- Сидинг пар: [`apps/api/prisma/seed.ts`](../apps/api/prisma/seed.ts) — idempotent upsert, источник правды по списку активных символов.

## Ошибки

| Кейс                                            | Эндпоинт          | Код | Сообщение                          |
| ----------------------------------------------- | ----------------- | --- | ---------------------------------- |
| Невалидный `interval` / `limit` / отсутствует `symbol` | `/klines`         | 400 | детализация валидации              |
| Binance вернул 400 (`Invalid symbol` и т. п.)   | `/klines`         | 400 | сообщение из `msg` ответа Binance  |
| Binance недоступен / таймаут / `5xx`            | `/klines`         | 503 | `Klines feed unavailable`          |
| Binance недоступен / невалидный ответ           | `/tickers`        | 503 | `Ticker24h feed unavailable`       |
| У пары нет 24h-тикера в ответе Binance          | `/tickers`        | —   | пропускается, warning в лог        |

`/trading-pairs` сетевых вызовов не делает, поэтому реалистично может упасть только на проблемах с БД (`500`).

## Известные ограничения

- **Активные пары загружаются из БД каждый запрос.** Кэша на уровне `TradingPairsService` нет — `findMany` дешёвый, но в горячих сценариях (десятки RPS на `/tickers`) разумно добавить in-memory кэш на список пар и инвалидировать его при добавлении пары в БД. Сейчас неактуально: пары меняются через `db:seed` и редкий рестарт.
- **Snapshot-логика `/tickers` молча теряет пары без тикера.** Если в БД сидирован символ, которого нет на Binance (опечатка, делистинг), эндпоинт его не вернёт — только warning в лог. Фронт об этом не узнает и пара "пропадёт" из списка рынков, пока её не уберут из БД.
- **`/klines` без кэша.** Каждое открытие графика — отдельный запрос к Binance. На свой rate limit Binance (1200 weight/min с IP) этого с большим запасом хватит, но при росте трафика стоит закэшировать минимум последнюю свечу + рассмотреть мердж с WS-апдейтами.
- **Историческая глубина свечей ограничена 1000 точками** (`limit` в `GetKlinesQuerySchema`). Это лимит Binance на один запрос. Для большей истории нужен пагинированный фетч по `startTime` / `endTime` — параметров пока нет.
- **24h-статистика приходит из REST-снапшота, не из WS.** Расхождение между `lastPrice` в `/tickers` и в `ticker:SYMBOL`-стриме до 5 секунд — это нормально (TTL кэша). Фронту лучше использовать `/tickers` для initial render и сразу подписываться на WS-апдейт.
- **Параметра фильтрации по symbol в `/tickers` нет.** Всегда возвращаются все активные пары. Если в будущем список вырастет до сотен — добавить `?symbols=BTC,ETH`.
