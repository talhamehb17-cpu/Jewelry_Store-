import { sql } from 'drizzle-orm';
import type { DB } from './index';

const ready = new WeakSet<object>();

/** Additive only. Does not delete rows, codes, orders, or subscribers. */
export async function ensureCommerceColumns(db: DB) {
  if (ready.has(db)) return;
  await db.execute(sql`ALTER TABLE "discounts" ADD COLUMN IF NOT EXISTS "audience" varchar(20) NOT NULL DEFAULT 'public'`);
  await db.execute(sql`ALTER TABLE "discounts" ADD COLUMN IF NOT EXISTS "category_ids" jsonb NOT NULL DEFAULT '[]'::jsonb`);
  await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_plan" jsonb`);
  ready.add(db);
}
