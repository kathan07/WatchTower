FROM node:20-alpine AS base
FROM base AS builder
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune client --docker

FROM base AS installer
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=builder /app/out .
RUN npm ci --prefix json && npm i --prefix full
RUN npm run build --prefix full

FROM base AS runner
WORKDIR /app
COPY --from=installer /app .
ENV PORT=5173
EXPOSE 5173
CMD ["npm", "run", "preview", "--prefix", "full/apps/client"]
