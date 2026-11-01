import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type DB = NodePgDatabase<typeof schema>;
export type DbKind = 'postgres' | 'pglite';

type DbState = { db: DB; kind: DbKind; pool?: Pool };
const g = globalThis as unknown as { __aurelleDb?: Promise<DbState>; __aurelleEnvDb?: Promise<DbState> };

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

async function createEnv(): Promise<DbState> {
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

async function create(): Promise<DbState> {
  const env = await envState();
  if (env.kind !== 'postgres') return env;
  try {
    const { activeOverrideUrl } = await import('@/lib/db-connection');
    const url = await activeOverrideUrl();
    if (!url || url === databaseUrl()) return env;
    const pool = new Pool({ ...pgConfig(url), max: 5, idleTimeoutMillis: 15_000, connectionTimeoutMillis: 8_000 });
    await pool.query('select 1');
    return { db: drizzlePg(pool, { schema }), kind: 'postgres', pool };
  } catch {
    // A failed override must never replace the working database.
    return env;
  }
}

function envState(): Promise<DbState> {
  if (!g.__aurelleEnvDb) {
    g.__aurelleEnvDb = createEnv().catch((err) => {
      g.__aurelleEnvDb = undefined;
      throw err;
    });
  }
  return g.__aurelleEnvDb;
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

/** Always the DATABASE_URL pool. Used to read a saved override without following it. */
export async function getEnvDb(): Promise<DB> {
  return (await envState()).db;
}

export function resetDb() {
  const prev = g.__aurelleDb;
  g.__aurelleDb = undefined;
  void prev?.then((s) => s.pool?.end()).catch(() => undefined);
}

export async function getDb(): Promise<DB> {
  return (await state()).db;
}

export async function getDbKind(): Promise<DbKind> {
  return (await state()).kind;
}

export { schema };
