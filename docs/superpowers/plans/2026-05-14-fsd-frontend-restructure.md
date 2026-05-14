# FSD Frontend Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести `apps/web` на методологию Feature-Sliced Design (FSD) без дробления существующих компонентов — переместить каждую папку-компонент в соответствующий FSD-слой, обновить импорты, обновить README.

**Architecture:** Next.js App Router (`app/`) переезжает в корень `apps/web/` чтобы не конфликтовать с FSD-слоем `src/app/`. В `src/` появляется каноническая FSD-иерархия: `app → pages → widgets → features → entities → shared`. Компоненты целиком переезжают по слоям, исходный код внутри файлов не меняется (только пути импортов). Тикеры выделены в отдельную entity, торговые пары — в отдельную (вместе с symbol-store).

**Tech Stack:** Next.js 16 (App Router, src-папка отключена), React 19, TypeScript strict, FSD layout, существующие npm-скрипты (`npm run dev:web`, `npm run lint --workspace=web`).

---

## Целевая структура

```
apps/web/
├── app/                              # Next.js App Router (переехал из src/app/)
│   ├── favicon.ico
│   ├── layout.tsx                    # импортирует @/app/providers и @/app/styles/globals.css
│   ├── page.tsx                      # redirect → /trade/BTCUSDT
│   └── trade/[symbol]/page.tsx       # рендерит TradeTerminal из @/pages/trade
└── src/
    ├── app/                          # FSD app: провайдеры + глобальные стили
    │   ├── providers/
    │   │   ├── index.ts
    │   │   └── query-provider.tsx
    │   └── styles/
    │       └── globals.css
    ├── pages/                        # FSD pages
    │   └── trade/
    │       ├── index.ts
    │       └── ui/
    │           └── TradeTerminal.tsx
    ├── widgets/                      # композиции UI
    │   ├── top-bar/
    │   │   ├── index.ts
    │   │   └── ui/TopBar.tsx
    │   ├── candle-chart/
    │   │   ├── index.ts
    │   │   ├── model/
    │   │   │   └── timeframes.ts
    │   │   └── ui/CandleChart.tsx
    │   ├── order-book/
    │   │   ├── index.ts
    │   │   ├── lib/
    │   │   │   ├── generate-mock-book.ts   (был features/trade-terminal/mocks.ts)
    │   │   │   └── types.ts                (был features/trade-terminal/types.ts)
    │   │   └── ui/OrderBook.tsx
    │   ├── order-form/
    │   │   ├── index.ts
    │   │   └── ui/OrderForm.tsx
    │   ├── bottom-tabs/
    │   │   ├── index.ts
    │   │   └── ui/BottomTabs.tsx
    │   └── status-footer/
    │       ├── index.ts
    │       └── ui/StatusFooter.tsx
    ├── features/                     # пользовательские действия (мутации)
    │   ├── reset-account/
    │   │   ├── index.ts
    │   │   ├── api/
    │   │   │   ├── reset-account.ts        (был shared/api/account.ts)
    │   │   │   └── use-reset-account.ts
    │   │   └── ui/ResetModal.tsx
    │   ├── create-order/
    │   │   ├── index.ts
    │   │   ├── api/
    │   │   │   └── use-create-order.ts
    │   │   └── lib/
    │   │       └── optimistic-balance.ts
    │   └── cancel-order/
    │       ├── index.ts
    │       └── api/
    │           └── use-cancel-order.ts
    ├── entities/                     # бизнес-сущности
    │   ├── balance/
    │   │   ├── index.ts
    │   │   ├── api/
    │   │   │   ├── balances.ts             (был shared/api/balances.ts)
    │   │   │   └── use-balances.ts
    │   │   └── lib/
    │   │       └── portfolio.ts            (был shared/lib/portfolio.ts)
    │   ├── order/
    │   │   ├── index.ts
    │   │   └── api/
    │   │       ├── orders.ts               (был shared/api/orders.ts)
    │   │       └── use-orders.ts
    │   ├── trade/
    │   │   ├── index.ts
    │   │   └── api/
    │   │       ├── trades.ts               (был shared/api/trades.ts)
    │   │       └── use-trades.ts
    │   ├── trading-pair/
    │   │   ├── index.ts
    │   │   ├── api/
    │   │   │   ├── trading-pairs.ts        (только getTradingPairs из shared/api/trading-pairs.ts)
    │   │   │   └── use-trading-pairs.ts
    │   │   ├── lib/
    │   │   │   └── symbol.ts               (был shared/lib/symbol.ts)
    │   │   └── model/
    │   │       ├── market-store.ts         (был shared/stores/market-store.ts)
    │   │       └── SymbolSync.tsx
    │   ├── ticker/
    │   │   ├── index.ts
    │   │   └── api/
    │   │       ├── tickers.ts              (только getTickers из shared/api/trading-pairs.ts)
    │   │       ├── use-tickers.ts          (содержит useTickers и useTickerBySymbol)
    │   │       ├── use-ticker-stream.ts    (был shared/ws/use-ticker-stream.ts)
    │   │       └── TickerSubscription.tsx  (был shared/ws/TickerSubscription.tsx)
    │   └── kline/
    │       ├── index.ts
    │       └── api/
    │           ├── klines.ts                (был shared/api/klines.ts)
    │           ├── use-klines.ts
    │           └── use-kline-stream.ts      (был shared/ws/use-kline-stream.ts)
    └── shared/                       # переиспользуемая инфраструктура
        ├── api/
        │   ├── client.ts                    (включая ApiError, NetworkError)
        │   ├── api-error.ts                 (был shared/lib/api-error.ts; зависит от client.ts)
        │   └── query-keys.ts
        ├── lib/
        │   ├── decimal.ts
        │   ├── format.ts
        │   └── utils.ts
        ├── ui/                              (shadcn primitives — без изменений)
        │   └── …
        └── ws/
            ├── client.ts                    (getWsClient, ExchangeWebSocketClient)
            ├── ws-store.ts                  (был shared/stores/ws-store.ts)
            └── use-connection-state.ts
```

## Правила слоёв (для напоминания)

