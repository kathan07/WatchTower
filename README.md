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

#### 🔔 **Alerting Service** (`apps/alerting-service`)

The alerting service monitors website health and sends notifications:

**Key Responsibilities:**
- Executes health checks every minute via cron jobs
- Analyzes logs from the past 15 minutes to determine status
- Triggers alerts when ≥80% of logs indicate DOWN or DEGRADED status
- Implements 30-minute cooldown periods between alerts for the same website
- Sends formatted email notifications with detailed status information
- Prevents alert fatigue through intelligent deduplication

**Technical Stack:**
- **Database ORM**: Prisma for type-safe database queries
- **Caching**: Redis for fast state management and cooldown tracking
- **Email Service**: Nodemailer for SMTP-based notifications
- **Scheduling**: node-cron for reliable background job execution

**Alert Flow:**
```
Every Minute → Fetch logs (last 15 min) → Analyze status → Check cooldown → Send email → Update cooldown
```

#### 📊 **Analysis Service** (`apps/analysis-service`)

Processes analytics and generates time-based insights:

**Key Responsibilities:**
- Calculates daily analytics at 23:59:59 UTC each day
- Processes monthly analytics on the last day of each month
- Generates yearly analytics on December 31st
- Handles 5 websites concurrently for efficiency
- Stores aggregated metrics for trend analysis

**Calculated Metrics:**
- **Average Response Time** - Mean HTTP response time
- **Uptime Percentage** - % of time website was UP
- **Downtime Percentage** - % of time website was DOWN
- **Degradation Percentage** - % of time website was DEGRADED

**Technical Stack:**
- **Database ORM**: Prisma for analytics data persistence
- **Scheduling**: node-cron for time-based triggers
- **Utilities**: date-fns for date calculations and timezone handling

**Analytics Pipeline:**
```
Scheduled Time → Fetch period logs → Calculate metrics → Store analytics → Cleanup old data
```

### Shared Packages

- **`@repo/prisma`** - Centralized database schema and ORM models
  - Defines all data models for websites, logs, alerts, and analytics
  - Manages database migrations
  - Provides type-safe query builders

- **`@repo/redis`** - Redis client configuration and utilities
  - Manages Redis connections
  - Provides helper functions for caching
  - Handles connection pooling

- **`@repo/typescript-config`** - Shared TypeScript configurations
  - Base tsconfig.json for all services
  - Consistent compilation settings across monorepo

