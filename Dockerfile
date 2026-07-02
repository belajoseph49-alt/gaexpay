# syntax=docker/dockerfile:1.7
# ============================================================
# GaexPay — Multi-stage Dockerfile
#   Stage 1 (builder): uses Bun to install deps & build the
#                       Next.js standalone output.
#   Stage 2 (runner):  slim Node image running `server.js`
#                       with Prisma engines pre-copied.
# ============================================================

# -------------------- Stage 1: Build ------------------------
FROM oven/bun:1 AS builder

WORKDIR /app

# Install OS deps needed by sharp / prisma engines (rare on bun image
# but harmless). Keep it lean — skip if the bun image already ships them.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        openssl \
    && rm -rf /var/lib/apt/lists/*

# Cache deps first
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy the rest of the source (respect .dockerignore)
COPY . .

# Generate the Prisma client (writes to node_modules/.prisma + @prisma)
RUN bunx prisma generate

# Build Next.js (produces .next/standalone + .next/static)
RUN bun run build

# -------------------- Stage 2: Runner -----------------------
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# Minimal OS deps for the Prisma query engine + sharp
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        openssl \
        ca-certificates \
        tini \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system --gid 1001 nodejs \
    && adduser  --system --uid 1001 --ingroup nodejs nextjs

# Standalone server (already includes node_modules it needs)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma schema + generated client (engines are fetched/genned at build time)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