- Импортировать можно ТОЛЬКО из нижестоящих слоёв: `app → pages → widgets → features → entities → shared`.
- Внутри слоя сегмент `<slice>/index.ts` экспортирует публичный API. Все внешние импорты — только через `@/<layer>/<slice>` (если в `index.ts` есть экспорт) или `@/<layer>/<slice>/...` напрямую — оба варианта допустимы, но `index.ts` предпочтительнее для widgets / features / entities.
- Cross-import между слайсами одного слоя запрещён. Если `widget A` нужен код из `widget B` — выносим в нижний слой.

## Команды проверки (используются после каждой задачи)

- Type-check: `npx tsc --noEmit -p apps/web`
- Lint: `npm run lint --workspace=web`
- Dev server (только в финальной задаче): `npm run dev:web`

---

### Task 1: Перенос Next.js App Router в корень apps/web

**Files:**
- Move: `apps/web/src/app/favicon.ico` → `apps/web/app/favicon.ico`
- Move: `apps/web/src/app/layout.tsx` → `apps/web/app/layout.tsx`
- Move: `apps/web/src/app/page.tsx` → `apps/web/app/page.tsx`
- Move: `apps/web/src/app/trade/[symbol]/page.tsx` → `apps/web/app/trade/[symbol]/page.tsx`
- Move: `apps/web/src/app/globals.css` → `apps/web/src/app/styles/globals.css`
- Create: `apps/web/src/app/providers/query-provider.tsx` (перенос из `apps/web/src/shared/providers/query-provider.tsx`)
- Create: `apps/web/src/app/providers/index.ts`
- Delete: `apps/web/src/shared/providers/` (вся папка после переноса)

- [ ] **Step 1: Создать целевые папки**

```bash
mkdir -p apps/web/app/trade/[symbol]
mkdir -p apps/web/src/app/providers
mkdir -p apps/web/src/app/styles
```

- [ ] **Step 2: Переместить файлы Next.js router**

```bash
git mv apps/web/src/app/favicon.ico apps/web/app/favicon.ico
git mv apps/web/src/app/layout.tsx apps/web/app/layout.tsx
git mv apps/web/src/app/page.tsx apps/web/app/page.tsx
git mv apps/web/src/app/trade/[symbol]/page.tsx apps/web/app/trade/[symbol]/page.tsx
```

После этого удалить пустые папки: `apps/web/src/app/trade/[symbol]`, `apps/web/src/app/trade`.

- [ ] **Step 3: Переместить globals.css в FSD app слой**

```bash
git mv apps/web/src/app/globals.css apps/web/src/app/styles/globals.css
```

- [ ] **Step 4: Перенести QueryProvider в FSD app слой**

```bash
git mv apps/web/src/shared/providers/query-provider.tsx apps/web/src/app/providers/query-provider.tsx
git mv apps/web/src/shared/providers/index.ts apps/web/src/app/providers/index.ts
rmdir apps/web/src/shared/providers
```

Содержимое `apps/web/src/app/providers/index.ts` остаётся прежним:

```ts
export { QueryProvider } from './query-provider';
```

- [ ] **Step 5: Обновить импорты в `apps/web/app/layout.tsx`**

Заменить:

```tsx
import { QueryProvider } from '@/shared/providers';
import './globals.css';
```

на:

```tsx
import { QueryProvider } from '@/app/providers';
import '@/app/styles/globals.css';
```

- [ ] **Step 6: Проверка компиляции**

Run: `npx tsc --noEmit -p apps/web`
Expected: PASS (могут остаться ошибки про `@/features/trade-terminal/...` — это OK, исправим в следующих задачах; на этом шаге важно, чтобы layout.tsx, page.tsx и trade/[symbol]/page.tsx находили свои импорты, но они зависят от TradeTerminal — он перенесётся в Task 2).

Если ошибки только в `apps/web/app/trade/[symbol]/page.tsx` про путь `@/features/trade-terminal/TradeTerminal` — игнорируем до Task 2. Иначе — fix.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "refactor(web): move next.js app router to apps/web/app"
```

---

### Task 2: Создать pages-слой и перенести TradeTerminal

**Files:**
- Move: `apps/web/src/features/trade-terminal/TradeTerminal.tsx` → `apps/web/src/pages/trade/ui/TradeTerminal.tsx`
- Move: `apps/web/src/features/trade-terminal/mocks.ts` → `apps/web/src/widgets/order-book/lib/generate-mock-book.ts`
- Move: `apps/web/src/features/trade-terminal/types.ts` → `apps/web/src/widgets/order-book/lib/types.ts`
- Create: `apps/web/src/pages/trade/index.ts`
- Modify: `apps/web/app/trade/[symbol]/page.tsx`
- Delete: `apps/web/src/features/trade-terminal/` (целиком)

- [ ] **Step 1: Создать папки**

```bash
mkdir -p apps/web/src/pages/trade/ui
mkdir -p apps/web/src/widgets/order-book/lib
```

- [ ] **Step 2: Переместить TradeTerminal и mocks/types**

```bash
git mv apps/web/src/features/trade-terminal/TradeTerminal.tsx apps/web/src/pages/trade/ui/TradeTerminal.tsx
git mv apps/web/src/features/trade-terminal/mocks.ts apps/web/src/widgets/order-book/lib/generate-mock-book.ts
git mv apps/web/src/features/trade-terminal/types.ts apps/web/src/widgets/order-book/lib/types.ts
rmdir apps/web/src/features/trade-terminal
```

- [ ] **Step 3: Создать публичный API страницы**

Создать `apps/web/src/pages/trade/index.ts`:

```ts
export { TradeTerminal } from './ui/TradeTerminal';
```

- [ ] **Step 4: Обновить импорты в Next.js page**

`apps/web/app/trade/[symbol]/page.tsx`:

```tsx
import { TradeTerminal } from '@/pages/trade';