- **`@repo/eslint-config`** - Shared ESLint configurations
  - Unified code quality standards
  - Consistent linting rules across all services

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

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **npm** >= 10.9.0 (usually included with Node.js)
- **PostgreSQL** >= 12 ([Download](https://www.postgresql.org/download/))
- **Redis** >= 6.0 ([Download](https://redis.io/download/))
- **Git** (for cloning the repository)

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/kathan07/WatchTower.git
cd WatchTower
```

#### 2. Install Dependencies

```bash
npm install
```

This command installs all dependencies for the root workspace and all services.

#### 3. Set Up Environment Variables

Create `.env.local` files in each service directory:

**Root level `.env.local` (optional for shared config):**
```env
# General
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/watchtower_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

**`apps/alerting-service/.env.local`:**
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/watchtower_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# SMTP Configuration (Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=WatchTower <alerts@watchtower.io>

# Alert Configuration
ALERT_COOLDOWN_MINUTES=30
LOG_ANALYSIS_MINUTES=15
ALERT_THRESHOLD_PERCENTAGE=80
```

**`apps/analysis-service/.env.local`:**
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/watchtower_dev

# Analysis Configuration
CONCURRENT_WEBSITE_LIMIT=5
```

#### 4. Set Up the Database

Initialize the PostgreSQL database and run migrations:

```bash
# Navigate to prisma package
cd packages/prisma

# Run migrations to create tables
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# (Optional) Seed the database with sample data
npx prisma db seed
```

#### 5. Start PostgreSQL and Redis

**Using Docker (Recommended):**
```bash
# PostgreSQL
docker run --name watchtower-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16

# Redis
docker run --name watchtower-redis -p 6379:6379 -d redis:latest
```

**Or use local installations** if you prefer.

### Development

#### Start All Services in Development Mode

```bash
npm run dev
```

This command uses Turborepo to start both the alerting and analysis services with hot-reload enabled.

**Expected Output:**
```
✓ Packages in scope: alerting-service, analysis-service
✓ Running dev in 2 packages
alerting-service: listening on port 3001
analysis-service: listening on port 3002
```

#### Build All Services

```bash
npm run build
```

Compiles TypeScript and outputs to `dist/` directories in each service.

#### Run Linting

```bash
npm run lint
```

Checks all code for style violations and potential issues.

#### Format Code

```bash
npm run format
```

Automatically formats code using Prettier (TypeScript, JSX, Markdown).

#### Run Tests (when implemented)

```bash
npm run test
```

## 📦 Project Structure

```
WatchTower/
├── apps/                                   # Microservices
│   ├── alerting-service/                  # Real-time alert detection & email service
│   │   ├── src/
│   │   │   └── index.ts                   # Main entry point with cron jobs
│   │   ├── dist/                          # Compiled output
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── nodemon.json
│   │
│   └── analysis-service/                  # Analytics processing service
│       ├── src/
│       │   └── index.ts                   # Main entry point with scheduled jobs
│       ├── dist/                          # Compiled output
│       ├── package.json
│       ├── tsconfig.json
│       └── nodemon.json
│
├── packages/                               # Shared code
│   ├── prisma/                            # Database schema & ORM
│   │   ├── schema.prisma                  # Prisma schema definition
│   │   ├── migrations/                    # Database migrations
│   │   └── package.json
│   │
│   ├── redis/                             # Redis client & utilities
│   │   ├── src/
│   │   │   └── client.ts
│   │   └── package.json
│   │
│   ├── typescript-config/                 # Shared TypeScript configs
│   │   └── tsconfig.json
│   │
│   └── eslint-config/                     # Shared ESLint configs
│       └── index.js
│
├── Dockerfiles/                            # Container configurations
│   ├── alerting-service.dockerfile
│   ├── analysis-service.dockerfile
│   └── docker-compose.yml                 # Multi-container setup
│
├── .github/                                # GitHub Actions workflows
│   └── workflows/
│
├── package.json                            # Root workspace config
├── turbo.json                              # Turborepo pipeline definition
├── tsconfig.json                           # Base TypeScript config
├── .eslintrc.js                            # ESLint configuration
├── .prettierrc.json                        # Prettier configuration
└── README.md                               # This file
```

## 🐳 Docker Deployment

### Build Docker Images

```bash
# Build alerting service
docker build -f Dockerfiles/alerting-service.dockerfile -t watchtower-alerting:latest .

# Build analysis service
docker build -f Dockerfiles/analysis-service.dockerfile -t watchtower-analysis:latest .

# Or build both with docker-compose
docker-compose -f Dockerfiles/docker-compose.yml build
```

### Run Individual Containers

```bash
# Run alerting service
docker run -d \
  --name watchtower-alerting \
  --env-file .env.local \
  -e DATABASE_URL=postgresql://postgres:postgres@postgres-db:5432/watchtower \
  -e REDIS_HOST=redis-cache \
  --network watchtower-network \
  watchtower-alerting:latest

# Run analysis service
docker run -d \
  --name watchtower-analysis \
  --env-file .env.local \
  -e DATABASE_URL=postgresql://postgres:postgres@postgres-db:5432/watchtower \
  --network watchtower-network \
  watchtower-analysis:latest
```

### Docker Compose (Recommended)

```bash
# Start all services
docker-compose -f Dockerfiles/docker-compose.yml up -d

# View logs
docker-compose -f Dockerfiles/docker-compose.yml logs -f

# Stop services
docker-compose -f Dockerfiles/docker-compose.yml down
```

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

#### Alerting Service Configuration

```env
# Database Connection
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis Connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Email/SMTP Configuration
SMTP_HOST=smtp.gmail.com              # SMTP server hostname
SMTP_PORT=587                         # Usually 587 (TLS) or 465 (SSL)
SMTP_SECURE=false                     # true for port 465, false for others
SMTP_USER=your-email@gmail.com        # Email address for authentication
SMTP_PASS=app-specific-password       # App password (not regular password)
SMTP_FROM=WatchTower <alerts@watchtower.io>  # From address in emails

# Alert Behavior
ALERT_COOLDOWN_MINUTES=30             # Minutes between alerts for same site
LOG_ANALYSIS_MINUTES=15               # Minutes of logs to analyze
ALERT_THRESHOLD_PERCENTAGE=80         # Threshold for triggering alerts
```

#### Analysis Service Configuration

```env
# Database Connection
DATABASE_URL=postgresql://user:password@host:5432/database

# Processing
CONCURRENT_WEBSITE_LIMIT=5            # Max concurrent analytics processing
BATCH_SIZE=10                         # Batch size for bulk operations
```

### Modifying Alert Thresholds

Edit the alerting service configuration and restart:

```env
ALERT_THRESHOLD_PERCENTAGE=85         # Increase from 80% to 85%
LOG_ANALYSIS_MINUTES=20               # Increase window from 15 to 20 minutes
ALERT_COOLDOWN_MINUTES=60             # Increase cooldown from 30 to 60 minutes
```

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

```bash
# Alerting Service
cd apps/alerting-service
npm run dev          # Start with hot reload
npm run build        # Compile TypeScript
npm start            # Run compiled code

# Analysis Service
cd apps/analysis-service
npm run dev          # Start with hot reload
npm run build        # Compile TypeScript
npm start            # Run compiled code
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

- [ ] **Web Dashboard** - Real-time monitoring visualization
- [ ] **REST API** - Programmatic access to monitoring data
- [ ] **Multiple Alert Channels** - Slack, PagerDuty, Discord, SMS integration
- [ ] **Custom Alert Rules** - User-defined conditions and thresholds
- [ ] **Advanced Analytics** - Trend analysis and predictions
- [ ] **Multi-region Monitoring** - Distributed health checks
- [ ] **Status Page Generation** - Auto-generated public status pages
- [ ] **APM Integration** - DataDog, New Relic, AppDynamics support
- [ ] **Webhook Support** - Custom HTTP callbacks for events
- [ ] **Performance Insights** - Detailed performance analytics

### Version Roadmap

| Version | Focus | ETA |
|---------|-------|-----|
| **1.0.0** | Core monitoring & alerting | ✅ Released |
| **1.1.0** | REST API & webhooks | Q3 2026 |
| **2.0.0** | Web dashboard | Q4 2026 |
| **2.1.0** | Multi-channel alerts | Q1 2027 |

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
