# WatchTower 🚀

A comprehensive **website monitoring and alerting system** built with modern TypeScript microservices. WatchTower continuously monitors your websites' health, sends intelligent alerts when issues are detected, and provides detailed analytics on uptime and performance.

## 🌟 Features

- **Real-time Website Monitoring** - Continuous health checks for multiple websites
- **Smart Alert System** - Intelligent alerts with cooldown periods to prevent alert fatigue
- **Email Notifications** - Automated email alerts when downtime or performance degradation is detected
- **Analytics Engine** - Comprehensive metrics tracking (daily, monthly, yearly)
- **Performance Tracking** - Response time analysis and uptime statistics
- **Multi-tenant Support** - Monitor multiple websites per user with granular control
- **Scalable Architecture** - Built with microservices using Turborepo monorepo structure
- **Docker Support** - Easy deployment with Docker containerization

## 📋 Architecture

WatchTower is built as a monorepo using [Turborepo](https://turbo.build/) with the following services:

### Core Services

#### 🔔 Alerting Service (`apps/alerting-service`)
Monitors website health and sends alerts:
- Checks alert conditions every minute
- Analyzes logs from the past 15 minutes
- Triggers alerts when ≥80% of logs indicate downtime or degradation
- Implements cooldown periods (30 minutes) to prevent alert fatigue
- Sends email notifications with detailed status information
- Uses cron jobs for scheduled execution
- **Dependencies**: Prisma (database), Redis (caching), Nodemailer (email)

#### 📊 Analysis Service (`apps/analysis-service`)
Processes analytics and generates insights:
- Runs daily analytics at 23:59:59
- Runs monthly analytics on the last day of each month
- Runs yearly analytics on December 31st
- Calculates metrics:
  - Average response time
  - Uptime percentage
  - Downtime percentage
  - Performance degradation percentage
- Processes 5 websites concurrently for efficiency
- **Dependencies**: Prisma (database)

### Shared Packages

- `@repo/prisma` - Database schema and ORM models
- `@repo/redis` - Redis client and configuration
- `@repo/typescript-config` - Shared TypeScript configurations
- `@repo/eslint-config` - Shared ESLint configurations

## 🛠 Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Language** | TypeScript (89.2%) |
| **Runtime** | Node.js 18+ |
| **Package Manager** | npm 10.9.0 |
| **Monorepo Tool** | Turborepo 2.4+ |
| **Database** | PostgreSQL (with Prisma ORM) |
| **Caching** | Redis |
| **Email** | Nodemailer |
| **Scheduling** | Cron (node-cron) |
| **Date Utilities** | date-fns |
| **Containerization** | Docker |
| **Code Quality** | ESLint, Prettier, TypeScript |

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 10.9.0
- **PostgreSQL** (for database)
- **Redis** (for caching and rate limiting)
- **SMTP Server** (for email notifications)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kathan07/WatchTower.git
   cd WatchTower
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   
   Create `.env.local` files in each service directory with the required configuration:
   
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/watchtower
   
   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   
   # SMTP (Email)
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@example.com
   SMTP_PASS=your-password
   SMTP_FROM=alerts@watchtower.io
   ```

4. **Set up the database:**
   ```bash
   cd packages/prisma
   npx prisma migrate deploy
   npx prisma generate
   ```

### Development

**Start all services in development mode:**
```bash
npm run dev
```

**Build all services:**
```bash
npm run build
```

**Run linting:**
```bash
npm run lint
```

**Format code:**
```bash
npm run format
```

## 📦 Project Structure

```
WatchTower/
├── apps/
│   ├── alerting-service/        # Alert detection and email service
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   └── analysis-service/        # Analytics processing service
│       ├── src/
│       │   └── index.ts
│       └── package.json
├── packages/
│   ├── prisma/                  # Database schema and ORM
│   ├── redis/                   # Redis configuration
│   ├── typescript-config/       # Shared TS config
│   └── eslint-config/           # Shared ESLint config
├── Dockerfiles/                 # Docker configurations
├── package.json                 # Root workspace config
├── turbo.json                   # Turborepo configuration
└── README.md
```

## 🐳 Docker Deployment

Build and run WatchTower using Docker:

```bash
# Build Docker images
docker build -f Dockerfiles/alerting-service.dockerfile -t watchtower-alerting .
docker build -f Dockerfiles/analysis-service.dockerfile -t watchtower-analysis .

# Run containers
docker run -d \
  --name watchtower-alerting \
  --env-file .env.local \
  watchtower-alerting

docker run -d \
  --name watchtower-analysis \
  --env-file .env.local \
  watchtower-analysis
```

## 📊 Monitoring Metrics

### Alert Thresholds

- **Alert Trigger**: When ≥80% of logs in the last 15 minutes indicate DOWN or DEGRADED status
- **Alert Cooldown**: 30 minutes between alerts for the same website to prevent fatigue
- **Status Categories**:
  - `UP` - Website is healthy and responding normally
  - `DEGRADED` - Website is responding but with performance issues
  - `DOWN` - Website is unreachable or not responding

### Analytics Periods

- **Daily** - Calculated at 23:59:59 each day
- **Monthly** - Calculated on the last day of each month
- **Yearly** - Calculated on December 31st

Metrics tracked:
- Average response time
- Uptime percentage
- Downtime percentage
- Performance degradation percentage

## 🔧 Configuration

### Environment Variables

**Alerting Service:**
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port (default: 587)
- `SMTP_SECURE` - Use TLS (default: false)
- `SMTP_USER` - SMTP authentication username
- `SMTP_PASS` - SMTP authentication password
- `SMTP_FROM` - From email address for alerts
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_*` - Redis connection details

**Analysis Service:**
- `DATABASE_URL` - PostgreSQL connection string

## 🧪 Testing

Run the test suite:
```bash
npm run test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services in development mode |
| `npm run build` | Build all services |
| `npm run lint` | Run ESLint on all packages |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run test suite |

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🆘 Support

For issues, questions, or suggestions:
- [Open an Issue](https://github.com/kathan07/WatchTower/issues)
- [Start a Discussion](https://github.com/kathan07/WatchTower/discussions)

## 🎯 Roadmap

- [ ] Web dashboard for monitoring
- [ ] REST API for programmatic access
- [ ] Multiple alert channels (Slack, PagerDuty, Discord)
- [ ] Custom alert rules and conditions
- [ ] Performance analytics and trend analysis
- [ ] Multi-region monitoring
- [ ] API status page generation
- [ ] Integration with popular APM tools

## 🙏 Acknowledgments

- Built with [Turborepo](https://turbo.build/) for monorepo management
- Monitoring logic inspired by industry best practices
- Thanks to the open-source community for excellent libraries

---

**Made with ❤️ by [kathan07](https://github.com/kathan07)**