export default async function TradePage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return <TradeTerminal initialSymbol={symbol.toUpperCase()} />;
}
```

- [ ] **Step 5: Обновить импорты внутри TradeTerminal.tsx (только пути)**

`apps/web/src/pages/trade/ui/TradeTerminal.tsx` — заменить старые импорты:

```tsx
import { BottomTabs } from '@/features/bottom-tabs/BottomTabs';
import { CandleChart } from '@/features/candle-chart/CandleChart';
import type { Timeframe } from '@/features/candle-chart/timeframes';
import { OrderBook } from '@/features/order-book/OrderBook';
import { OrderForm } from '@/features/order-form/OrderForm';
import { ResetModal } from '@/features/reset-modal/ResetModal';
import { StatusFooter } from '@/features/status-footer/StatusFooter';
import { TopBar } from '@/features/top-bar/TopBar';
import { SymbolSync } from '@/shared/stores/SymbolSync';
import { useMarketStore } from '@/shared/stores/market-store';
```

на:

```tsx
import { BottomTabs } from '@/widgets/bottom-tabs';
import { CandleChart } from '@/widgets/candle-chart';
import { OrderBook } from '@/widgets/order-book';
import { OrderForm } from '@/widgets/order-form';
import { StatusFooter } from '@/widgets/status-footer';
import { TopBar } from '@/widgets/top-bar';
import { ResetModal } from '@/features/reset-account';
import { SymbolSync, useMarketStore } from '@/entities/trading-pair';
import type { Timeframe } from '@/widgets/candle-chart';
```

> Примечание: на этом шаге пути ещё указывают на несуществующие модули — они появятся в Task 3–6. Type-check будет красным; это ожидаемо. Зафиксировать структуру и продолжить.

- [ ] **Step 6: Обновить импорты в OrderBook.tsx (только локальные)**

В `apps/web/src/features/order-book/OrderBook.tsx` (компонент пока ещё на старом месте) заменить:

```tsx
import { genOrderBook } from '@/features/trade-terminal/mocks';
import type { OrderBookLevel, OrderBookSnapshot } from '@/features/trade-terminal/types';
```

на (учитывая что компонент в Task 3 переедет в `@/widgets/order-book`, оставляем относительные пути для будущей структуры):

```tsx
import { genOrderBook } from '@/widgets/order-book/lib/generate-mock-book';
import type { OrderBookLevel, OrderBookSnapshot } from '@/widgets/order-book/lib/types';
```

- [ ] **Step 7: Commit (даже с временно красным type-check)**

```bash
git add apps/web
git commit -m "refactor(web): introduce pages/trade and seed widgets/order-book/lib"
```

---

### Task 3: Перенести виджеты целиком

**Files:** (для каждого виджета — переместить файл и создать `index.ts`)

| Из | В |
|---|---|
| `apps/web/src/features/top-bar/TopBar.tsx` | `apps/web/src/widgets/top-bar/ui/TopBar.tsx` |
| `apps/web/src/features/candle-chart/CandleChart.tsx` | `apps/web/src/widgets/candle-chart/ui/CandleChart.tsx` |
| `apps/web/src/features/candle-chart/timeframes.ts` | `apps/web/src/widgets/candle-chart/model/timeframes.ts` |
| `apps/web/src/features/order-book/OrderBook.tsx` | `apps/web/src/widgets/order-book/ui/OrderBook.tsx` |
| `apps/web/src/features/order-form/OrderForm.tsx` | `apps/web/src/widgets/order-form/ui/OrderForm.tsx` |
| `apps/web/src/features/bottom-tabs/BottomTabs.tsx` | `apps/web/src/widgets/bottom-tabs/ui/BottomTabs.tsx` |
| `apps/web/src/features/status-footer/StatusFooter.tsx` | `apps/web/src/widgets/status-footer/ui/StatusFooter.tsx` |

- [ ] **Step 1: Создать структуру папок и переместить**

```bash
mkdir -p apps/web/src/widgets/top-bar/ui
mkdir -p apps/web/src/widgets/candle-chart/{ui,model}
mkdir -p apps/web/src/widgets/order-book/ui
mkdir -p apps/web/src/widgets/order-form/ui
mkdir -p apps/web/src/widgets/bottom-tabs/ui
mkdir -p apps/web/src/widgets/status-footer/ui

git mv apps/web/src/features/top-bar/TopBar.tsx apps/web/src/widgets/top-bar/ui/TopBar.tsx
git mv apps/web/src/features/candle-chart/CandleChart.tsx apps/web/src/widgets/candle-chart/ui/CandleChart.tsx
git mv apps/web/src/features/candle-chart/timeframes.ts apps/web/src/widgets/candle-chart/model/timeframes.ts
git mv apps/web/src/features/order-book/OrderBook.tsx apps/web/src/widgets/order-book/ui/OrderBook.tsx
git mv apps/web/src/features/order-form/OrderForm.tsx apps/web/src/widgets/order-form/ui/OrderForm.tsx
git mv apps/web/src/features/bottom-tabs/BottomTabs.tsx apps/web/src/widgets/bottom-tabs/ui/BottomTabs.tsx
git mv apps/web/src/features/status-footer/StatusFooter.tsx apps/web/src/widgets/status-footer/ui/StatusFooter.tsx

rmdir apps/web/src/features/top-bar
rmdir apps/web/src/features/candle-chart
rmdir apps/web/src/features/order-book
rmdir apps/web/src/features/order-form
rmdir apps/web/src/features/bottom-tabs
rmdir apps/web/src/features/status-footer
```

- [ ] **Step 2: Создать публичные API каждого виджета**

`apps/web/src/widgets/top-bar/index.ts`:

```ts
export { TopBar } from './ui/TopBar';
```

`apps/web/src/widgets/candle-chart/index.ts`:

```ts
export { CandleChart } from './ui/CandleChart';
export { TIMEFRAMES, type Timeframe } from './model/timeframes';
```

`apps/web/src/widgets/order-book/index.ts`:

```ts
export { OrderBook } from './ui/OrderBook';
```

`apps/web/src/widgets/order-form/index.ts`:

```ts
export { OrderForm } from './ui/OrderForm';
```

`apps/web/src/widgets/bottom-tabs/index.ts`:

```ts
export { BottomTabs } from './ui/BottomTabs';
```

`apps/web/src/widgets/status-footer/index.ts`:

```ts
export { StatusFooter } from './ui/StatusFooter';
```

- [ ] **Step 3: Обновить внутренний импорт CandleChart**

В `apps/web/src/widgets/candle-chart/ui/CandleChart.tsx` заменить:

```tsx
import { TIMEFRAMES, type Timeframe } from './timeframes';
```

на:

```tsx
import { TIMEFRAMES, type Timeframe } from '../model/timeframes';
```

Все остальные импорты в этом файле (`@/shared/...`) пока трогать не нужно — будут обновлены в Task 5–6.

- [ ] **Step 4: Проверка структуры**

```bash
ls apps/web/src/widgets
```

Expected output:

```
bottom-tabs
candle-chart
order-book
order-form
status-footer
top-bar
```

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "refactor(web): move widgets into fsd widgets layer"
```

