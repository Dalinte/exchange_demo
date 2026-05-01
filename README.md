# Demo Exchange

A pet project: cryptocurrency exchange with paper trading, no registration.

## Tech stack

- Node.js 20+
- npm workspaces (monorepo)
- TypeScript
- NestJS (API — added by the user via `nest new`)
- Next.js (web — added by the user via `create-next-app`)
- Prisma
- PostgreSQL 18
- Zod (shared schemas / runtime validation)
- Docker Compose

## Project structure

```
demo-exchange/
├── apps/
│   ├── api/                          # NestJS app (scaffolded by the user)
│   └── web/                          # Next.js app (scaffolded by the user)
├── packages/
│   └── shared/                       # @exchange/shared — Zod schemas + types
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

## Quick start

```bash
git clone <repo>
cd demo-exchange
npm run setup
```

After setup completes:

1. Create the API: `cd apps && nest new api`
2. Create the Web: `cd apps && npx create-next-app@latest web`
3. Add `"apps/*"` to `"workspaces"` in `package.json`
4. Run `npm install` at the root again
5. Configure each app to import from `@exchange/shared`

## Available scripts

| Script                 | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `npm run setup`        | One-shot bootstrap: copy `.env`, install, start db |
| `npm run db:up`        | Start PostgreSQL (Docker Compose, detached)        |
| `npm run db:down`      | Stop and remove the PostgreSQL container           |
| `npm run db:logs`      | Tail PostgreSQL logs                               |
| `npm run format`       | Prettier-format the entire repo                    |
| `npm run format:check` | Check formatting without writing changes           |

## Status

Skeleton phase: monorepo wrapper ready, applications not yet scaffolded.
