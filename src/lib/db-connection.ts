import { eq } from 'drizzle-orm';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getEnvDb, pgConfig, resetDb } from '@/db';
import * as schema from '@/db/schema';
import { settings } from '@/db/schema';
import { decryptSecret, encryptSecret } from './crypto-box';

const KEY = 'database_connection';
const REQUIRED = ['users', 'products', 'orders', 'settings', 'categories', 'collections'];

export type ConnectionPublic = {
  saved: boolean;
  active: boolean;
  host: string;
  port: string;
  database: string;
  user: string;
  ssl: boolean;
  hasPassword: boolean;
  lastTest: { ok: boolean; at: string; message: string; missing: string[] } | null;
};

type Stored = {
  host: string;
  port: string;
  database: string;
  user: string;
  ssl: boolean;
  urlEnc?: string;
  active?: boolean;
  lastTest?: ConnectionPublic['lastTest'];
};

function blockedHost(host: string) {
  const h = host.trim().toLowerCase();
  if (!h || h.length > 253 || h.includes(' ') || h.includes('/') || h.includes('\\')) return 'Enter a database host.';
  if (h === 'localhost' || h.endsWith('.localhost') || h === '127.0.0.1' || h === '0.0.0.0' || h === '::1' || h === '[::1]') return 'Local addresses are not allowed.';
  if (h === 'metadata.google.internal' || h.startsWith('169.254.')) return 'That host is not allowed.';
  return null;
}

export function parseConnectionString(raw: string) {
  const text = raw.trim();
  if (!text) throw new Error('Enter a connection string.');
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error('That is not a valid connection string.');
  }
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') throw new Error('Use a postgres:// connection string.');
  const reason = blockedHost(url.hostname);
  if (reason) throw new Error(reason);
  if (!url.username || !url.password) throw new Error('The connection string must include a username and password.');
  if (!url.pathname || url.pathname === '/') throw new Error('The connection string must include a database name.');
  return url.toString();
}

function publicView(row: Stored | null): ConnectionPublic {
  return {
    saved: !!row?.urlEnc,
    active: !!row?.active,
    host: row?.host || '',
    port: row?.port || '',
    database: row?.database || '',
    user: row?.user || '',
    ssl: row?.ssl !== false,
    hasPassword: !!row?.urlEnc,
    lastTest: row?.lastTest ?? null,
  };
}

async function readStored(): Promise<Stored | null> {
  const db = await getEnvDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1);
  if (!row || !row.value || typeof row.value !== 'object') return null;
  return row.value as Stored;
}

