/**
 * Build-time database setup: applies migrations and seeds demo content if the database is empty.
 * Runs automatically before `next build` (see package.json). Safe to run repeatedly.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';
import { databaseUrl, pgConfig, type DB } from '../src/db/index';
import { migrateAndSeed } from '../src/db/setup';

async function main() {
  const url = databaseUrl();
  const log = (m: string) => console.log(`[db] ${m}`);
  if (!url) {
    if (process.env.VERCEL) {
      console.warn('[db] WARNING: DATABASE_URL is not set. The deployment will fall back to an ephemeral embedded database.');
      return;
    }
    log('DATABASE_URL not set — using local embedded Postgres (PGlite) at .data/pglite');
    const { PGlite } = await import('@electric-sql/pglite');
    const { drizzle: drizzleLite } = await import('drizzle-orm/pglite');
    const dir = process.env.PGLITE_DIR || './.data/pglite';
    (await import('node:fs')).mkdirSync(dir, { recursive: true });
    const client = new PGlite(dir);
    await client.waitReady;
    const db = drizzleLite(client, { schema }) as unknown as DB;
    await migrateAndSeed(db, 'pglite', log);
    await client.close();
    return;
  }
  const pool = new Pool({ ...pgConfig(url), max: 2, connectionTimeoutMillis: 20_000 });
  try {
    const db = drizzle(pool, { schema });
    log(`connecting to ${new URL(url).hostname}`);
    await migrateAndSeed(db, 'postgres', log);
    if (process.env.VERCEL && process.env.SMTP_PROBE === '1') {
      try {
        const { probeMailbox } = await import('../src/lib/mailer');
        const report = await probeMailbox();
        console.log(`[smtp] ${JSON.stringify(report)}`);
      } catch (error) {
        console.error('[smtp] probe failed', error instanceof Error ? error.message : 'error');
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[db] setup failed:', err);
  process.exit(1);
});
