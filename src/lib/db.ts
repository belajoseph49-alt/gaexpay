import { PrismaClient } from '@prisma/client'

// Bump this when the Prisma schema changes (new models/fields). It forces the
// dev-server cache to instantiate a fresh PrismaClient that knows about the
// new schema, without needing a manual server restart.
const PRISMA_CACHE_VERSION = 'v7-gaexchat-pro-2026-07'

const globalForPrisma = globalThis as unknown as {
  __prismaCacheVersion?: string
  prisma: PrismaClient | undefined
}

// If the cache version doesn't match, discard the cached client so a fresh one
// is created with the current Prisma Client (which knows about any new models).
if (globalForPrisma.__prismaCacheVersion !== PRISMA_CACHE_VERSION) {
  globalForPrisma.prisma = undefined
  globalForPrisma.__prismaCacheVersion = PRISMA_CACHE_VERSION
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
