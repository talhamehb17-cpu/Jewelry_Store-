/**
 * Copies the current production database into a different connected Neon database.
 * Never deletes or truncates the source. Never prints connection strings.
 */
import crypto from 'node:crypto';
import path from 'node:path';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const log = (m) => console.log(`[migrate] ${m}`);

function safe(error) {
  return String(error instanceof Error ? error.message : error).replace(/postgres(?:ql)?:\/\/\S+/gi, 'postgresql://[redacted]').slice(0, 300);
}

function cleanUrl(raw) {
  const url = new URL(raw);
  url.searchParams.delete('channel_binding');
  return url.toString();
}

function hostOf(raw) {
  try {
    return new URL(raw).hostname;
  } catch {
    return '';
  }
}

function poolFor(raw) {
  return new pg.Pool({
    connectionString: cleanUrl(raw),
    ssl: { rejectUnauthorized: true },
    max: 1,
    connectionTimeoutMillis: 20_000,
    idleTimeoutMillis: 5_000,
  });
}

function decryptSecret(payload) {
  const secret = process.env.AUTH_SECRET || '';
  if (secret.length < 32) throw new Error('AUTH_SECRET is missing');
  const key = crypto.createHash('sha256').update(secret).digest();
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

function candidateUrls(source) {
  const found = [];
  const keys = Object.keys(process.env).filter((key) => /DATABASE|POSTGRES|NEON_|PGHOST/i.test(key));
  for (const key of keys) {
    const value = process.env[key] || '';
    const host = hostOf(value);
    if (host) log(`env ${key} host=${host}`);
    else if (value) log(`env ${key} present`);
    if (host && host !== hostOf(source) && /^postgres/.test(value)) found.push({ key, url: value });
  }
  return found;
}

async function savedUrl(sourcePool) {
  const row = await sourcePool.query(`select value from settings where key = 'database_connection' limit 1`);
  const value = row.rows[0]?.value;
  if (!value?.urlEnc) {
    log('saved admin connection: none');
    return null;
  }
  const url = decryptSecret(value.urlEnc);
  log(`saved admin connection host=${hostOf(url)} database=${new URL(url).pathname.replace(/^\//, '')} active=${!!value.active}`);
  return url;
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

async function tablesInOrder(pool) {
  const tables = await pool.query(`select tablename from pg_tables where schemaname = 'public' and tablename <> '__drizzle_migrations' order by tablename`);
  const fks = await pool.query(`
    select tc.table_name, ccu.table_name as parent
    from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
    where tc.table_schema = 'public' and tc.constraint_type = 'FOREIGN KEY'
  `);
  const names = tables.rows.map((r) => r.tablename);
  const deps = new Map(names.map((name) => [name, new Set()]));
  for (const fk of fks.rows) {
    if (fk.table_name !== fk.parent && deps.has(fk.table_name) && deps.has(fk.parent)) deps.get(fk.table_name).add(fk.parent);
  }
  const ordered = [];
  const seen = new Set();
  function visit(name) {
    if (seen.has(name)) return;
    seen.add(name);
    for (const parent of deps.get(name) || []) visit(parent);
    ordered.push(name);
  }
  for (const name of names) visit(name);
  return ordered;
}

async function primaryKey(pool, table) {
  const res = await pool.query(
    `select a.attname
     from pg_index i
     join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
     where i.indrelid = $1::regclass and i.indisprimary
     order by a.attnum`,
    [table],
  );
  return res.rows.map((r) => r.attname);
}

async function counts(pool, tables) {
  const out = {};
  for (const table of tables) {
    const res = await pool.query(`select count(*)::int as n from ${quoteIdent(table)}`);
    out[table] = res.rows[0].n;
  }
  return out;
}

function bind(value, udt) {
  if (value == null) return null;
  if (udt === 'json' || udt === 'jsonb') return typeof value === 'string' ? value : JSON.stringify(value);
  return value;
}

async function copyTable(source, dest, table) {
  const cols = await source.query(
    `select column_name, udt_name from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position`,
    [table],
  );
  const names = cols.rows.map((r) => r.column_name);
  const types = new Map(cols.rows.map((r) => [r.column_name, r.udt_name]));
  if (!names.length) return { inserted: 0, updated: 0 };
  const pk = await primaryKey(source, table);
  const rows = await source.query(`select ${names.map(quoteIdent).join(', ')} from ${quoteIdent(table)}`);
  const placeholders = names.map((name, i) => {
    const udt = types.get(name);
    if (udt === 'jsonb' || udt === 'json') return `$${i + 1}::${udt}`;
    return `$${i + 1}`;
  });
  const updates = names.filter((name) => !pk.includes(name)).map((name) => `${quoteIdent(name)} = excluded.${quoteIdent(name)}`);
  const conflict = pk.length
    ? ` on conflict (${pk.map(quoteIdent).join(', ')}) do ${updates.length ? `update set ${updates.join(', ')}` : 'nothing'}`
    : '';
  const sql = `insert into ${quoteIdent(table)} (${names.map(quoteIdent).join(', ')}) values (${placeholders.join(', ')})${conflict} returning (xmax = 0) as inserted`;
  let inserted = 0;
  let updated = 0;
  for (const row of rows.rows) {
    const values = names.map((name) => bind(row[name], types.get(name)));
    const result = await dest.query(sql, values);
    if (result.rows[0]?.inserted) inserted += 1;
    else updated += 1;
  }
  return { inserted, updated };
}

async function resetSequences(dest, tables) {
  for (const table of tables) {
    const seq = await dest.query(`select pg_get_serial_sequence($1, 'id') as seq`, [table]);
    const name = seq.rows[0]?.seq;
    if (!name) continue;
    await dest.query(`select setval($1, coalesce((select max(id) from ${quoteIdent(table)}), 1), true)`, [name]);
  }
}

async function main() {
  const sourceUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  if (!sourceUrl) {
    log('no source DATABASE_URL');
    return;
  }
  log(`source host=${hostOf(sourceUrl)}`);
  const source = poolFor(sourceUrl);
  try {
    await source.query('select 1');
    const saved = await savedUrl(source).catch((error) => {
      log(`saved connection unreadable: ${safe(error)}`);
      return null;
    });
    const candidates = candidateUrls(sourceUrl);
    if (saved && hostOf(saved) && hostOf(saved) !== hostOf(sourceUrl)) candidates.push({ key: 'settings.database_connection', url: saved });
    const destination = candidates.find((item) => hostOf(item.url) && hostOf(item.url) !== hostOf(sourceUrl));
    if (!destination) {
      log('no different Neon database is connected. Production DATABASE_URL is still the only database. Nothing was copied and nothing was deleted.');
      return;
    }
    log(`destination from ${destination.key} host=${hostOf(destination.url)}`);
    const dest = poolFor(destination.url);
    try {
      await dest.query('select 1');
      const db = drizzle(dest);
      await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
      log('destination schema migrations applied');
      const tables = await tablesInOrder(source);
      const before = await counts(dest, tables);
      const sourceCounts = await counts(source, tables);
      log(`source counts ${JSON.stringify(sourceCounts)}`);
      log(`destination before ${JSON.stringify(before)}`);
      const marker = await dest.query(`select 1 from settings where key = 'neon_migration_v1' limit 1`).catch(() => ({ rows: [] }));
      if (marker.rows.length) {
        const after = await counts(dest, tables);
        log(`destination already marked migrated ${JSON.stringify(after)}`);
        return;
      }
      await dest.query('begin');
      try {
        await dest.query(`set session_replication_role = 'replica'`).catch(() => undefined);
        const sourceEmails = await source.query(`select email from users`);
        const emails = sourceEmails.rows.map((row) => row.email).filter(Boolean);
        if (emails.length) {
          const removed = await dest.query(
            `delete from users u
             where u.email = any($1::text[])
               and not exists (select 1 from orders o where o.user_id = u.id)
               and not exists (select 1 from addresses a where a.user_id = u.id)
               and not exists (select 1 from wishlist_items w where w.user_id = u.id)
               and not exists (select 1 from reviews r where r.user_id = u.id)
             returning id`,
            [emails],
          );
          log(`reconciled destination users with no orders or addresses removed=${removed.rowCount}`);
        }
        for (const table of tables) {
          const result = await copyTable(source, dest, table);
          log(`${table} inserted=${result.inserted} updated=${result.updated}`);
        }
        await resetSequences(dest, tables);
        const afterTx = await counts(dest, tables);
        const missing = tables.filter((table) => afterTx[table] < sourceCounts[table]);
        if (missing.length) throw new Error(`missing rows in ${missing.join(', ')}`);
        const srcOrders = await source.query(`select number from orders order by number`);
        const dstOrders = await dest.query(`select number from orders order by number`);
        log(`order numbers match=${srcOrders.rows.map((row) => row.number).join(',') === dstOrders.rows.map((row) => row.number).join(',')} count=${dstOrders.rowCount}`);
        await dest.query(
          `insert into settings (key, value, updated_at) values ('neon_migration_v1', $1::jsonb, now()) on conflict (key) do update set value = excluded.value, updated_at = now()`,
          [JSON.stringify({ at: new Date().toISOString(), sourceHost: hostOf(sourceUrl), counts: afterTx })],
        );
        await dest.query('commit');
      } catch (error) {
        await dest.query('rollback');
        throw error;
      }
      const after = await counts(dest, tables);
      const mismatches = tables.filter((table) => after[table] < sourceCounts[table]);
      log(`destination after ${JSON.stringify(after)}`);
      log(mismatches.length ? `missing rows in ${mismatches.join(', ')}` : 'destination counts cover every source table');
    } finally {
      await dest.end().catch(() => undefined);
    }
  } catch (error) {
    log(`failed ${safe(error)}`);
  } finally {
    await source.end().catch(() => undefined);
  }
}

await main();