---

### Task 4: Создать features-слой (reset-account, create-order, cancel-order)

**Files:**

| Из | В |
|---|---|
| `apps/web/src/features/reset-modal/ResetModal.tsx` | `apps/web/src/features/reset-account/ui/ResetModal.tsx` |
| `apps/web/src/shared/api/hooks/mutations/use-reset-account.ts` | `apps/web/src/features/reset-account/api/use-reset-account.ts` |
| `apps/web/src/shared/api/account.ts` | `apps/web/src/features/reset-account/api/reset-account.ts` |
| `apps/web/src/shared/api/hooks/mutations/use-create-order.ts` | `apps/web/src/features/create-order/api/use-create-order.ts` |
| `apps/web/src/shared/lib/optimistic-balance.ts` | `apps/web/src/features/create-order/lib/optimistic-balance.ts` |
| `apps/web/src/shared/api/hooks/mutations/use-cancel-order.ts` | `apps/web/src/features/cancel-order/api/use-cancel-order.ts` |

- [ ] **Step 1: Создать папки и переместить файлы**

```bash
mkdir -p apps/web/src/features/reset-account/{api,ui}
mkdir -p apps/web/src/features/create-order/{api,lib}
mkdir -p apps/web/src/features/cancel-order/api

git mv apps/web/src/features/reset-modal/ResetModal.tsx apps/web/src/features/reset-account/ui/ResetModal.tsx
git mv apps/web/src/shared/api/hooks/mutations/use-reset-account.ts apps/web/src/features/reset-account/api/use-reset-account.ts
git mv apps/web/src/shared/api/account.ts apps/web/src/features/reset-account/api/reset-account.ts

git mv apps/web/src/shared/api/hooks/mutations/use-create-order.ts apps/web/src/features/create-order/api/use-create-order.ts
git mv apps/web/src/shared/lib/optimistic-balance.ts apps/web/src/features/create-order/lib/optimistic-balance.ts

git mv apps/web/src/shared/api/hooks/mutations/use-cancel-order.ts apps/web/src/features/cancel-order/api/use-cancel-order.ts

rmdir apps/web/src/features/reset-modal
rmdir apps/web/src/shared/api/hooks/mutations
```

- [ ] **Step 2: Создать публичные API**

`apps/web/src/features/reset-account/index.ts`:

```ts
export { ResetModal } from './ui/ResetModal';
export { useResetAccount } from './api/use-reset-account';
```

`apps/web/src/features/create-order/index.ts`:

```ts
export { useCreateOrder } from './api/use-create-order';
```

`apps/web/src/features/cancel-order/index.ts`:

```ts
export { useCancelOrder } from './api/use-cancel-order';
```

- [ ] **Step 3: Обновить импорты внутри features/reset-account**

`apps/web/src/features/reset-account/api/use-reset-account.ts` — заменить:

```ts
import { resetAccount } from '@/shared/api/account';
```

на:

```ts
import { resetAccount } from './reset-account';
```

`apps/web/src/features/reset-account/ui/ResetModal.tsx` — заменить:

```tsx
import { useResetAccount } from '@/shared/api/hooks/mutations/use-reset-account';
import { parseApiError } from '@/shared/lib/api-error';
```

на:

```tsx
import { useResetAccount } from '../api/use-reset-account';
import { parseApiError } from '@/shared/api/api-error';
```

> Примечание: `api-error.ts` переедет в `shared/api/` в Task 6. Сейчас он ещё в `shared/lib/` — но мы сразу пишем целевой путь, чтобы не возвращаться. Если type-check жалуется — оставить временно `@/shared/lib/api-error`, в Task 6 будет find-and-replace.

- [ ] **Step 4: Обновить импорты внутри features/create-order**

`apps/web/src/features/create-order/api/use-create-order.ts` — заменить:

```ts
import { createOrder } from '@/shared/api/orders';
import { queryKeys } from '@/shared/api/query-keys';
import { applyOptimisticMarketOrder } from '@/shared/lib/optimistic-balance';
```

на:

```ts
import { createOrder } from '@/entities/order';
import { queryKeys } from '@/shared/api/query-keys';
import { applyOptimisticMarketOrder } from '../lib/optimistic-balance';
```

> Импорт `createOrder` указывает на entities/order — это файл, который ещё не существует. Появится в Task 5. До этого type-check будет жаловаться — это ожидаемо.

- [ ] **Step 5: Обновить импорты внутри features/cancel-order**

`apps/web/src/features/cancel-order/api/use-cancel-order.ts` — заменить:

```ts
import { cancelOrder } from '@/shared/api/orders';
import { queryKeys } from '@/shared/api/query-keys';
```

на:

