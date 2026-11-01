import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type DB = NodePgDatabase<typeof schema>;
export type DbKind = 'postgres' | 'pglite';

type DbState = { db: DB; kind: DbKind; pool?: Pool };
const g = globalThis as unknown as { __aurelleDb?: Promise<DbState> };

export function databaseUrl(): string {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

/** node-postgres does not understand `channel_binding` and handles TLS via the `ssl` option. */
export function pgConfig(url: string) {
  const u = new URL(url);
  const sslmode = u.searchParams.get('sslmode');
  u.searchParams.delete('channel_binding');
  u.searchParams.delete('sslmode');
  const local = ['localhost', '127.0.0.1'].includes(u.hostname);
  return {
    connectionString: u.toString(),
    ssl: sslmode === 'disable' || (local && !sslmode) ? false : { rejectUnauthorized: true },
  };
}

async function create(): Promise<DbState> {
  const url = databaseUrl();
  if (url) {
    const pool = new Pool({
      ...pgConfig(url),
      max: 5,
      idleTimeoutMillis: 15_000,
      connectionTimeoutMillis: 15_000,
    });
    const db = drizzlePg(pool, { schema });
    return { db, kind: 'postgres', pool };
  }
  // Local development / no-database fallback: embedded Postgres (PGlite).
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const dir = process.env.PGLITE_DIR || (process.env.VERCEL ? '/tmp/aurelle-pglite' : './.data/pglite');
  (await import('node:fs')).mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  await client.waitReady;
  const db = drizzle(client, { schema }) as unknown as DB;
  const { migrateAndSeed } = await import('./setup');
  await migrateAndSeed(db, 'pglite');
  return { db, kind: 'pglite' };
}

function state(): Promise<DbState> {
  if (!g.__aurelleDb) {
    g.__aurelleDb = create().catch((err) => {
      g.__aurelleDb = undefined;
      throw err;
    });
  }
  return g.__aurelleDb;
}

export async function getDb(): Promise<DB> {
  return (await state()).db;
}

export async function getDbKind(): Promise<DbKind> {
  return (await state()).kind;
}

export { schema };
