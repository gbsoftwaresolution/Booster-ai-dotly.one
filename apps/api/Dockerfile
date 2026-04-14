# syntax=docker/dockerfile:1.7
# ─── Stage 1: deps ────────────────────────────────────────────────────────────
# Install ALL dependencies (including devDependencies needed to build).
FROM node:20-alpine AS deps
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# Copy manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile --prod=false

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
# Generate Prisma client and compile TypeScript.
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

COPY . .

# Re-link only the API workspace graph after the full monorepo is present.
RUN pnpm install --filter @dotly/api... --frozen-lockfile --prod=false

# Generate Prisma client (requires DATABASE_URL only at generate time, not a real DB)
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
  pnpm --filter @dotly/database run db:generate

# Build the NestJS API
RUN pnpm turbo build --filter=@dotly/api

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
# Minimal runtime image — non-root user, no build tools.
FROM node:20-alpine AS runner
WORKDIR /app

# Create a dedicated non-root user and group
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nestjs

# Copy only the built output and production node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
# Prisma client lives inside the database package
COPY --from=builder --chown=nestjs:nodejs /app/packages/database ./packages/database

# Metadata
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

USER nestjs

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health/live || exit 1

CMD ["node", "dist/src/main"]