```ts
import { cancelOrder } from '@/entities/order';
import { queryKeys } from '@/shared/api/query-keys';
```

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "refactor(web): introduce fsd features layer for reset/create/cancel order"
```

---

### Task 5: Создать entities-слой (balance, order, trade, trading-pair, ticker, kline)

**Files:**

| Из | В |
|---|---|
| `apps/web/src/shared/api/balances.ts` | `apps/web/src/entities/balance/api/balances.ts` |
| `apps/web/src/shared/api/hooks/use-balances.ts` | `apps/web/src/entities/balance/api/use-balances.ts` |
| `apps/web/src/shared/lib/portfolio.ts` | `apps/web/src/entities/balance/lib/portfolio.ts` |
| `apps/web/src/shared/api/orders.ts` | `apps/web/src/entities/order/api/orders.ts` |
| `apps/web/src/shared/api/hooks/use-orders.ts` | `apps/web/src/entities/order/api/use-orders.ts` |
| `apps/web/src/shared/api/trades.ts` | `apps/web/src/entities/trade/api/trades.ts` |
| `apps/web/src/shared/api/hooks/use-trades.ts` | `apps/web/src/entities/trade/api/use-trades.ts` |
| `apps/web/src/shared/api/trading-pairs.ts` | разделить (см. Step 1) |
| `apps/web/src/shared/api/hooks/use-trading-pairs.ts` | `apps/web/src/entities/trading-pair/api/use-trading-pairs.ts` |
| `apps/web/src/shared/api/hooks/use-tickers.ts` | `apps/web/src/entities/ticker/api/use-tickers.ts` |
| `apps/web/src/shared/ws/use-ticker-stream.ts` | `apps/web/src/entities/ticker/api/use-ticker-stream.ts` |
| `apps/web/src/shared/ws/TickerSubscription.tsx` | `apps/web/src/entities/ticker/api/TickerSubscription.tsx` |
| `apps/web/src/shared/api/klines.ts` | `apps/web/src/entities/kline/api/klines.ts` |
| `apps/web/src/shared/api/hooks/use-klines.ts` | `apps/web/src/entities/kline/api/use-klines.ts` |
| `apps/web/src/shared/ws/use-kline-stream.ts` | `apps/web/src/entities/kline/api/use-kline-stream.ts` |
| `apps/web/src/shared/lib/symbol.ts` | `apps/web/src/entities/trading-pair/lib/symbol.ts` |
| `apps/web/src/shared/stores/market-store.ts` | `apps/web/src/entities/trading-pair/model/market-store.ts` |
| `apps/web/src/shared/stores/SymbolSync.tsx` | `apps/web/src/entities/trading-pair/model/SymbolSync.tsx` |

- [ ] **Step 1: Разделить `shared/api/trading-pairs.ts` на два файла**

Создать `apps/web/src/entities/trading-pair/api/trading-pairs.ts`:

```ts
import { TradingPairListSchema, type TradingPair } from '@exchange/shared';
import { apiFetch } from '@/shared/api/client';

export async function getTradingPairs(signal?: AbortSignal): Promise<TradingPair[]> {
  const data = await apiFetch('/trading-pairs', { signal });
  return TradingPairListSchema.parse(data);
}
```

Создать `apps/web/src/entities/ticker/api/tickers.ts`:

```ts
import { TradingPairWithStatsListSchema, type TradingPairWithStats } from '@exchange/shared';
import { apiFetch } from '@/shared/api/client';

export async function getTickers(signal?: AbortSignal): Promise<TradingPairWithStats[]> {
  const data = await apiFetch('/tickers', { signal });
  return TradingPairWithStatsListSchema.parse(data);
}
```

Удалить старый файл:

```bash
rm apps/web/src/shared/api/trading-pairs.ts
```

- [ ] **Step 2: Создать структуру папок и переместить остальные файлы**

```bash
mkdir -p apps/web/src/entities/balance/{api,lib}
mkdir -p apps/web/src/entities/order/api
mkdir -p apps/web/src/entities/trade/api
mkdir -p apps/web/src/entities/trading-pair/{api,lib,model}
mkdir -p apps/web/src/entities/ticker/api
mkdir -p apps/web/src/entities/kline/api

git mv apps/web/src/shared/api/balances.ts apps/web/src/entities/balance/api/balances.ts
git mv apps/web/src/shared/api/hooks/use-balances.ts apps/web/src/entities/balance/api/use-balances.ts
git mv apps/web/src/shared/lib/portfolio.ts apps/web/src/entities/balance/lib/portfolio.ts

git mv apps/web/src/shared/api/orders.ts apps/web/src/entities/order/api/orders.ts
git mv apps/web/src/shared/api/hooks/use-orders.ts apps/web/src/entities/order/api/use-orders.ts

git mv apps/web/src/shared/api/trades.ts apps/web/src/entities/trade/api/trades.ts
git mv apps/web/src/shared/api/hooks/use-trades.ts apps/web/src/entities/trade/api/use-trades.ts

git mv apps/web/src/shared/api/hooks/use-trading-pairs.ts apps/web/src/entities/trading-pair/api/use-trading-pairs.ts
git mv apps/web/src/shared/lib/symbol.ts apps/web/src/entities/trading-pair/lib/symbol.ts
git mv apps/web/src/shared/stores/market-store.ts apps/web/src/entities/trading-pair/model/market-store.ts
git mv apps/web/src/shared/stores/SymbolSync.tsx apps/web/src/entities/trading-pair/model/SymbolSync.tsx

git mv apps/web/src/shared/api/hooks/use-tickers.ts apps/web/src/entities/ticker/api/use-tickers.ts
git mv apps/web/src/shared/ws/use-ticker-stream.ts apps/web/src/entities/ticker/api/use-ticker-stream.ts
git mv apps/web/src/shared/ws/TickerSubscription.tsx apps/web/src/entities/ticker/api/TickerSubscription.tsx

git mv apps/web/src/shared/api/klines.ts apps/web/src/entities/kline/api/klines.ts
git mv apps/web/src/shared/api/hooks/use-klines.ts apps/web/src/entities/kline/api/use-klines.ts
git mv apps/web/src/shared/ws/use-kline-stream.ts apps/web/src/entities/kline/api/use-kline-stream.ts

