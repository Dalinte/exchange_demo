# pages/

Эта папка намеренно пустая. Она существует, чтобы Next.js считал именно её
корнем Pages Router (хоть и неиспользуемым) и не путал FSD-слой
`src/pages/` с роутинговой папкой.

Все маршруты приложения живут в `apps/web/app/` (App Router). FSD-страницы
(`TradeTerminal` и т.п.) — в `apps/web/src/pages/`.
