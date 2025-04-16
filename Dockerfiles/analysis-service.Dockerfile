FROM node:20-alpine AS base

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
# Set working directory
WORKDIR /app
# Install turbo globally
RUN npm install turbo --global
COPY . .
# Generate a partial monorepo with a pruned lockfile for the target workspace
RUN turbo prune analysis-service --docker

FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
RUN npm ci
# Copy full source code for the pruned workspace
COPY --from=builder /app/out/full/ .
# Generate Prisma client before building
RUN npx prisma generate --schema=./packages/prisma-client/prisma/schema.prisma
# Build the project
RUN npx turbo run build

FROM base AS runner
WORKDIR /app
# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeuser

# Copy package.json files and built files
COPY --from=installer --chown=nodeuser:nodejs /app/apps/analysis-service/dist ./dist
COPY --from=installer --chown=nodeuser:nodejs /app/apps/analysis-service/package.json .

# Copy the entire node_modules including workspace packages
COPY --from=installer --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copy the built prisma client package
COPY --from=installer --chown=nodeuser:nodejs /app/packages/prisma-client ./node_modules/@repo/prisma

# Copy Prisma schema and generated client to ensure it's available at runtime
# COPY --from=installer --chown=nodeuser:nodejs /app/packages/prisma-client/prisma ./prisma
# COPY --from=installer --chown=nodeuser:nodejs /app/node_modules/.prisma ./node_modules/.prisma

USER nodeuser


CMD ["npm", "run", "start"]