rmdir apps/web/src/shared/api/hooks
rmdir apps/web/src/shared/stores
```

- [ ] **Step 3: Создать публичные API всех entities**

`apps/web/src/entities/balance/index.ts`:

```ts
export { getBalances } from './api/balances';
export { useBalances } from './api/use-balances';
export { calculateTotalEquityUsdt } from './lib/portfolio';
```

`apps/web/src/entities/order/index.ts`:

```ts
export { getOrders, createOrder, cancelOrder } from './api/orders';
export { useOrders, useOpenOrders, useOrderHistory } from './api/use-orders';
```

`apps/web/src/entities/trade/index.ts`:

```ts
export { getTrades } from './api/trades';
export { useTrades, useTradeHistory } from './api/use-trades';
```

`apps/web/src/entities/trading-pair/index.ts`:

```ts
export { getTradingPairs } from './api/trading-pairs';
export { useTradingPairs } from './api/use-trading-pairs';
export { formatSymbolDisplay, formatPairDisplay } from './lib/symbol';
export { useMarketStore } from './model/market-store';
export { SymbolSync } from './model/SymbolSync';
```

`apps/web/src/entities/ticker/index.ts`:

```ts
export { getTickers } from './api/tickers';
export { useTickers, useTickerBySymbol, useTradingPairWithStats } from './api/use-tickers';
export { useTickerStream } from './api/use-ticker-stream';
export { TickerSubscription } from './api/TickerSubscription';
```

`apps/web/src/entities/kline/index.ts`:

```ts
export { getKlines } from './api/klines';
export { useKlines } from './api/use-klines';
export { useKlineStream } from './api/use-kline-stream';
```

- [ ] **Step 4: Обновить относительные импорты внутри entities**

В `apps/web/src/entities/balance/api/use-balances.ts`:

```ts
import { getBalances } from './balances';
import { queryKeys } from '@/shared/api/query-keys';
```

В `apps/web/src/entities/balance/api/balances.ts`:

```ts
import { BalanceMapSchema, type BalanceMap } from '@exchange/shared';
import { apiFetch } from '@/shared/api/client';
```

В `apps/web/src/entities/order/api/orders.ts`:

```ts
import {
  CreateOrderSchema,
  OrderViewListSchema,
  OrderViewSchema,
  type CreateOrderDto,
  type OrderView,
} from '@exchange/shared';
import { apiFetch } from '@/shared/api/client';
```

В `apps/web/src/entities/order/api/use-orders.ts`:

```ts
import { getOrders } from './orders';
import { queryKeys } from '@/shared/api/query-keys';
```

В `apps/web/src/entities/trade/api/trades.ts` и `use-trades.ts` — аналогично (импорты `apiFetch` → `@/shared/api/client`, `getTrades` относительно).

В `apps/web/src/entities/trading-pair/api/use-trading-pairs.ts`:

```ts
import { getTradingPairs } from './trading-pairs';
import { queryKeys } from '@/shared/api/query-keys';
```

В `apps/web/src/entities/trading-pair/model/SymbolSync.tsx`:

```tsx
import { useMarketStore } from './market-store';
```

В `apps/web/src/entities/ticker/api/use-tickers.ts`:

```ts
import { getTickers } from './tickers';
import { queryKeys } from '@/shared/api/query-keys';
```

В `apps/web/src/entities/ticker/api/use-ticker-stream.ts`:

```ts
import { getWsClient } from '@/shared/ws/client';
import { queryKeys } from '@/shared/api/query-keys';
```

В `apps/web/src/entities/ticker/api/TickerSubscription.tsx`:

```tsx
import { useTickerStream } from './use-ticker-stream';
```

В `apps/web/src/entities/kline/api/klines.ts`:

```ts
import { KlineListSchema, type Kline, type KlineInterval } from '@exchange/shared';
import { apiFetch } from '@/shared/api/client';
```

В `apps/web/src/entities/kline/api/use-klines.ts`:

```ts
import { getKlines } from './klines';
import { queryKeys } from '@/shared/api/query-keys';
```

В `apps/web/src/entities/kline/api/use-kline-stream.ts`:

```ts
import { getWsClient } from '@/shared/ws/client';
import { queryKeys } from '@/shared/api/query-keys';
```

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "refactor(web): create fsd entities layer (balance/order/trade/trading-pair/ticker/kline)"
```

---

### Task 6: Реорганизовать shared слой и обновить все импорты в виджетах/страницах

Этот шаг — финальный «склейщик»: переносим оставшиеся файлы в `shared/`, затем массово обновляем импорты в widgets / pages, чтобы они смотрели на новые пути.

**Files:**

| Из | В |
|---|---|
| `apps/web/src/shared/lib/api-error.ts` | `apps/web/src/shared/api/api-error.ts` |
| `apps/web/src/shared/stores/ws-store.ts` | `apps/web/src/shared/ws/ws-store.ts` |

- [ ] **Step 1: Переместить api-error и ws-store**

```bash
git mv apps/web/src/shared/lib/api-error.ts apps/web/src/shared/api/api-error.ts
git mv apps/web/src/shared/stores/ws-store.ts apps/web/src/shared/ws/ws-store.ts
```

Если `apps/web/src/shared/stores/` оказалась пустой — удалить:

```bash
rmdir apps/web/src/shared/stores 2>/dev/null || true
```

- [ ] **Step 2: Обновить внутренние импорты в shared**

`apps/web/src/shared/api/api-error.ts` — путь к `client.ts` теперь относительный:

```ts
import { ApiError, NetworkError } from './client';
```

`apps/web/src/shared/ws/client.ts` — заменить:

```ts
import { useWsStore } from '@/shared/stores/ws-store';
```

на:

```ts
import { useWsStore } from './ws-store';
```

`apps/web/src/shared/ws/use-connection-state.ts` — заменить:

```ts
import { useWsStore } from '@/shared/stores/ws-store';
```

на:

```ts
import { useWsStore } from './ws-store';
```

- [ ] **Step 3: Массовое обновление импортов в widgets и pages**

Прогнать по всем файлам в `apps/web/src/widgets/`, `apps/web/src/pages/`, `apps/web/src/features/` следующие замены (find-replace):

