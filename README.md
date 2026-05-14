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
│   └── web/                          # Приложение Next.js
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
- [Размещение ордеров](docs/orders.md) — `POST /api/orders` для MARKET-ордеров, цена с Binance, атомарное списание/зачисление в одной транзакции.
- [Realtime market data](docs/realtime.md) — `ws://localhost:3001/ws` стрим свечей и тикеров: один upstream к Binance combined-streams с фанаутом на N клиентов.

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
