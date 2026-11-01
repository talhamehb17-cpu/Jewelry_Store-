import { cache } from 'react';
import { getDb } from '@/db';
import { settings as settingsTable } from '@/db/schema';
import { DEFAULT_SETTINGS } from '@/db/seed-data';
import { deepMerge } from '@/themes/engine';

export type StoreSettings = typeof DEFAULT_SETTINGS;
export type NavItem = { label: string; href: string; children?: { label: string; href: string }[] };
export type ShippingMethod = StoreSettings['shipping']['methods'][number];

export const getSettings = cache(async (): Promise<StoreSettings> => {
  const db = await getDb();
  const rows = await db.select().from(settingsTable);
  const stored: Record<string, unknown> = {};
  for (const r of rows) {
    if (r.key in DEFAULT_SETTINGS) stored[r.key] = r.value;
  }
  const merged = deepMerge(structuredClone(DEFAULT_SETTINGS), stored) as StoreSettings;
  return merged;
});

export async function saveSetting<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
  const db = await getDb();
  await db
    .insert(settingsTable)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
}

export function enabledShippingMethods(s: StoreSettings) {
  return s.shipping.methods.filter((m) => m.enabled);
}

export function stripeConfigured() {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY;
}