| Старый импорт | Новый импорт |
|---|---|
| `@/shared/api/hooks/use-balances` | `@/entities/balance` |
| `@/shared/api/hooks/use-orders` | `@/entities/order` |
| `@/shared/api/hooks/use-trades` | `@/entities/trade` |
| `@/shared/api/hooks/use-trading-pairs` | `@/entities/trading-pair` |
| `@/shared/api/hooks/use-tickers` | `@/entities/ticker` |
| `@/shared/api/hooks/use-klines` | `@/entities/kline` |
| `@/shared/api/hooks/mutations/use-create-order` | `@/features/create-order` |
| `@/shared/api/hooks/mutations/use-cancel-order` | `@/features/cancel-order` |
| `@/shared/api/hooks/mutations/use-reset-account` | `@/features/reset-account` |
| `@/shared/api/orders` | `@/entities/order` |
| `@/shared/api/trades` | `@/entities/trade` |
| `@/shared/api/balances` | `@/entities/balance` |
| `@/shared/api/klines` | `@/entities/kline` |
| `@/shared/api/account` | `@/features/reset-account` |
| `@/shared/lib/portfolio` | `@/entities/balance` |
| `@/shared/lib/symbol` | `@/entities/trading-pair` |
| `@/shared/lib/optimistic-balance` | `@/features/create-order/lib/optimistic-balance` |
| `@/shared/lib/api-error` | `@/shared/api/api-error` |
| `@/shared/stores/market-store` | `@/entities/trading-pair` |
| `@/shared/stores/SymbolSync` | `@/entities/trading-pair` |
| `@/shared/stores/ws-store` | `@/shared/ws/ws-store` |
| `@/shared/ws/TickerSubscription` | `@/entities/ticker` |
| `@/shared/ws/use-kline-stream` | `@/entities/kline` |
| `@/shared/ws/use-ticker-stream` | `@/entities/ticker` |

Также проверить, что виджеты, у которых есть прямые импорты компонента (`@/features/<old>/Foo`), теперь указывают на `@/widgets/<new>` (это должны быть только остатки в TradeTerminal — он был обновлён в Task 2, но проверить).

Конкретные правки в widgets:

`apps/web/src/widgets/top-bar/ui/TopBar.tsx` — было:

```tsx
import { useBalances } from '@/shared/api/hooks/use-balances';
import { useTickers } from '@/shared/api/hooks/use-tickers';
import { formatDecimal, formatPrice, formatSignedPercent } from '@/shared/lib/format';
import { calculateTotalEquityUsdt } from '@/shared/lib/portfolio';
import { formatPairDisplay } from '@/shared/lib/symbol';
import { useMarketStore } from '@/shared/stores/market-store';
import { TickerSubscription } from '@/shared/ws/TickerSubscription';
```

станет:

```tsx
import { useBalances, calculateTotalEquityUsdt } from '@/entities/balance';
import { useTickers, TickerSubscription } from '@/entities/ticker';
import { useMarketStore, formatPairDisplay } from '@/entities/trading-pair';
import { formatDecimal, formatPrice, formatSignedPercent } from '@/shared/lib/format';
```

`apps/web/src/widgets/candle-chart/ui/CandleChart.tsx`:

```tsx
import { useTickerBySymbol } from '@/entities/ticker';
import { useKlines, useKlineStream } from '@/entities/kline';
import { useMarketStore } from '@/entities/trading-pair';
import { formatDecimal, formatPrice } from '@/shared/lib/format';
```

`apps/web/src/widgets/order-book/ui/OrderBook.tsx`:

```tsx
import { useTickers } from '@/entities/ticker';
import { useMarketStore } from '@/entities/trading-pair';
import { formatPrice } from '@/shared/lib/format';
import { genOrderBook } from '@/widgets/order-book/lib/generate-mock-book';
import type { OrderBookLevel, OrderBookSnapshot } from '@/widgets/order-book/lib/types';
```

`apps/web/src/widgets/order-form/ui/OrderForm.tsx`:

```tsx
import { useBalances } from '@/entities/balance';
import { useTickers } from '@/entities/ticker';
import { useTradingPairs, useMarketStore } from '@/entities/trading-pair';
import { useCreateOrder } from '@/features/create-order';
import { parseApiError } from '@/shared/api/api-error';
import { Decimal, toFixedDown } from '@/shared/lib/decimal';
import { formatDecimal, formatPrice } from '@/shared/lib/format';
```

`apps/web/src/widgets/bottom-tabs/ui/BottomTabs.tsx`:

```tsx
import { useBalances } from '@/entities/balance';
import { useOpenOrders, useOrderHistory } from '@/entities/order';
import { useTickers } from '@/entities/ticker';
import { useTradeHistory } from '@/entities/trade';
import { useCancelOrder } from '@/features/cancel-order';
import { parseApiError } from '@/shared/api/api-error';
import { formatDecimal, formatPrice, formatTime } from '@/shared/lib/format';
```

`apps/web/src/widgets/status-footer/ui/StatusFooter.tsx`:

```tsx
import { useConnectionState } from '@/shared/ws/use-connection-state';
```

(остаётся как было, путь не менялся)

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p apps/web`
Expected: PASS. Если есть ошибки — устранить (как правило это пропущенные импорты).

- [ ] **Step 5: Lint**

Run: `npm run lint --workspace=web`
Expected: PASS (или только warning'и, не errors).

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "refactor(web): consolidate shared layer and rewrite import paths to fsd"
```

---

### Task 7: Обновить документацию (CLAUDE.md и README.md)

**Files:**
- Modify: `apps/web/CLAUDE.md` (если он содержит описание структуры — добавить FSD)
- Modify: `README.md` (корневой)

- [ ] **Step 1: Обновить корневой `README.md` — секция «Структура проекта»**

Заменить блок `## Структура проекта` на:

````markdown
## Структура проекта

```
demo-exchange/
├── apps/
│   ├── api/                          # Приложение NestJS
│   └── web/                          # Приложение Next.js (Feature-Sliced Design)
│       ├── app/                      # Next.js App Router (layout, page, routes)
│       └── src/
│           ├── app/                  # FSD app — провайдеры, глобальные стили
│           ├── pages/                # FSD pages — композиции под маршруты
│           ├── widgets/              # FSD widgets — крупные UI-блоки
│           ├── features/             # FSD features — пользовательские действия
│           ├── entities/             # FSD entities — бизнес-сущности
│           └── shared/               # FSD shared — переиспользуемая инфраструктура
├── packages/
│   └── shared/                       # @exchange/shared — Zod-схемы + типы
│       ├── src/
│       │   ├── index.ts
│       │   └── schemas/              # common, views/*, dto/*, ws-messages, ws-client
│       ├── package.json
│       └── tsconfig.json
├── scripts/
│   └── setup.mjs
├── docker-compose.yml
├── .env.example
├── .gitignore
├── prettier.config.mjs
├── tsconfig.base.json
├── package.json
└── README.md
```
````

