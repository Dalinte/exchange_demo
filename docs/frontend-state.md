# Состояние на фронте

Как фронт хранит данные и держит их синхронизированными с API. Слоёв три, у каждого своя ответственность:

| Слой           | Что хранит                                                   | Кто пишет                                      |
| -------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| TanStack Query | Server state (всё, что приходит по REST: балансы, ордера, тикеры, свечи) | `useQuery` хуки, мутации, WS-апдейтеры       |
| Zustand        | Локальный UI state (`symbol`, `ws.state`, toasts)            | компоненты + sync-компоненты + WS-клиент       |
| `useState`     | Эфемерное состояние одного компонента (`timeframe`, `presetPrice`, открытость модалок) | компоненты-владельцы                           |

React Context **не используется** — он даёт каскадные ре-рендеры по поддереву и плохо селективен (зафиксировано в [CLAUDE.md](../CLAUDE.md#состояние-и-data-layer)).

## TanStack Query — серверное состояние

Единственный QueryClient создаётся в [`shared/providers/query-provider.tsx`](../apps/web/src/shared/providers/query-provider.tsx) и оборачивает всё приложение в `app/layout.tsx`. Дефолты на все запросы:

```ts
{
  staleTime: 30_000,            // 30 секунд считаем данные свежими
  gcTime: 5 * 60_000,           // 5 минут держим в кэше после последнего observer'а
  retry: 1,                     // один retry на любую ошибку (включая 4xx)
  refetchOnWindowFocus: false,  // фокус таба не дёргает refetch — слишком шумно
}
```

`staleTime: 30s` — компромисс: балансы/тикеры обновляются через мутации и WS-апдейтеры, фоновый refetch при перемонтировании компонентов не критичен, но запас на случай "что-то отвалилось" нужен.

### Query keys

Все ключи централизованы в [`shared/api/query-keys.ts`](../apps/web/src/shared/api/query-keys.ts) как `queryKeys.<resource>.list(params?)`. Это даёт два бонуса:

1. Никогда нет мисматча между ключом в `useQuery` и ключом в `invalidateQueries` / `setQueryData` — все ходят через одну и ту же функцию.
2. Можно инвалидировать всю группу одним вызовом: `invalidateQueries({ queryKey: queryKeys.balances.all })` уберёт и `['balances', 'list']`, и любые будущие подключи.

Параметризованные ключи (`orders.list({ status, symbol, limit })`) включают параметры в ключ — разные комбинации фильтров живут как отдельные кэш-записи.

### Хуки `useXxx`

Тонкие обёртки над `useQuery` лежат в [`shared/api/hooks/`](../apps/web/src/shared/api/hooks/). Каждая зовёт соответствующий API-клиент из `shared/api/<resource>.ts`, который делает `apiFetch` + `XxxSchema.parse(data)` — Zod-валидация на приёме, как и на сервере. Это защищает фронт от расхождения с View-схемой (см. [api-mappers.md](api-mappers.md)).

Особый случай — [`useOrderHistory`](../apps/web/src/shared/api/hooks/use-orders.ts): дёргает **два** запроса (`FILLED` и `CANCELED`), сливает локально и сортирует по `createdAt desc`. Это потому что API сейчас принимает один `status` (см. [history.md](history.md)) — фильтрация "не PENDING" на сервере не поддерживается.

### Мутации и оптимистичные апдейты

[`useCreateOrder`](../apps/web/src/shared/api/hooks/mutations/use-create-order.ts) — единственная сложная мутация в проекте. Паттерн TanStack Query "optimistic update with rollback":

1. `onMutate`:
   - `cancelQueries({ queryKey: ['balances', 'list'] })` — отменяет любые in-flight рефетчи балансов, чтобы они не перезаписали оптимистичный апдейт.
   - Снимает snapshot текущих балансов из кэша в `context.previousBalances`.
   - Берёт цену из текущего `tickers` кэша (`queryClient.getQueryData(queryKeys.tickers.list())`) — реализация оптимистичного списания без round-trip за ценой.
   - Зовёт `applyOptimisticMarketOrder(balances, dto, ticker)` — он считает дельту в `decimal.js` и возвращает новый `BalanceMap` (см. [`shared/lib/optimistic-balance.ts`](../apps/web/src/shared/lib/optimistic-balance.ts)).
   - Кладёт результат в кэш `queryKeys.balances.list()`.
2. `onError`: если сервер ответил ошибкой (`Insufficient balance`, `Price feed unavailable`, etc.) — откатывает кэш на `context.previousBalances`.
3. `onSettled` (в любом исходе): инвалидирует `balances`, `orders`, `trades`. Сервер — источник истины, оптимистика — только для мгновенного отклика UI.

Цена для оптимистики берётся из `tickers`-кэша, **а не из формы**. Если тикеров в кэше нет — оптимистика просто не применяется, мутация остаётся обычной (мы не угадываем).

[`useResetAccount`](../apps/web/src/shared/api/hooks/mutations/use-reset-account.ts) — без оптимистики: на `onSuccess` зовёт `invalidateQueries()` без аргументов, что инвалидирует **весь** кэш. После reset балансы, ордера и сделки всё равно почти все пустые, дешевле всё перетянуть.

### Что НЕ хранится в Query Cache

- `WebSocket.readyState` и поля типа "идёт ли реконнект". Это локальное UI-состояние, его место в Zustand.
- Выбранный таймфрейм графика — он не пришёл с API, это локальный preference.
- Открытость модалок и preset цены — `useState` в компоненте-владельце.

## Zustand — клиентское состояние

Три стора, по одному файлу на каждый в [`shared/stores/`](../apps/web/src/shared/stores/). Все они "плоские" — без middleware, без persist, без selectors-хелперов. Если стор начнёт распухать, рефакторить в slice-pattern.

### `market-store` — выбранный символ

```ts
useMarketStore: { symbol: string; setSymbol: (s: string) => void }
```

Дефолт `"BTCUSDT"`. Источник правды — URL (`/trade/[symbol]`), но фронт зачитывает его в стор один раз:

- В серверном [`app/trade/[symbol]/page.tsx`](../apps/web/src/app/trade/[symbol]/page.tsx) символ из params передаётся в клиентский `<TradeTerminal initialSymbol={...} />`.
- `TradeTerminal` синхронизирует стор лениво через `useState(() => { ... })` — выполняется один раз на маунт **до** первого render-цикла (классический трюк, чтобы избежать первого render'а со старым значением).
- [`SymbolSync`](../apps/web/src/shared/stores/SymbolSync.tsx) — отдельный sync-компонент рядом со стором, читает `useParams()` и в `useEffect` пушит изменения в стор. Это страхует кейс, когда URL меняется без размонтирования `TradeTerminal` (клиентская навигация между парами).

Принцип: **читать URL → писать в стор в ОДНОМ месте**. Каждый потребитель только подписан на стор, никто не дёргает `useParams()` сам (зафиксировано в [CLAUDE.md](../CLAUDE.md#состояние-и-data-layer)).

### `ws-store` — состояние WebSocket-соединения

```ts
useWsStore: { state: 'connecting' | 'open' | 'closed' | 'reconnecting'; setConnectionState: ... }
```

Пишет в него **только** WS-клиент (`shared/ws/client.ts`) — из обработчиков `onopen`, `onclose` и из `scheduleReconnect`. Делает это императивно через `useWsStore.getState().setConnectionState(...)`, потому что WS-клиент — singleton вне React-дерева.

Читают — компоненты вроде `StatusFooter` через хук [`useConnectionState`](../apps/web/src/shared/ws/use-connection-state.ts).

### `toast-store` — нотификации

```ts
useToastStore: { toasts: Toast[]; push(toast); dismiss(id) }
```

Особенности:

- `push` сам генерирует `id` (через `crypto.randomUUID()` с фолбэком на `Math.random` — на случай очень старых браузеров без `crypto.randomUUID`).
- Авто-dismiss через 4 секунды. Таймеры живут в `Map<id, timeoutHandle>` **вне** стора — Zustand не любит non-serializable значения. `dismiss` чистит таймер перед удалением, чтобы избежать "dismiss × 2".
- Удобный хук [`usePushToast`](../apps/web/src/shared/stores/toast-store.ts) — селектор только на `push`, чтобы компоненты, которые только пушат тосты, не ре-рендерились при изменении массива.

## `useState` — эфемерное

В [`TradeTerminal`](../apps/web/src/features/trade-terminal/TradeTerminal.tsx) живут:

- `timeframe` — текущий интервал графика (`'15m'`), прокидывается в `CandleChart` и обратно через колбэк.
- `presetPrice` — цена, которую `OrderBook` пробрасывает в `OrderForm` при клике на строку стакана. После использования сбрасывается в `null`.
- `resetOpen` — открыта ли модалка reset.

Это правильный уровень: тут нет смысла тащить в Zustand — все потребители в одном поддереве. Если когда-то понадобится открывать модалку из другого места (например, из меню в `TopBar` без props-drilling) — тогда вынесем в стор.

## WebSocket — отдельный канал данных

WS-клиент — singleton, инициализируется лениво при первом `getWsClient()` (только в браузере, на SSR падает `Error("WS client is browser-only")`).

### Зачем оба слоя — REST и WS

REST даёт snapshot (история свечей, текущие балансы), WS — инкрементальные апдейты. Совмещаются через **запись WS-апдейтов в тот же Query Cache**, который заполнил REST.

### Поток для свечей

1. `<CandleChart symbol interval />` зовёт `useKlines(symbol, interval)` — REST `/api/klines` тянет 200 последних свечей в `queryKeys.klines.list(symbol, interval)`.
2. Тот же компонент зовёт `useKlineStream(symbol, interval)`:
   - Подписывается на канал `kline:SYMBOL:INTERVAL` через WS-клиент.
   - На каждое сообщение `kline` патчит `queryClient.setQueryData(['klines', 'list', symbol, interval], (old) => ...)`:
     - Если `update.openTime === last.openTime` → мутирует последнюю свечу (open/high/low/close/volume).
     - Иначе → добавляет новую свечу в конец, обрезает массив до `MAX_CANDLES = 500`.
3. `CandleChart` подписан на тот же query key через `useKlines` → Lightweight Charts получает свежий массив и перерисовывает.

То же самое для тикеров: [`useTickerStream`](../apps/web/src/shared/ws/use-ticker-stream.ts) патчит `queryKeys.tickers.list()`, обновляя `lastPrice`/`priceChangePercent24h`/`volume24h` для текущего символа в массиве.

### Реконнект

Реализован в [`shared/ws/client.ts`](../apps/web/src/shared/ws/client.ts):

- На `onclose` ставит state `closed`, затем `scheduleReconnect` → state `reconnecting`.
- Backoff `1s → 2s → 4s → 8s → 16s → 30s` (cap).
- На успешный `onopen` — отправляет batched `subscribe` со всем `activeSubscriptions` (хранится в Set, переживает разрывы соединения).
- `reconnectAttempts` сбрасывается на `onopen`, иначе после длительного простоя backoff "вспомнит" предыдущий счётчик.

Клиенту-фиче (`useKlineStream`) не нужно ничего знать про реконнект — он подписан через `client.subscribe(channels)`, который сам отправит `subscribe` после re-open.

### Идемпотентность подписок

`subscribe(channels)` фильтрует канал, если он уже в `activeSubscriptions`. Это важно, потому что несколько компонентов могут запросить один канал параллельно (например, два экземпляра `CandleChart` или ticker-widget + chart на один символ). Cleanup `useEffect` шлёт `unsubscribe`, и пока хоть один подписчик жив на этом канале на бекенде — gateway не разорвёт стрим Binance (см. [realtime.md](realtime.md)).

⚠ Текущая проблема: `subscribe`/`unsubscribe` на клиенте **не считают подписчиков**. Если два компонента подписались на `kline:BTCUSDT:1m`, а потом один размонтировался — клиент отправит `unsubscribe`, и второй потеряет апдейты. На практике пока не стреляет, потому что каждый стрим уникальный (`symbol + interval` для свечей, `symbol` для тикеров), и одновременно два компонента запрашивают один и тот же канал редко. Но при появлении мультипанели надо будет добавить refcount на стороне клиента.

## Связки между слоями

### URL → Zustand → потребители

```
/trade/BTCUSDT  ──► page.tsx (server)  ──► TradeTerminal initialSymbol
                                                  │
                                                  ▼
                                            useMarketStore.setState   ◄── SymbolSync (useParams)
                                                  │
                                                  ▼
                                        компоненты (OrderForm, CandleChart, …)
```

### Mutation → Query Cache + Invalidation

```
OrderForm submit → useCreateOrder.mutate(dto)
       ├─ onMutate: snapshot + optimistic patch ['balances','list']
       ├─ POST /api/orders
       ├─ onError: rollback ['balances','list']
       └─ onSettled: invalidate ['balances'], ['orders'], ['trades']
```

### WS → Query Cache

```
WS message "kline" → useKlineStream handler → queryClient.setQueryData(['klines','list', symbol, interval], ...)
                                                                   │
                                                                   ▼
                                                          CandleChart перерисовывается
```

## Где это лежит

- [`apps/web/src/shared/providers/query-provider.tsx`](../apps/web/src/shared/providers/query-provider.tsx) — единственный `QueryClient` с дефолтами.
- [`apps/web/src/shared/api/`](../apps/web/src/shared/api/) — тонкие API-клиенты (`apiFetch` + Zod `.parse`).
- [`apps/web/src/shared/api/hooks/`](../apps/web/src/shared/api/hooks/) — `useXxx` (queries) и `mutations/useXxx` (мутации).
- [`apps/web/src/shared/api/query-keys.ts`](../apps/web/src/shared/api/query-keys.ts) — централизованные ключи.
- [`apps/web/src/shared/stores/`](../apps/web/src/shared/stores/) — `market-store`, `ws-store`, `toast-store`, `SymbolSync.tsx`.
- [`apps/web/src/shared/ws/client.ts`](../apps/web/src/shared/ws/client.ts) — singleton WS-клиент с реконнектом.
- [`apps/web/src/shared/ws/use-kline-stream.ts`](../apps/web/src/shared/ws/use-kline-stream.ts), [`use-ticker-stream.ts`](../apps/web/src/shared/ws/use-ticker-stream.ts) — хуки, патчащие Query Cache.
- [`apps/web/src/shared/lib/optimistic-balance.ts`](../apps/web/src/shared/lib/optimistic-balance.ts) — расчёт оптимистичной дельты.

## Известные ограничения

- **Подписки в WS-клиенте не считают подписчиков.** Если два компонента запросят один канал, второй потеряет апдейты после размонтирования первого. Не стреляет сейчас — каждая комбинация канала используется одним местом. Решается refcount-Map в клиенте.
- **Цена для оптимистики — из `tickers`-кэша.** Если тикеры ещё не подгружены (например, юзер нажал submit за первые миллисекунды после загрузки страницы), оптимистики не будет — мутация просто пройдёт обычным путём. Сознательное упрощение: лучше не угадывать, чем угадать неправильно.
- **`useOrderHistory` дёргает два запроса.** Кейс "не PENDING" не поддерживается API (см. [history.md](history.md)). Можно расширить серверный фильтр до `status: 'IN' [...]`, чтобы убрать клиентскую склейку.
- **`refetchOnWindowFocus: false`.** Сознательно — на бирже постоянные переключения вкладок раздражают рефетчем. Минус: после долгого простоя данные могут быть устаревшими, пока WS не пришлёт апдейт. Покрывается `staleTime: 30s` для большинства запросов.
- **`useResetAccount` инвалидирует весь кэш.** Безопасно (после reset почти всё пустое), но если кэш разрастётся — это станет дороже. Тогда — точечная инвалидация только релевантных ключей.
- **WS-канала для собственных ордеров/балансов нет.** После мутаций фронт делает REST refetch через `invalidateQueries`. `OrderUpdateSchema` и `BalanceUpdateSchema` в `@exchange/shared` существуют — gateway пока их не публикует (см. [realtime.md](realtime.md)).
- **WS-апдейтер в `useKlineStream` теряет `quoteVolume` и `trades` для новых свечей.** Ставит их в `'0'` и `0` соответственно — серверный `kline`-payload не содержит этих полей, они приходят только из REST `/klines`. При обновлении последней свечи поля не трогаются, остаются от первоначального REST-снапшота.
- **Toast-таймеры — глобальный `Map`.** При HMR в дев-режиме модуль перезагрузится, но `Map` пересоздастся пустой, а старые таймеры останутся висеть в памяти и дёрнут уже несуществующий `dismiss`. На проде неактуально.
