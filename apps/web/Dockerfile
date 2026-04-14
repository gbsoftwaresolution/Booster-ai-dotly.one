# syntax=docker/dockerfile:1.7
FROM node:20-bookworm-slim AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile --prod=false

FROM node:20-bookworm-slim AS builder
WORKDIR /app

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_WEB_URL
ARG NEXT_PUBLIC_SITE_URL
ARG R2_PUBLIC_HOSTNAME
ARG NEXT_PUBLIC_PAYMENT_VAULT_ADDRESS
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_ENABLE_APPLE_WALLET
ARG NEXT_PUBLIC_ENABLE_GOOGLE_WALLET
ARG API_URL
ARG INTERNAL_API_URL
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG CI

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
  NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
  NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
  NEXT_PUBLIC_WEB_URL=$NEXT_PUBLIC_WEB_URL \
  NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
  R2_PUBLIC_HOSTNAME=$R2_PUBLIC_HOSTNAME \
  NEXT_PUBLIC_PAYMENT_VAULT_ADDRESS=$NEXT_PUBLIC_PAYMENT_VAULT_ADDRESS \
  NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
  NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY \
  NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST \
  NEXT_PUBLIC_ENABLE_APPLE_WALLET=$NEXT_PUBLIC_ENABLE_APPLE_WALLET \
  NEXT_PUBLIC_ENABLE_GOOGLE_WALLET=$NEXT_PUBLIC_ENABLE_GOOGLE_WALLET \
  API_URL=$API_URL \
  INTERNAL_API_URL=$INTERNAL_API_URL \
  SENTRY_ORG=$SENTRY_ORG \
  SENTRY_PROJECT=$SENTRY_PROJECT \
  CI=$CI

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .

RUN pnpm install --filter @dotly/web... --frozen-lockfile --prod=false
RUN pnpm --filter @dotly/types build
RUN pnpm turbo build --filter=@dotly/web

FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
EXPOSE 8080

USER nextjs

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "const port = process.env.PORT || 8080; require('http').get({ host: '127.0.0.1', port, path: '/api/health/live' }, (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "apps/web/server.js"]