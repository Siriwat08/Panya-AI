import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Debug endpoint — shows env vars + DB connection status (NO secrets exposed)
export async function GET() {
  const dbUrl = process.env.DATABASE_URL || '(not set)';
  const hasTursoToken = !!process.env.TURSO_AUTH_TOKEN;
  const hasZaiKey = !!process.env.Z_AI_API_KEY;
  const nodeEnv = process.env.NODE_ENV;
  const isTursoUrl = dbUrl.startsWith('libsql://');

  const envInfo = {
    NODE_ENV: nodeEnv,
    DATABASE_URL_set: !!process.env.DATABASE_URL,
    DATABASE_URL_prefix: dbUrl.slice(0, 30) + (dbUrl.length > 30 ? '...' : ''),
    DATABASE_URL_is_libsql: isTursoUrl,
    TURSO_AUTH_TOKEN_set: hasTursoToken,
    Z_AI_API_KEY_set: hasZaiKey,
  };

  // Try to import Prisma + connect
  let prismaInfo: any = { step: 'init' };
  try {
    prismaInfo.step = 'importing_prisma_client';
    const { PrismaClient } = await import('@prisma/client');
    prismaInfo.step = 'prisma_client_imported';
    prismaInfo.has_adapter_libsql = false;

    try {
      await import('@prisma/adapter-libsql');
      prismaInfo.has_adapter_libsql = true;
    } catch (e: any) {
      prismaInfo.adapter_libsql_error = e.message;
    }

    prismaInfo.has_libsql_client = false;
    try {
      await import('@libsql/client');
      prismaInfo.has_libsql_client = true;
    } catch (e: any) {
      prismaInfo.libsql_client_error = e.message;
    }

    // Try actual DB connection
    if (isTursoUrl && hasTursoToken) {
      prismaInfo.step = 'connecting_to_turso';
      const { PrismaLibSql } = await import('@prisma/adapter-libsql');
      const { createClient } = await import('@libsql/client');
      const libsql = createClient({
        url: dbUrl,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
      const adapter = new PrismaLibSql(libsql);
      const prisma = new PrismaClient({ adapter });
      prismaInfo.step = 'prisma_client_created';

      const count = await prisma.law.count();
      prismaInfo.step = 'query_ok';
      prismaInfo.law_count = count;
      await prisma.$disconnect();
    } else {
      prismaInfo.step = 'skipped_turso_no_credentials';
    }
  } catch (e: any) {
    prismaInfo.error = e.message;
    prismaInfo.error_stack = e.stack?.slice(0, 500);
  }

  return NextResponse.json({
    ok: false,
    env: envInfo,
    prisma: prismaInfo,
    timestamp: new Date().toISOString(),
  });
}
