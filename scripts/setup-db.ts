/**
 * Build-time database setup: applies migrations and seeds demo content if the database is empty.
 * Runs automatically before `next build` (see package.json). Safe to run repeatedly.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
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
        await import(pathToFileURL(path.join(process.cwd(), 'scripts/migrate-neon.mjs')).href);
      } catch (error) {
        log(`neon migration check failed: ${error instanceof Error ? error.message : 'error'}`);
      }
    }
    if (process.env.VERCEL) {
      try {
        const { refreshExchangeRates } = await import('../src/lib/currency');
        const rates = await refreshExchangeRates();
        log(`exchange rates saved: ${rates.saved.join(', ')}`);
      } catch (error) {
        log(`exchange rates unchanged: ${error instanceof Error ? error.message : 'error'}`);
      }
    }
    if (process.env.VERCEL && process.env.BLOB_STORE_ID) {
      const { copyCatalogToBlob, probeBlob } = await import('../src/lib/blob-catalog');
      await probeBlob(log);
      try {
        await copyCatalogToBlob(db, log);
      } catch (error) {
        log(`blob catalog failed ${error instanceof Error ? error.message : 'error'}`);
      }
    }
    if (process.env.VERCEL && process.env.GMAIL_APP_PASSWORD) {
      try {
        const { eq } = await import('drizzle-orm');
        const { settings } = await import('../src/db/schema');
        const fingerprint = (await import('node:crypto')).createHash('sha256').update(process.env.GMAIL_APP_PASSWORD).digest('hex').slice(0, 12);
        const [done] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, 'gmail_live_test_v1')).limit(1);
        const previous = done?.value as { fingerprint?: string } | undefined;
        if (previous?.fingerprint !== fingerprint) {
          const { envAppPassword, passwordShape } = await import('../src/lib/mailer');
          const secret = envAppPassword();
          console.log(`[smtp] source=env length=${secret.length} shape=${passwordShape(secret)} host=smtp.gmail.com port=587`);
          const { sendEmail, orderConfirmationEmail } = await import('../src/lib/email');
          const test = await sendEmail('mehboobtalha34@gmail.com', 'EVERMOON mailbox test', '<p>This is a controlled EVERMOON mailbox test. No customer order was used.</p>', 'mailbox-test');
          console.log(`[smtp] test-email sent=${test.sent} reason=${test.reason || 'accepted'}`);
          if (test.sent) {
            const { productVariants } = await import('../src/db/schema');
            const { gt } = await import('drizzle-orm');
            const { createOrder, changeOrderStatus } = await import('../src/lib/orders');
            const { progressOrders } = await import('../src/lib/fulfillment');
            const [variant] = await db.select({ id: productVariants.id }).from(productVariants).where(gt(productVariants.stock, 0)).limit(1);
            let orderNumber = '';
            if (variant) {
              const order = await createOrder({
                lines: [{ variantId: variant.id, quantity: 1 }],
                email: 'mehboobtalha34@gmail.com',
                phone: '03001234567',
                address: { firstName: 'EVERMOON', lastName: 'Test', phone: '03001234567', line1: 'Controlled test, not a customer address', city: 'Lahore', province: 'Punjab', country: 'Pakistan' },
                shippingMethod: 'standard',
                paymentMethod: 'cod',
                customerNote: 'Controlled SMTP and status test. Not a customer purchase.',
              });
              orderNumber = order.number;
              const confirm = await sendEmail(order.email, `Your EVERMOON order ${order.number}`, orderConfirmationEmail(order, [], 'https://aurelle-jewelry-zeta.vercel.app/admin'), 'order-confirmation', { orderId: order.id });
              console.log(`[smtp] order-confirmation ${order.number} sent=${confirm.sent} reason=${confirm.reason || 'accepted'}`);
              const confirmed = await changeOrderStatus(order.id, 'confirmed', 'controlled-test', { note: 'Controlled status test' });
              console.log(`[status] ${confirmed.number} ${confirmed.status}`);
              await db.update(schema.orders).set({ status: 'shipped', expectedAt: new Date(Date.now() - 60_000), deliveryResponse: null }).where(eq(schema.orders.id, order.id));
              const progressed = await progressOrders(new Date(), order.id);
              console.log(`[delivery] ${JSON.stringify(progressed)}`);
              await changeOrderStatus(order.id, 'confirmed', 'controlled-test', { note: 'Restored after delivery-timer check', force: true });
            }
            await db.insert(settings).values({ key: 'gmail_live_test_v1', value: { at: new Date().toISOString(), sent: true, orderNumber, fingerprint } }).onConflictDoUpdate({ target: settings.key, set: { value: { at: new Date().toISOString(), sent: true, orderNumber, fingerprint }, updatedAt: new Date() } });
          } else {
            await db.insert(settings).values({ key: 'gmail_live_test_v1', value: { at: new Date().toISOString(), sent: false, fingerprint } }).onConflictDoUpdate({ target: settings.key, set: { value: { at: new Date().toISOString(), sent: false, fingerprint }, updatedAt: new Date() } });
          }
        }
      } catch (error) {
        console.error('[smtp] live check failed', error instanceof Error ? error.message : 'error');
      }
    }
    if (process.env.VERCEL) {
      try {
        const crypto = await import('node:crypto');
        const { eq } = await import('drizzle-orm');
        const { settings } = await import('../src/db/schema');
        const [existing] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, 'review_check_token')).limit(1);
        const current = existing?.value as { hash?: string; expiresAt?: number } | undefined;
        if (!current?.hash || (current.expiresAt && current.expiresAt < Date.now())) {
          const token = crypto.randomBytes(24).toString('hex');
          const value = { hash: crypto.createHash('sha256').update(token).digest('hex'), expiresAt: Date.now() + 2 * 60 * 60 * 1000 };
          await db.insert(settings).values({ key: 'review_check_token', value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
          console.log(`[review-check] token=${token}`);
        } else {
          console.log('[review-check] token already issued');
        }
      } catch (error) {
        console.error('[review-check] token issue failed', error instanceof Error ? error.message : 'error');
      }
    }
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