- [ ] **Step 2: Добавить в `README.md` секцию «Архитектура фронтенда»**

Сразу после блока «## Архитектура» вставить:

````markdown
### Фронтенд: Feature-Sliced Design

`apps/web` следует методологии [Feature-Sliced Design](https://feature-sliced.design/). Слои выстроены от высокого уровня абстракции к низкому:

| Слой | Папка | Назначение |
|---|---|---|
| **app** | `src/app/` | Провайдеры (TanStack Query) и глобальные стили. |
| **pages** | `src/pages/` | Композиции страниц, соответствующие маршрутам Next.js. |
| **widgets** | `src/widgets/` | Готовые UI-блоки: `top-bar`, `candle-chart`, `order-book`, `order-form`, `bottom-tabs`, `status-footer`. |
| **features** | `src/features/` | Пользовательские действия: `create-order`, `cancel-order`, `reset-account`. |
| **entities** | `src/entities/` | Бизнес-сущности с API и моделями: `balance`, `order`, `trade`, `trading-pair`, `ticker`, `kline`. |
| **shared** | `src/shared/` | Переиспользуемые примитивы: `api/` (REST-клиент, query-keys, error-mapping), `ws/` (WebSocket-клиент, store, connection state), `lib/` (decimal, format, utils), `ui/` (shadcn-примитивы). |

Правило импортов: слой может импортировать только из нижестоящих слоёв (app → pages → widgets → features → entities → shared). Внутри слоя слайсы изолированы — общий код выносится на уровень ниже.

Next.js App Router живёт в `apps/web/app/` (корень приложения, не путать с FSD-слоем `src/app/`).
````

- [ ] **Step 3: Обновить `apps/web/CLAUDE.md` (если нужно)**

Прочитать `apps/web/CLAUDE.md`. Если там есть упоминание старой структуры (`features/...`) — обновить. Если файл содержит только ссылку на AGENTS.md — оставить как есть.

- [ ] **Step 4: Sanity-check ссылок в `README.md`**

Прочитать `README.md` целиком. Убедиться, что все ссылки в секции «Архитектура» (`docs/auth.md`, `docs/api-schema.md` и т.д.) по-прежнему валидны (они не относятся к фронту, должны остаться).

- [ ] **Step 5: Commit**

```bash
git add README.md apps/web/CLAUDE.md
git commit -m "docs: document fsd layout for apps/web in readme"
```

---

### Task 8: Финальная проверка и сборка

- [ ] **Step 1: Полный type-check**

Run: `npx tsc --noEmit -p apps/web`
Expected: PASS, ноль ошибок.

- [ ] **Step 2: Lint**

Run: `npm run lint --workspace=web`
Expected: PASS.

- [ ] **Step 3: Production build**

Run: `npm run build:web`
Expected: SUCCESS, ноль warning'ов про unresolved imports.

- [ ] **Step 4: Dev server smoke test**

Run: `npm run dev:web` (в одном терминале), `npm run dev:api` (в другом) — либо `npm run dev` если работают оба.

В браузере открыть `http://localhost:3000/` → должен сделать redirect на `/trade/BTCUSDT`.

Проверить вручную:
- TopBar показывает символ, цену, 24h-статы, портфель.
- CandleChart рисует свечи (стримятся через WS).
- OrderBook показывает моки asks/bids.
- OrderForm позволяет переключать BUY/SELL, MARKET/LIMIT.
- BottomTabs переключает Open Orders / History / Trades / Balances.
- StatusFooter показывает Connected/Disconnected.
- Кнопка Reset открывает ResetModal.

- [ ] **Step 5: Создать сводный коммит-маркер (опционально)**

Если все предыдущие задачи закоммичены, никаких новых правок не нужно. Если в Task 8 возникали мелкие фиксы — закоммитить:

```bash
git add apps/web
git commit -m "refactor(web): finalize fsd restructure (smoke fixes)"
```

- [ ] **Step 6: Финальный git log**

Run: `git log --oneline -15`
Expected: видны коммиты Task 1–7 (плюс опциональный Task 8).

---

## Замечания и риски

- **Импорт стилей в layout.tsx.** Next.js разрешает импортировать CSS через alias (`@/app/styles/globals.css`). Если в процессе всплывёт ошибка пути — попробовать относительный путь `../src/app/styles/globals.css` из `app/layout.tsx`.
- **`next.config.ts`.** Перепроверить, нет ли там опции `srcDir` или явно прописанного пути. Если есть — скорректировать. По умолчанию Next.js 16 ищет `app/` в корне и в `src/app/` (приоритет — корень, если оба существуют).
- **`tsconfig.json`.** `paths` уже сконфигурирован как `@/*` → `./src/*` — этого достаточно, менять не нужно.
- **Имена файлов компонентов.** Сохранены PascalCase (`TopBar.tsx`, `OrderForm.tsx`) согласно `CLAUDE.md`, хотя FSD обычно использует kebab-case. CLAUDE.md имеет приоритет.
- **WS-клиент.** `getWsClient` остаётся в `shared/ws/`, но используется из entities (`use-ticker-stream`, `use-kline-stream`). Это разрешено: entities → shared.
- **Не дробим компоненты.** Согласно требованию — не разрезаем большие файлы (`TopBar.tsx` остаётся монолитом с inline-`Stat`, `OrderForm.tsx` — с inline-`FieldNum`/`FormRow`, `BottomTabs.tsx` — с inline-`OpenOrders`/`OrderHistory`/`TradeHistory`/`Balances`). FSD-выгода тут — корректное размещение и публичные API через `index.ts`.
- **`useMarketStore` в trading-pair/model.** Если потом захочется отделить «активный символ» от «торговой пары» — можно вынести в `shared/stores/market-store.ts`. Сейчас держим в trading-pair, потому что store оперирует именно символом торговой пары.
