'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getDb } from '@/db';
import { deliveryIssues, deliveryServices, storeLocations } from '@/db/schema';
import { assertAdmin } from '@/lib/auth';
import { daysToMinutes } from '@/lib/delivery';
import { progressOrders } from '@/lib/fulfillment';
import { clearRate, isCurrency, refreshExchangeRates, saveManualRate, type CurrencyCode } from '@/lib/currency';

function fail(e: unknown) {
  return { ok: false as const, message: e instanceof Error ? e.message : 'Could not save that.' };
}

const locationSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(160),
  city: z.string().trim().min(2).max(100),
  country: z.string().trim().min(2).max(80),
  address: z.string().trim().min(6).max(500),
  phone: z.string().trim().max(40).optional().default(''),
  hours: z.string().trim().max(200).optional().default(''),
  image: z.string().trim().max(500).optional().default(''),
  mapUrl: z.string().trim().max(500).optional().default(''),
  latitude: z.string().trim().optional().default(''),
  longitude: z.string().trim().optional().default(''),
  active: z.boolean(),
  showOnHome: z.boolean(),
  position: z.number().int().min(0).max(999),
});

function coord(value: string) {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : Number.NaN;
}

export async function saveLocation(input: z.input<typeof locationSchema>) {
  await assertAdmin();
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };
  const d = parsed.data;
  const latitude = coord(d.latitude);
  const longitude = coord(d.longitude);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return { ok: false, message: 'Coordinates must be numbers, or left blank. Do not guess them.' };
  if ((latitude == null) !== (longitude == null)) return { ok: false, message: 'Enter both latitude and longitude, or leave both blank.' };
  if (latitude != null && (Math.abs(latitude) > 90 || Math.abs(longitude!) > 180)) return { ok: false, message: 'Those coordinates are outside the valid range.' };
  if (d.mapUrl && !/^https?:\/\//i.test(d.mapUrl)) return { ok: false, message: 'The map link must start with https://' };
  const db = await getDb();
  const values = {
    name: d.name,
    city: d.city,
    country: d.country,
    address: d.address,
    phone: d.phone || null,
    hours: d.hours || null,
    image: d.image || null,
    mapUrl: d.mapUrl || null,
    latitude,
    longitude,
    active: d.active,
    showOnHome: d.showOnHome,
    position: d.position,
    updatedAt: new Date(),
  };
  if (d.id) await db.update(storeLocations).set(values).where(eq(storeLocations.id, d.id));
  else await db.insert(storeLocations).values(values);
  revalidatePath('/');
  revalidatePath('/admin/locations');
  return { ok: true, message: 'Location saved. It appears on the homepage only if it is active and marked for the homepage.' };
}

export async function deleteLocation(id: number) {
  await assertAdmin();
  const db = await getDb();
  await db.delete(storeLocations).where(eq(storeLocations.id, id));
  revalidatePath('/');
  return { ok: true, message: 'Location deleted.' };
}

const serviceSchema = z.object({
  id: z.number().int().positive().optional(),
  code: z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/, 'Use a short code such as express or standard.'),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(400).optional().default(''),
  priceRupees: z.number().min(0).max(100000),
  durationDays: z.number().positive().max(60),
  active: z.boolean(),
  confirmHours: z.number().min(0).max(24 * 40).nullable(),
  processingHours: z.number().min(0).max(24 * 40).nullable(),
  shipHours: z.number().min(0).max(24 * 40).nullable(),
  outHours: z.number().min(0).max(24 * 40).nullable(),
  cutoffNote: z.string().trim().max(300).optional().default(''),
  position: z.number().int().min(0).max(99),
});

function hoursToMinutes(hours: number | null) {
  if (hours == null) return null;
  return Math.round(hours * 60);
}

export async function saveDeliveryService(input: z.input<typeof serviceSchema>) {
  await assertAdmin({ adminOnly: true });
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };
  const d = parsed.data;
  const db = await getDb();
  const values = {
    code: d.code,
    name: d.name,
    description: d.description || '',
    price: Math.round(d.priceRupees * 100),
    durationMinutes: daysToMinutes(d.durationDays),
    active: d.active,
    confirmMinutes: hoursToMinutes(d.confirmHours),
    processingMinutes: hoursToMinutes(d.processingHours),
    shipMinutes: hoursToMinutes(d.shipHours),
    outMinutes: hoursToMinutes(d.outHours),
    cutoffNote: d.cutoffNote || null,
    position: d.position,
    updatedAt: new Date(),
  };
  try {
    if (d.id) await db.update(deliveryServices).set(values).where(eq(deliveryServices.id, d.id));
    else await db.insert(deliveryServices).values(values);
  } catch (e) {
    return fail(e);
  }
  revalidatePath('/checkout');
  revalidatePath('/admin/delivery');
  return { ok: true, message: 'Delivery service saved. Existing orders keep the estimate they were placed with.' };
}

export async function deleteDeliveryService(id: number) {
  await assertAdmin({ adminOnly: true });
  const db = await getDb();
  await db.delete(deliveryServices).where(eq(deliveryServices.id, id));
  revalidatePath('/admin/delivery');
  return { ok: true, message: 'Delivery service deleted. Past orders are unchanged.' };
}

export async function runDeliveryCheck() {
  await assertAdmin();
  const result = await progressOrders();
  revalidatePath('/admin/orders');
  return { ok: true, message: `Checked ${result.checked} open orders. Advanced ${result.advanced}. Delivered is never set by this check.` };
}

export async function resolveDeliveryIssue(id: number, note: string) {
  const u = await assertAdmin();
  const db = await getDb();
  await db
    .update(deliveryIssues)
    .set({ status: 'resolved', resolvedAt: new Date(), resolvedBy: u.email, note: note.slice(0, 500) || null })
    .where(eq(deliveryIssues.id, id));
  revalidatePath('/admin/delivery');
  return { ok: true, message: 'Issue marked resolved. The order was not automatically marked delivered.' };
}

export async function refreshRatesAction() {
  await assertAdmin({ adminOnly: true });
  try {
    const result = await refreshExchangeRates();
    revalidatePath('/');
    return { ok: true, message: `Rates saved for ${result.saved.join(', ')} from the public source. Missing currencies were left unchanged.` };
  } catch (e) {
    return fail(e);
  }
}

export async function saveRateAction(code: string, perPkr: number) {
  await assertAdmin({ adminOnly: true });
  if (!isCurrency(code) || code === 'PKR') return { ok: false, message: 'Choose a display currency other than PKR.' };
  try {
    await saveManualRate(code as CurrencyCode, perPkr);
    revalidatePath('/');
    return { ok: true, message: `${code} rate saved as an admin rate. Payment is still collected in PKR.` };
  } catch (e) {
    return fail(e);
  }
}

export async function clearRateAction(code: string) {
  await assertAdmin({ adminOnly: true });
  if (!isCurrency(code)) return { ok: false, message: 'Unknown currency.' };
  await clearRate(code);
  return { ok: true, message: `${code} is unavailable until a real rate is saved. No invented rate was used.` };
}
