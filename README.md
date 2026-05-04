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
│   └── shared/                       # @exchange/shared — Zod-схемы + типы
│       ├── src/
│       │   ├── index.ts
│       │   └── schemas/
│       │       └── example.ts
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

## Быстрый старт

```bash
npm run setup
npm run dev
```

После `npm run dev` будут запущены API и Web одновременно.

## Доступные команды

### Инициализация

| Команда           | Описание                                                                |
| ----------------- | ----------------------------------------------------------------------- |
| `npm run setup`   | Bootstrap в один шаг: копирование `.env`, установка зависимостей, БД    |

### Разработка

| Команда             | Описание                                                  |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Запуск API и Web одновременно (через `concurrently`)      |
| `npm run dev:api`   | Запуск только API в режиме разработки                     |
| `npm run dev:web`   | Запуск только Web в режиме разработки                     |

### Сборка и запуск

| Команда               | Описание                                                |
| --------------------- | ------------------------------------------------------- |
| `npm run build`       | Сборка всех workspaces (если у них есть скрипт `build`) |
| `npm run build:api`   | Сборка только API                                       |
| `npm run build:web`   | Сборка только Web                                       |
| `npm run start:api`   | Запуск собранного API                                   |
| `npm run start:web`   | Запуск собранного Web                                   |

### Качество кода

| Команда                | Описание                                                |
| ---------------------- | ------------------------------------------------------- |
| `npm run lint`         | Линт по всем workspaces                                 |
| `npm run test`         | Тесты по всем workspaces                                |
| `npm run format`       | Форматирование всего репозитория через Prettier         |
| `npm run format:check` | Проверка форматирования без внесения изменений          |

### База данных

| Команда                | Описание                                                |
| ---------------------- | ------------------------------------------------------- |
| `npm run db:up`        | Запуск PostgreSQL (Docker Compose, в фоне)              |
| `npm run db:down`      | Остановка и удаление контейнера PostgreSQL              |
| `npm run db:logs`      | Просмотр логов PostgreSQL                               |
| `npm run db:migrate`   | Применение Prisma-миграций (через workspace `api`)      |
| `npm run db:studio`    | Запуск Prisma Studio (через workspace `api`)            |

