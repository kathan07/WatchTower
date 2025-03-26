FROM node:20-alpine AS base

FROM base AS builder
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune scheduler-service --docker

FROM base AS installer
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=builder /app/out . 
RUN npm ci --prefix json & npm i --prefix full && wait
RUN npx prisma generate --schema=full/packages/prisma-client/prisma/schema.prisma
RUN npm run build --prefix full

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nodejs
USER nodejs
COPY --from=installer /app .
CMD ["npm", "run", "start", "--prefix", "full/apps/scheduler-service"]
