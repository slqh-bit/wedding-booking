# حفلاتي — single-service production image.
# The API serves both /api/v1/* and the built PWA (same origin, no CORS).
# Build context is the repo root.

# ── Builder: install the whole pnpm workspace and build web + api ──────────
FROM node:20-bookworm-slim AS builder
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
# openssl for Prisma; python/make/g++ in case a native dep (argon2) compiles.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Manifests first for a cached dependency layer.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/config/package.json packages/config/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# Sources.
COPY . .

# Build the PWA to talk to the same origin, then bundle the API + generate the
# Prisma client.
ENV VITE_API_URL=/api/v1
RUN pnpm --filter @hafalati/web build \
 && pnpm --filter @hafalati/api build

# ── Runner: carry the built workspace (incl. Prisma client + native deps) ──
FROM node:20-bookworm-slim AS runner
ENV NODE_ENV=production PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app ./

# The API also serves the compiled PWA.
ENV SERVE_WEB=true
ENV WEB_DIST_DIR=/app/apps/web/dist

WORKDIR /app/apps/api
EXPOSE 4000
# Apply pending migrations, then boot. (Idempotent for a single instance.)
CMD ["pnpm", "start:prod"]
