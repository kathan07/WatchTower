# WatchTower 🚀

A comprehensive **website monitoring and alerting system** built with modern TypeScript microservices. WatchTower continuously monitors your websites' health, sends intelligent alerts when issues are detected, and provides detailed analytics about uptime and performance.

## 🌟 Features

- **Real-time Website Monitoring** - Continuous health checks for multiple websites with configurable intervals
- **Smart Alert System** - Intelligent alerts with cooldown periods to prevent alert fatigue and notification spam
- **Email Notifications** - Automated email alerts when downtime or performance degradation is detected
- **Analytics Engine** - Comprehensive metrics tracking at daily, monthly, and yearly intervals
- **Performance Tracking** - Response time analysis and uptime statistics with detailed breakdowns
- **Multi-tenant Support** - Monitor multiple websites per user with granular control and isolation
- **Scalable Architecture** - Built with microservices using Turborepo monorepo structure for independent scaling
- **Docker Support** - Easy deployment with Docker containerization for production environments
- **Caching Layer** - Redis-backed caching for optimal performance and reduced database load

## 📋 Architecture Overview

WatchTower is built as a **monorepo using [Turborepo](https://turbo.build/)** enabling:
- Independent service development and deployment
- Shared code across services with `@repo/*` packages
- Optimized build pipelines with task orchestration
- Scalable microservices pattern

### Core Services

| Service | Path | Role |
|---------|------|------|
| **API server** | `apps/server` | Auth, dashboard, Stripe subscriptions (Express) |
| **Client** | `apps/client` | React + Vite dashboard (proxies `/api` to the server) |
| **Scheduler** | `apps/scheduler-service` | Enqueues monitoring jobs for active websites |
| **Monitoring** | `apps/monitoring-service` | Runs health checks from the Redis/BullMQ queue |
| **Alerting** | `apps/alerting-service` | Cron: evaluate recent logs, email on downtime |
| **Analysis** | `apps/analysis-service` | Cron: daily / monthly / yearly analytics |
| **Cleaning** | `apps/cleaning-service` | Cron: prune old logs and related data |

Workers keep cron/queue wiring in `index.ts` and business logic in `processor.ts`. The API uses controllers → services → `@repo/prisma`, with auth/subscription checks in `middleware/`.

#### 🔔 **Alerting Service** (`apps/alerting-service`)

- Analyzes logs from the past 15 minutes on a one-minute cron
- Triggers alerts when ≥80% of logs are DOWN or DEGRADED
- 30-minute Redis cooldown per website to avoid alert storms
- SMTP email via Nodemailer

**Alert Flow:**
```
Every Minute → Fetch logs (last 15 min) → Analyze status → Check cooldown → Send email → Update cooldown
```

#### 📊 **Analysis Service** (`apps/analysis-service`)

- Daily analytics at 23:59:59 UTC; monthly on last day; yearly on Dec 31
- Metrics: average response time, uptime / downtime / degradation percentages
- Concurrent website batching for efficiency

**Analytics Pipeline:**
```
Scheduled Time → Fetch period logs → Calculate metrics → Store analytics
```

### Shared Packages

- **`@repo/shared`** (`packages/shared`) — API route constants, plan data, shared TypeScript types (auth, dashboard, monitoring, subscription)
- **`@repo/prisma`** (`packages/prisma-client`) — Prisma schema, migrations, and domain query modules (`user`, `website`, `log`, `alert`, `analytics`, `subscription`)
- **`@repo/redis`** (`packages/redis-client`) — Redis client, BullMQ monitoring queue, cache/cooldown helpers (`REDIS_URL`)
- **`@repo/typescript-config`** / **`@repo/eslint-config`** / **`@repo/ui`** — shared TS, lint, and UI primitives

## 🛠 Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Language** | TypeScript | 5.7.3+ |
| **Runtime** | Node.js | 18+ |
| **Package Manager** | npm | 10.9.0+ |
| **Monorepo Tool** | Turborepo | 2.4.4+ |
| **Database** | PostgreSQL | 12+ (via Prisma) |
| **ORM** | Prisma | Latest |
| **Caching** | Redis | 6+ |
| **Email** | Nodemailer | 6.10.0+ |
| **Job Scheduling** | node-cron | 3.5.0+ |
| **Date Utilities** | date-fns | 4.1.0+ |
| **Containerization** | Docker | Latest |
| **Code Quality** | ESLint + Prettier | Latest |

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18
- **npm** 10.9+
- **PostgreSQL** 12+
- **Redis** 6+

### Local setup (full steps)

Copy `.env.example`, install, migrate, build shared packages, and start each app — see **[LOCAL_SETUP.md](./LOCAL_SETUP.md)**.

Quick outline:

```bash
git clone https://github.com/kathan07/WatchTower.git
cd WatchTower
npm install
cp .env.example packages/prisma-client/.env
# …copy into apps/server, apps/client, and each worker (see LOCAL_SETUP.md)

npm run generate -w @repo/prisma
npx prisma migrate deploy --schema packages/prisma-client/prisma/schema.prisma
npm run build -w @repo/shared && npm run build -w @repo/prisma && npm run build -w @repo/redis

# Source env in each terminal (except client), then:
npm run dev -w server          # http://localhost:3000
npm run dev -w client          # http://localhost:5173
npm run dev -w scheduler-service
npm run dev -w monitoring-service
npm run dev -w alerting-service
npm run dev -w analysis-service
npm run dev -w cleaning-service
```

`dotenv` reads `.env` from each process cwd (not the repo root). Prisma CLI reads `packages/prisma-client/.env`. Use `REDIS_URL` (not host/port split). Never commit real secrets — only `.env.example` is tracked.

### Common scripts

```bash
npm run dev      # turbo: all workspace `dev` scripts
npm run build    # turbo: compile packages and apps
npm run lint     # turbo lint
npm run format   # Prettier across ts/tsx/md
```

## 📦 Project Structure

```
WatchTower/
├── apps/
│   ├── server/                 # Express API (controllers, services, middleware)
│   ├── client/                 # React + Vite UI
│   ├── scheduler-service/      # Enqueue monitoring jobs
│   ├── monitoring-service/     # Consume queue, probe websites
│   ├── alerting-service/       # Cron alerts + email (index + processor)
│   ├── analysis-service/       # Cron analytics aggregation
│   └── cleaning-service/       # Cron log cleanup
├── packages/
│   ├── shared/                 # @repo/shared — routes, plans, types
│   ├── prisma-client/          # @repo/prisma — schema + query modules
│   ├── redis-client/           # @repo/redis — Redis + BullMQ
│   ├── ui/                     # Shared React UI primitives
│   ├── typescript-config/
│   └── eslint-config/
├── Dockerfiles/                # Per-service Dockerfiles
├── .env.example                # Sample env (copy per LOCAL_SETUP.md)
├── LOCAL_SETUP.md              # Local install / migrate / run
├── package.json
├── turbo.json
└── README.md
```

## 🐳 Docker Deployment

### Build Docker Images

```bash
docker build -f Dockerfiles/server.Dockerfile -t watchtower-server:latest .
docker build -f Dockerfiles/client.Dockerfile -t watchtower-client:latest .
docker build -f Dockerfiles/alerting-service.Dockerfile -t watchtower-alerting:latest .
# …same pattern for analysis, cleaning, monitoring, scheduler
```

### Run (env)

Pass `DATABASE_URL`, `REDIS_URL`, and service-specific secrets from `.env.example`. Do not bake secrets into images.

## 📊 Monitoring Metrics

### Alert Thresholds & Behavior

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Check Interval** | 1 minute | How often the alerting service evaluates conditions |
| **Log Window** | 15 minutes | Time period of logs analyzed for each check |
| **Alert Threshold** | ≥80% | Percentage of DOWN/DEGRADED logs to trigger alert |
| **Alert Cooldown** | 30 minutes | Minimum time between alerts for same website |
| **Notification Method** | Email | Via SMTP |

### Website Status Categories

| Status | Color | Meaning | Action |
|--------|-------|---------|--------|
| **UP** | 🟢 Green | Website is healthy and responding normally | Continue monitoring |
| **DEGRADED** | 🟡 Yellow | Website is responding but with performance issues | Monitor closely, may trigger alert |
| **DOWN** | 🔴 Red | Website is unreachable or not responding | Immediate alert |

### Analytics Periods & Schedules

| Period | Trigger | Timezone | Example |
|--------|---------|----------|---------|
| **Daily** | 23:59:59 each day | UTC | Every night at midnight |
| **Monthly** | Last day of month, 00:00 | UTC | Jan 31, Feb 28/29, etc. |
| **Yearly** | December 31st, 00:00 | UTC | Once per year |

### Calculated Metrics per Period

```typescript
{
  averageResponseTime: number;        // milliseconds
  uptimePercentage: number;            // 0-100
  downtimePercentage: number;          // 0-100
  degradationPercentage: number;       // 0-100
  totalCheckCount: number;             // for that period
  upCount: number;
  downCount: number;
  degradedCount: number;
}
```

## 🔧 Configuration & Customization

### Environment Variable Reference

Canonical list lives in [`.env.example`](./.env.example). Copy it into each app cwd (see [LOCAL_SETUP.md](./LOCAL_SETUP.md)).

| Variable | Used by | Notes |
|----------|---------|-------|
| `DATABASE_URL` | Prisma / all DB-backed apps | PostgreSQL connection string |
| `REDIS_URL` | `@repo/redis`, workers | Default `redis://localhost:6379` |
| `PORT` | `apps/server` | Default `3000` |
| `JWT_SECRET` | API auth | Long random string |
| `STRIPE_API_KEY` / `STRIPE_WEBHOOK_SECRET` | Server subscriptions | Test keys for local |
| `SERVER_URL_LOCAL` | Vite client proxy | API origin, e.g. `http://localhost:3000` |
| `SMTP_*` | Alerting service | Optional if not testing email |

Alert cooldown and thresholds are constants in code (`@repo/redis` / alerting `processor`), not env toggles.

## 🧪 Testing

### Run Test Suite

```bash
npm run test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests for Specific Service

```bash
npm run test -w alerting-service
npm run test -w analysis-service
```

### Run Tests in Watch Mode

```bash
npm run test -- --watch
```

## 📝 NPM Scripts Reference

| Command | Scope | Description |
|---------|-------|-------------|
| `npm run dev` | All | Start all services in development mode with hot reload |
| `npm run build` | All | Compile all services to production-ready code |
| `npm run lint` | All | Check all code for style and quality issues |
| `npm run format` | All | Auto-format all code files |
| `npm run test` | All | Run test suite across all services |
| `npm run test:coverage` | All | Generate test coverage reports |

### Service-Specific Scripts

Prefer workspace flags from the repo root:

```bash
npm run dev -w server
npm run dev -w client
npm run dev -w alerting-service
npm run dev -w analysis-service
npm run dev -w cleaning-service
npm run dev -w monitoring-service
npm run dev -w scheduler-service

npm run build -w @repo/shared
npm run build -w @repo/prisma
npm run build -w @repo/redis
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### 1. Fork the Repository

Click the "Fork" button on GitHub to create your own copy.

### 2. Create a Feature Branch

```bash
git checkout -b feature/amazing-feature
```

Branch naming conventions:
- `feature/` - New features
- `bugfix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions

### 3. Make Your Changes

- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed
- Ensure linting passes: `npm run lint`
- Format your code: `npm run format`

### 4. Commit Your Changes

```bash
git commit -m "Add amazing feature"
```

Use clear, descriptive commit messages.

### 5. Push to Your Fork

```bash
git push origin feature/amazing-feature
```

### 6. Open a Pull Request

Create a PR with:
- Clear description of changes
- Link to related issues
- Screenshots (if UI changes)
- Test results

## 📄 License

This project is licensed under the **ISC License** - see the LICENSE file for details.

## 🆘 Support & Resources

### Get Help

- **[Open an Issue](https://github.com/kathan07/WatchTower/issues)** - Report bugs or request features
- **[Start a Discussion](https://github.com/kathan07/WatchTower/discussions)** - Ask questions and share ideas
- **[Documentation](https://github.com/kathan07/WatchTower/wiki)** - Detailed guides and examples

### Related Projects

- [Turborepo Documentation](https://turbo.build/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Redis Documentation](https://redis.io/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)

## 🎯 Roadmap

### Planned Features

- [x] **Web Dashboard** - Client app with analytics and website management
- [x] **REST API** - Auth, dashboard, and subscription endpoints
- [x] **Stripe checkout / webhooks** - Subscription plans
- [ ] **Multiple Alert Channels** - Slack, PagerDuty, Discord, SMS
- [ ] **Custom Alert Rules** - User-defined conditions and thresholds
- [ ] **Multi-region Monitoring** - Distributed health checks
- [ ] **Public Status Pages** - Auto-generated status pages

## 🙏 Acknowledgments

- **[Turborepo](https://turbo.build/)** - Amazing monorepo management tool
- **[Prisma](https://www.prisma.io/)** - Type-safe database ORM
- **[Node.js](https://nodejs.org/)** - JavaScript runtime
- **Open Source Community** - Thanks for the excellent libraries and tools
- **Contributors** - Thanks to everyone who contributes to this project

## 📊 Project Stats

![Language Composition](https://img.shields.io/static/v1?label=TypeScript&message=89.2%&color=3178c6)
![Language Composition](https://img.shields.io/static/v1?label=Docker&message=7.8%&color=2496ed)
![Language Composition](https://img.shields.io/static/v1?label=JavaScript&message=1.9%&color=f7df1e)

---

**Made with ❤️ by [kathan07](https://github.com/kathan07)**

**Star the repository if you find it helpful! ⭐**
