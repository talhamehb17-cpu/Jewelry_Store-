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
    if (process.env.VERCEL) {
      try {
        const { probeMailbox, recentEmailLogs, resolveMailbox } = await import('../src/lib/mailer');
        const report = await probeMailbox();
        console.log(`[smtp] ${JSON.stringify(report)}`);
        if (report.accepted && process.env.VERCEL_ENV === 'production') {
          const mailbox = await resolveMailbox();
          const to = mailbox.config?.username;
          if (to) {
            const { deliverEmail } = await import('../src/lib/mailer');
            const { orderConfirmationEmail, testEmailHtml } = await import('../src/lib/email');
            const logs = await recentEmailLogs(30);
            const tested = logs.some((row) => row.kind === 'smtp-probe' && row.status === 'sent');
            const test = tested ? null : await deliverEmail(to, 'EVERMOON — SMTP check', testEmailHtml(), { kind: 'smtp-probe' });
            if (test) console.log(`[smtp] test ${test.sent ? 'accepted' : 'rejected'} ${test.error || test.via}`);
            const confirmed = logs.some((row) => row.kind === 'order-confirmation' && row.status === 'sent' && row.toEmail === to);
            if (!confirmed && (tested || test?.sent)) {
              const html = orderConfirmationEmail(
                { customerName: 'SMTP check', number: 'EM-SMTP-CHECK', paymentMethod: 'cod', shippingMethodName: 'Standard', total: 680000, campaignDiscount: 0, campaignName: null, discountTotal: 0, discountCode: null } as never,
                [{ name: 'SMTP check', variantTitle: null, quantity: 1, lineTotal: 680000, image: null }] as never,
                'https://aurelle-jewelry-zeta.vercel.app/account',
              );
              const orderMail = await deliverEmail(to, 'Your EVERMOON order EM-SMTP-CHECK', html, { kind: 'order-confirmation' });
              console.log(`[smtp] order-confirmation ${orderMail.sent ? 'accepted' : 'rejected'} ${orderMail.error || orderMail.via}`);
            }
          }
        }
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
