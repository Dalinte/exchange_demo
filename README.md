# Demo Exchange

Pet-проект: криптовалютная биржа с demo trading (без регистрации).

## Требования

- [Node.js 22+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (для PostgreSQL через Docker Compose)

## Стек технологий

- npm workspaces (монорепозиторий)
- TypeScript
- NestJS
- Next.js
- Prisma
- PostgreSQL 18
- Zod (общие схемы / валидация в рантайме)
- Docker Compose

## Структура проекта

```
demo-exchange/
├── apps/
│   ├── api/                          # Приложение NestJS
│   └── web/                          # Приложение Next.js (Feature-Sliced Design)
│       ├── app/                      # Next.js App Router (layout, page, routes)
│       ├── pages/                    # Пустая папка-сентинел для Next.js (не путать с FSD-слоем)
│       └── src/
│           ├── app/                  # FSD app — провайдеры, глобальные стили
│           ├── pages/                # FSD pages — композиции под маршруты
│           ├── widgets/              # FSD widgets — крупные UI-блоки
│           ├── features/             # FSD features — пользовательские действия
│           ├── entities/             # FSD entities — бизнес-сущности
│           └── shared/               # FSD shared — переиспользуемая инфраструктура
├── packages/
│   └── shared/                       # @exchange/shared — Zod-схемы + типы (источник правды для API)
│       ├── src/
│       │   ├── index.ts
│       │   └── schemas/              # common, views/*, dto/*, ws-messages, ws-client
│       ├── package.json              # main → ./dist/index.js, нужен build перед использованием
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

## Архитектура

Заметки по ключевым фичам — короткая ссылка на цели, поток и ограничения каждой:

- [Анонимная идентификация](docs/auth.md) — cookie-based identity, $10000 USDT для каждого посетителя без регистрации.
- [Схемы, валидация и OpenAPI](docs/api-schema.md) — Zod в `@exchange/shared` как источник правды; автоматическая валидация (`nestjs-zod`) и Swagger UI на `/api/docs`.
- [Entity → Mapper → View](docs/api-mappers.md) — Prisma-сущности не уходят на провод напрямую; мапперы в `apps/api` собирают View-DTO для фронта и добавляют производные поля (`total`, `valueUsdt`, 24h-статистика).
- [Market data REST](docs/market-data.md) — `GET /api/trading-pairs`, `GET /api/tickers`, `GET /api/klines`: метаданные пар, 24h-статы и свечи из Binance REST для initial load до подъёма WS.
- [Размещение ордеров](docs/orders.md) — `POST /api/orders` для MARKET-ордеров, цена с Binance, атомарное списание/зачисление в одной транзакции.
- [История ордеров и сделок](docs/history.md) — `GET /api/orders` и `GET /api/trades`: приватные read-only листинги с фильтрами `status`/`symbol`/`limit`, всегда `createdAt desc`.
- [Балансы](docs/balances.md) — `GET /api/balances` как `Record<asset, BalanceItem>`: `free`/`locked`/`total` из БД + `valueUsdt` через `BinancePriceService` с fallback в `"0"`.
- [Realtime market data](docs/realtime.md) — `ws://localhost:3001/ws` стрим свечей и тикеров: один upstream к Binance combined-streams с фанаутом на N клиентов.
- [Состояние на фронте](docs/frontend-state.md) — TanStack Query (server state) + Zustand (UI state) + WS-апдейтеры, которые пишут в тот же Query Cache; оптимистичный апдейт балансов при размещении ордера и rollback при ошибке.

### Фронтенд: Feature-Sliced Design

`apps/web` следует методологии [Feature-Sliced Design](https://feature-sliced.design/). Слои выстроены от высокого уровня абстракции к низкому:

| Слой         | Папка           | Назначение                                                                                                                                                                                 |
| ------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **app**      | `src/app/`      | Провайдеры (TanStack Query) и глобальные стили.                                                                                                                                            |
| **pages**    | `src/pages/`    | Композиции страниц, соответствующие маршрутам Next.js.                                                                                                                                     |
| **widgets**  | `src/widgets/`  | Готовые UI-блоки: `top-bar`, `candle-chart`, `order-book`, `order-form`, `bottom-tabs`, `status-footer`.                                                                                   |
| **features** | `src/features/` | Пользовательские действия: `create-order`, `cancel-order`, `reset-account`.                                                                                                                |
| **entities** | `src/entities/` | Бизнес-сущности с API и моделями: `balance`, `order`, `trade`, `trading-pair`, `ticker`, `kline`.                                                                                          |
| **shared**   | `src/shared/`   | Переиспользуемые примитивы: `api/` (REST-клиент, query-keys, error-mapping), `ws/` (WebSocket-клиент, store, connection state), `lib/` (decimal, format, utils), `ui/` (shadcn-примитивы). |

Правило импортов: слой может импортировать только из нижестоящих слоёв (app → pages → widgets → features → entities → shared). Внутри слоя слайсы изолированы — общий код выносится на уровень ниже.

Next.js App Router живёт в `apps/web/app/` (корень приложения, не путать с FSD-слоем `src/app/`). Рядом лежит пустая папка `apps/web/pages/` — она нужна, чтобы Next.js не пытался воспринять FSD-слой `src/pages/` как Pages Router.

## API Documentation

Интерактивная документация — Swagger UI:
[http://localhost:3001/api/docs](http://localhost:3001/api/docs).

Сгенерирована из Zod-схем `@exchange/shared` через [`nestjs-zod`](https://www.npmjs.com/package/nestjs-zod):
DTO и `OpenAPI` остаются в синхроне с runtime-валидацией. Сырой OpenAPI JSON — на `/api/docs-json`.

## Environment Variables

`.env.example` — источник правды по нужным переменным. Все API-переменные валидируются Zod-схемой при старте: если что-то невалидно — сервер не стартует, в логах виден понятный список проблем.

| Переменная            | Где              | Описание                                                                 |
| --------------------- | ---------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`        | api, prisma      | Строка подключения к PostgreSQL (`postgresql://user:pass@host:port/db`). |
| `API_PORT`            | api              | Порт HTTP-сервера API. По умолчанию `3001`.                              |
| `CORS_ORIGIN`         | api, exchange WS | Origin фронта для CORS и WS (`http://localhost:3000` локально).          |
| `NODE_ENV`            | api              | `development` \| `production` \| `test`. По умолчанию `development`.     |
| `POSTGRES_USER`       | docker compose   | Имя пользователя PostgreSQL контейнера.                                  |
| `POSTGRES_PASSWORD`   | docker compose   | Пароль пользователя PostgreSQL.                                          |
| `POSTGRES_DB`         | docker compose   | Имя БД, создаваемой контейнером.                                         |
| `POSTGRES_PORT`       | docker compose   | Порт, на котором PostgreSQL слушает на хосте.                            |
| `NEXT_PUBLIC_API_URL` | web              | URL REST API, видимый из браузера.                                       |
| `NEXT_PUBLIC_WS_URL`  | web              | URL WebSocket-шлюза, видимый из браузера.                                |

## Health Check

`GET /api/health` — проверка живости и готовности сервиса.

Ответ:

```jsonc
{
  "status": "ok", // "ok" | "degraded"
  "timestamp": "2026-05-14T12:00:00.000Z", // ISO 8601
  "checks": {
    "database": "connected", // "connected" | "disconnected"
    "binance": "connected", // "connected" | "disconnected"
  },
}
```

`database` проверяется через `SELECT 1`, `binance` — через состояние upstream WebSocket к Binance combined-streams. Если хоть одна проверка `disconnected`, общий `status` — `degraded` и HTTP-код **503**, иначе **200**.

## Rate Limits

Глобально на каждый IP — **100 запросов в минуту**. На отдельных эндпоинтах действуют более строгие пер-роутовые лимиты:

| Эндпоинт                  | Лимит        |
| ------------------------- | ------------ |
| `POST /api/orders`        | 30 в минуту  |
| `POST /api/account/reset` | 5 в минуту   |
| Все остальные             | 100 в минуту |

При превышении сервер отвечает **429 Too Many Requests** (стандартное сообщение `@nestjs/throttler`).

## Быстрый старт

```bash
npm run setup
npm run dev
```

После `npm run dev` будут запущены API и Web одновременно.

## Доступные команды

### Инициализация

| Команда         | Описание                                                             |
| --------------- | -------------------------------------------------------------------- |
| `npm run setup` | Bootstrap в один шаг: копирование `.env`, установка зависимостей, БД |

### Разработка

| Команда              | Описание                                                             |
| -------------------- | -------------------------------------------------------------------- |
| `npm run dev`        | Запуск shared (watch), API и Web одновременно (через `concurrently`) |
| `npm run dev:shared` | Сборка `@exchange/shared` в watch-режиме                             |
| `npm run dev:api`    | Запуск только API в режиме разработки (с авто-ребилдом shared)       |
| `npm run dev:web`    | Запуск только Web в режиме разработки                                |

> Swagger UI живёт на API и доступен на `http://localhost:3001/api/docs` после `npm run dev` или `npm run dev:api`.

### Сборка и запуск

| Команда             | Описание                                                |
| ------------------- | ------------------------------------------------------- |
| `npm run build`     | Сборка всех workspaces (если у них есть скрипт `build`) |
| `npm run build:api` | Сборка только API                                       |
| `npm run build:web` | Сборка только Web                                       |
| `npm run start:api` | Запуск собранного API                                   |
| `npm run start:web` | Запуск собранного Web                                   |

### Качество кода

| Команда                | Описание                                        |
| ---------------------- | ----------------------------------------------- |
| `npm run lint`         | Линт по всем workspaces                         |
| `npm run test`         | Тесты по всем workspaces                        |
| `npm run format`       | Форматирование всего репозитория через Prettier |
| `npm run format:check` | Проверка форматирования без внесения изменений  |

### База данных

| Команда             | Описание                                          |
| ------------------- | ------------------------------------------------- |
| `npm run db:up`     | Запуск PostgreSQL (Docker Compose, в фоне)        |
| `npm run db:down`   | Остановка и удаление контейнера PostgreSQL        |
| `npm run db:logs`   | Просмотр логов PostgreSQL                         |
| `npm run db:push`   | Синхронизация Prisma-схемы с БД (workspace `api`) |
| `npm run db:seed`   | Заполнение торговых пар (idempotent upsert)       |
| `npm run db:studio` | Запуск Prisma Studio (workspace `api`)            |
