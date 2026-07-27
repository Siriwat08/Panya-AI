import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Detect Turso/production environment
const isTurso =
  typeof process !== 'undefined' &&
  process.env.DATABASE_URL?.startsWith('libsql://') &&
  !!process.env.TURSO_AUTH_TOKEN

function initDb(): PrismaClient {
  if (isTurso) {
    // Production: use libsql adapter for Turso
    const libsql = createClient({
      url: process.env.DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })
    const adapter = new PrismaLibSql(libsql)
    return new PrismaClient({ adapter })
  }

  // Local dev: SQLite file
  return new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? initDb()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
