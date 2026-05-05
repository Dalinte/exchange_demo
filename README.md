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
│       │   └── schemas/              # common, trading-pair, balance, order, trade, account, ws-messages
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

| Команда           | Описание                                             |
| ----------------- | ---------------------------------------------------- |
| `npm run dev`        | Запуск shared (watch), API и Web одновременно (через `concurrently`) |
| `npm run dev:shared` | Сборка `@exchange/shared` в watch-режиме                          |
| `npm run dev:api`    | Запуск только API в режиме разработки (с авто-ребилдом shared)    |
| `npm run dev:web`    | Запуск только Web в режиме разработки                              |

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
