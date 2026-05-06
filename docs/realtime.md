# Realtime market data (WebSocket)

Real-time свечи и тикеры от Binance к фронт-клиентам через NestJS WebSocket gateway. Цель: один upstream к Binance на тип стрима с фанаутом на N клиентов; фронт никогда не подключается к Binance напрямую.

## Поток

1. API при старте открывает **одно** соединение к `wss://stream.binance.com:9443/stream` (combined streams) — [`BinanceStreamService`](../apps/api/src/binance/binance-stream.service.ts).
2. Клиент подключается к `ws://localhost:3001/ws` — [`ExchangeGateway`](../apps/api/src/exchange/exchange.gateway.ts).
3. Клиент шлёт `{ "type": "subscribe", "channels": ["kline:BTCUSDT:1m", "ticker:BTCUSDT"] }`.
4. Gateway валидирует сообщение через [`WSClientMessageSchema`](../packages/shared/src/schemas/ws-client.ts), проверяет, что символ есть в активных торговых парах.
5. Для каждого нового канала gateway вызывает `BinanceStreamService.subscribe(stream, cb)`. Если стрим у Binance ещё не подписан — отправляет `{ method: 'SUBSCRIBE', params: [stream], id }`. Иначе просто добавляет колбэк в существующий Set.
6. Когда Binance шлёт обновление — все колбэки на этом стриме получают `data`. Gateway конвертирует payload в `KlineUpdate` / `TickerUpdate`, прогоняет через `WSMessageSchema.parse` (защитный контракт) и отправляет клиенту.
7. При отписке / отключении клиента gateway удаляет его колбэк. Когда последний колбэк на стриме исчезает — отправляет `UNSUBSCRIBE` Binance'у.

## Формат каналов

- `kline:{SYMBOL}:{INTERVAL}` — свечи. Допустимые интервалы: `1m`, `5m`, `15m`, `1h`, `4h`, `1d`. Symbol case-insensitive, нормализуется в верхний регистр.
- `ticker:{SYMBOL}` — 24h-тикер с `lastPrice`, `priceChangePercent`, `volume`.

## Реконнект

`BinanceStreamService` при `close` / `error` пересоздаёт соединение с экспоненциальной задержкой `1s → 2s → 4s → 8s → 16s → 30s` (cap), бесконечные попытки. На `open` — батчем re-subscribe ко всем активным стримам. Клиенты ничего не замечают — их соединение с API не рвётся.

## Лимиты

- **20 каналов на одного клиента.** 21-я подписка → `{ type: 'error', message: 'Subscription limit reached' }`.
- **10 параллельных соединений с одного IP.** 11-е соединение закрывается с code `4029`.
- **Только символы из активных `TradingPair`.** Подписка на неизвестный символ → `{ type: 'error', message: 'Unknown symbol: ...' }`. Список загружается один раз на старте gateway.
- **Heartbeat:** `client.ping()` каждые 30 секунд. Если клиент не отвечает `pong` дольше 65 секунд — `terminate()`.

## Формат сообщений от сервера

Дискриминированное объединение [`WSMessageSchema`](../packages/shared/src/schemas/ws-messages.ts):

- `{ type: 'kline', symbol, interval, data: { open, high, low, close, volume, openTime, closeTime } }` — все цены/объёмы как `DecimalString`.
- `{ type: 'ticker', symbol, lastPrice, priceChangePercent24h, volume24h }`.
- `{ type: 'error', message }` — на любую невалидную команду от клиента.

## Где это лежит

- [`apps/api/src/binance/binance-stream.service.ts`](../apps/api/src/binance/binance-stream.service.ts) — singleton upstream, реконнект, мультиплексирование колбэков.
- [`apps/api/src/exchange/exchange.gateway.ts`](../apps/api/src/exchange/exchange.gateway.ts) — `/ws`, подписки, лимиты, heartbeat.
- [`apps/api/src/exchange/channels.ts`](../apps/api/src/exchange/channels.ts) — `parseChannel`, `channelToBinanceStream`, конверсия Binance-payload → `WSMessage`.
- [`packages/shared/src/schemas/ws-client.ts`](../packages/shared/src/schemas/ws-client.ts) — входящие сообщения от клиента.
- [`packages/shared/src/schemas/ws-messages.ts`](../packages/shared/src/schemas/ws-messages.ts) — исходящие сообщения от сервера.

## Известные ограничения

- **Без аутентификации.** Любой клиент может подписаться на market-данные. Для приватных стримов (свои ордера, балансы) понадобится auth — отдельная задача.
- **Order book не реализован.** Канал `depth:SYMBOL` в плане, но пока не поддерживается.
- **Активные символы загружаются один раз.** Если в БД добавили новую пару через `db:seed` — нужно перезапустить API, чтобы gateway её принял.
- **Нет push'а собственных ордеров/балансов.** `OrderUpdateSchema` и `BalanceUpdateSchema` существуют, но gateway пока их не шлёт.
