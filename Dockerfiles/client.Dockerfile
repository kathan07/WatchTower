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
RUN turbo prune client --docker

FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
RUN npm ci
# Copy full source code for the pruned workspace
COPY --from=builder /app/out/full/ .
# Build the project
RUN npx turbo run build

FROM base AS runner
WORKDIR /app
# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeuser

# Copy package.json files and built files
COPY --from=installer --chown=nodeuser:nodejs /app/apps/client/dist ./dist
COPY --from=installer --chown=nodeuser:nodejs /app/apps/client/package.json .

# Copy the entire node_modules including workspace packages
COPY --from=installer --chown=nodeuser:nodejs /app/node_modules ./node_modules

USER nodeuser

ENV PORT=5173
EXPOSE 5173
CMD ["npm", "run", "preview"]
