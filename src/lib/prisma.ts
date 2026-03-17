import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  // Supabase pooler / PgBouncer (and similar) can run with very small pools.
  // Prisma's default connection pool size can easily exhaust it under Next dev/RSC.
  // These flags make Prisma behave correctly behind PgBouncer and reduce connections.
  try {
    const url = new URL(raw);

    const host = url.host.toLowerCase();
    const looksLikeSupabasePooler = host.includes('pooler.supabase.com');

    // Only auto-tune for known pooler hosts, and only if user hasn't already set them.
    if (looksLikeSupabasePooler) {
      if (!url.searchParams.has('pgbouncer')) url.searchParams.set('pgbouncer', 'true');
      if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '1');
    }

    return url.toString();
  } catch {
    // If DATABASE_URL isn't a valid URL (or already includes special format), leave it untouched.
    return raw;
  }
}

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  // Important for Vercel/Next builds: route modules can be evaluated at build-time.
  // If DATABASE_URL isn't present during that phase, instantiating PrismaClient can throw.
  // We only create the client when it's actually used at runtime.
  const url = getDatabaseUrl();
  const client = new PrismaClient(
    url
      ? {
          datasources: {
            db: { url },
          },
        }
      : undefined
  );

  // Cache the client on globalThis in all environments. This is important in
  // Next.js (especially Turbopack/RSC) where modules can be evaluated multiple
  // times and creating multiple PrismaClients can exhaust DB connections.
  globalForPrisma.prisma = client;

  return globalForPrisma.prisma;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient() as any;
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});