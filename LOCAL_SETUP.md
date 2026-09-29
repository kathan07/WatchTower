# Local setup

These steps prepare WatchTower so you can start it yourself. Nothing here starts the processes for you.

Requires Node.js >= 18, npm 10.9, PostgreSQL, and Redis.

## 1. Install

From the repo root:

```bash
npm install
```

## 2. Environment files

`dotenv` and Vite read `.env` from the process working directory, not from the repo root. Prisma CLI reads `packages/prisma-client/.env`. Copy the sample into each of these paths (same contents is fine):

```bash
cp .env.example packages/prisma-client/.env
cp .env.example apps/server/.env
cp .env.example apps/client/.env
cp .env.example apps/alerting-service/.env
cp .env.example apps/analysis-service/.env
cp .env.example apps/cleaning-service/.env
cp .env.example apps/monitoring-service/.env
cp .env.example apps/scheduler-service/.env
```

Edit `DATABASE_URL`, `JWT_SECRET`, and the Stripe values. `.env` is gitignored.

Workers import `@repo/prisma` before `dotenv.config()` runs, so Prisma Client is constructed without those files unless the variables are already in the shell. Load them before every `npm run dev` terminal:

```bash
set -a
source apps/server/.env
set +a
```

Use that same sourced shell for the API and every worker. The client does not need the source step; Vite loads `apps/client/.env` on its own.

## 3. Database and Redis

Create the database named in `DATABASE_URL` (sample uses `watchtower_dev`), and start Redis on `REDIS_URL` (sample uses `localhost:6379`).

Apply migrations and generate the client from the Prisma package:

```bash
npm run generate -w @repo/prisma
npx prisma migrate deploy --schema packages/prisma-client/prisma/schema.prisma
```

`migrate deploy` uses `DATABASE_URL` from the environment or from `packages/prisma-client/.env`.

## 4. Build shared libraries

Dev scripts run TypeScript against the built packages (`dist/`), not the source.

```bash
npm run build -w @repo/shared
npm run build -w @repo/prisma
npm run build -w @repo/redis
```

## 5. Start (separate terminals)

Source the env file in each terminal first (step 2), except the client.

```bash
npm run dev -w server
npm run dev -w client
npm run dev -w alerting-service
npm run dev -w analysis-service
npm run dev -w cleaning-service
npm run dev -w monitoring-service
npm run dev -w scheduler-service
```

- API: `http://localhost:3000` (`PORT`)
- Client: `http://localhost:5173` (proxies `/api` to `SERVER_URL_LOCAL`)

### Health / ready probes

- API (on `PORT`): `GET /health` (always 200), `GET /ready` (200 if Postgres+Redis up, else 503)
- Workers listen on `HEALTH_PORT` (or defaults below) for the same paths:
  - monitoring-service `3011`
  - scheduler-service `3012`
  - alerting-service `3013`
  - analysis-service `3014` (Postgres only)
  - cleaning-service `3015` (Postgres only)

Example: `curl -s http://localhost:3011/ready`

Alerting, analysis, and cleaning only do work on their cron schedules. Monitoring does work only after the scheduler enqueues jobs and Redis is up.

Stripe checkout needs `STRIPE_API_KEY` on the server. The browser publishable key is still hardcoded in `apps/client/src/pages/Plans.tsx`. Webhooks need `STRIPE_WEBHOOK_SECRET` and a tunnel to `POST /api/subscribe/stripe/webhook`.