async function writeStored(value: Stored) {
  const db = await getEnvDb();
  await db.insert(settings).values({ key: KEY, value, updatedAt: new Date() }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

export async function getDatabaseConnectionPublic(): Promise<ConnectionPublic> {
  try {
    return publicView(await readStored());
  } catch {
    return publicView(null);
  }
}

function describe(url: string) {
  const u = new URL(url);
  return { host: u.hostname, port: u.port || '5432', database: u.pathname.replace(/^\//, ''), user: decodeURIComponent(u.username), ssl: u.searchParams.get('sslmode') !== 'disable' };
}

async function withPool<T>(url: string, fn: (pool: Pool) => Promise<T>) {
  const pool = new Pool({ ...pgConfig(url), max: 1, connectionTimeoutMillis: 8000, idleTimeoutMillis: 1000 });
  try {
    return await fn(pool);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export async function testDatabaseConnection(raw: string) {
  const url = parseConnectionString(raw);
  const started = Date.now();
  const result = await withPool(url, async (pool) => {
    await pool.query('select 1 as ok');
    const tables = await pool.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1::text[])`,
      [REQUIRED],
    );
    const found = new Set(tables.rows.map((r) => r.table_name));
    const missing = REQUIRED.filter((t) => !found.has(t));
    const admins = found.has('users')
      ? Number((await pool.query(`select count(*)::int as n from users where role = 'admin' and status = 'active'`)).rows[0]?.n ?? 0)
      : 0;
    return { missing, admins };
  });
  const lastTest = {
    ok: true,
    at: new Date().toISOString(),
    message: `Connected in ${Date.now() - started}ms.${result.missing.length ? ` Missing tables: ${result.missing.join(', ')}.` : ' Required tables are present.'}${result.admins ? ` ${result.admins} administrator account${result.admins === 1 ? '' : 's'} found.` : ' No administrator account yet.'}`,
    missing: result.missing,
  };
  const prev = (await readStored()) ?? { ...describe(url), ssl: true };
  await writeStored({ ...prev, ...describe(url), urlEnc: encryptSecret(url), active: !!prev.active && !result.missing.length, lastTest });
  return { ...lastTest, admins: result.admins };
}

export async function initializeDatabaseSchema(raw: string) {
  const url = parseConnectionString(raw);
  const tested = await testDatabaseConnection(url);
  if (!tested.missing.length) return { ok: true, message: 'The schema is already present. Nothing was changed.' };
  const pool = new Pool({ ...pgConfig(url), max: 1, connectionTimeoutMillis: 12_000 });
  try {
    const db = drizzlePg(pool, { schema });
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    const path = await import('node:path');
    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  } finally {
    await pool.end().catch(() => undefined);
  }
  const again = await testDatabaseConnection(url);
  if (again.missing.length) return { ok: false, message: `Schema initialization did not create: ${again.missing.join(', ')}.` };
  return { ok: true, message: 'Schema created on the new database. Existing tables were not dropped, and the current database was not changed.' };
}

export async function createDatabaseAdmin(raw: string, email: string, password: string) {
  const url = parseConnectionString(raw);
  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error('Enter a valid administrator email.');
  if (password.length < 10) throw new Error('Use a password of at least 10 characters.');
  const tested = await testDatabaseConnection(url);
  if (tested.missing.includes('users')) throw new Error('Initialize the schema before creating an administrator.');
  const { hashPassword } = await import('./auth');
  const hash = await hashPassword(password);
  await withPool(url, async (pool) => {
    const existing = await pool.query(`select id from users where email = $1 limit 1`, [cleanEmail]);
    if (existing.rowCount) {
      await pool.query(`update users set password_hash = $1, role = 'admin', status = 'active' where email = $2`, [hash, cleanEmail]);
    } else {
      await pool.query(
        `insert into users (email, password_hash, first_name, last_name, role, status) values ($1, $2, 'EVERMOON', 'Admin', 'admin', 'active')`,
        [cleanEmail, hash],
      );
    }
  });
  return { ok: true, message: 'Administrator saved on the new database only. The current database was not changed.' };
}

export async function activateDatabaseConnection(raw: string) {
  const url = parseConnectionString(raw);
  const tested = await testDatabaseConnection(url);
  if (tested.missing.length) {
    return { ok: false, message: 'Connection works, but the schema is incomplete. Initialize the schema before switching. The current database is unchanged.' };
  }
  if (!tested.admins) {
    return { ok: false, message: 'The new database has no administrator, so switching would lock you out. Create an administrator first. The current database is unchanged.' };
  }
  const prev = await readStored();
  if (!prev?.urlEnc) return { ok: false, message: 'Save a successful test before activating.' };
  await writeStored({ ...prev, ...describe(url), urlEnc: encryptSecret(url), active: true, lastTest: tested });
  resetDb();
  return { ok: true, message: 'The store is now using the new database. Sign in with that database’s administrator. The previous database was not deleted. Also set DATABASE_URL in your host before the temporary database expires, or a fresh instance will not be able to find this saved connection.' };
}

export async function deactivateDatabaseConnection() {
  const prev = await readStored();
  if (!prev) return { ok: true, message: 'No saved connection.' };
  await writeStored({ ...prev, active: false });
  resetDb();
  return { ok: true, message: 'The store is back on the original DATABASE_URL. The saved credentials were kept, encrypted, and were not shown.' };
}

export async function forgetDatabaseConnection() {
  const db = await getEnvDb();
  await db.delete(settings).where(eq(settings.key, KEY));
  resetDb();
  return { ok: true, message: 'Saved database credentials were removed. The current database was not modified.' };
}

export async function activeOverrideUrl() {
  try {
    const row = await readStored();
    if (!row?.active || !row.urlEnc) return null;
    const url = decryptSecret(row.urlEnc);
    parseConnectionString(url);
    return url;
  } catch {
    return null;
  }
}
