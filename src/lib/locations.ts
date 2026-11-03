import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { storeLocations } from '@/db/schema';

export async function listLocations() {
  const db = await getDb();
  return db.select().from(storeLocations).orderBy(asc(storeLocations.position), asc(storeLocations.id));
}

export async function homeLocations() {
  const rows = await listLocations();
  return rows.filter((r) => r.active && r.showOnHome);
}

export function hasCoordinates(row: { latitude: number | null; longitude: number | null }) {
  return row.latitude != null && row.longitude != null && Math.abs(row.latitude) <= 90 && Math.abs(row.longitude) <= 180;
}

export function directionsUrl(row: { latitude: number | null; longitude: number | null; mapUrl: string | null; address: string }) {
  if (row.mapUrl && /^https?:\/\//i.test(row.mapUrl)) return row.mapUrl;
  if (hasCoordinates(row)) return `https://www.openstreetmap.org/directions?to=${row.latitude}%2C${row.longitude}`;
  return null;
}

const PLACEHOLDER_ADDRESS = '42-C Main Boulevard, Gulberg III, Lahore 54660, Pakistan';
const PLACEHOLDER_PHONE = '+92 300 1234567';
const PLACEHOLDER_WHATSAPP = '923001234567';
const PLACEHOLDER_HOURS = 'Monday – Saturday, 11am – 8pm PKT';

/** Hides the old seed contact details. They were never a confirmed store. */
export function publicContact(store: { address?: string; phone?: string; whatsapp?: string; hours?: string; email?: string }) {
  return {
    address: store.address && store.address !== PLACEHOLDER_ADDRESS ? store.address : '',
    phone: store.phone && store.phone !== PLACEHOLDER_PHONE ? store.phone : '',
    whatsapp: store.whatsapp && store.whatsapp !== PLACEHOLDER_WHATSAPP ? store.whatsapp : '',
    hours: store.hours && store.hours !== PLACEHOLDER_HOURS ? store.hours : '',
    email: store.email || '',
  };
}

export function viewUrl(row: { latitude: number | null; longitude: number | null; mapUrl: string | null }) {
  if (row.mapUrl && /^https?:\/\//i.test(row.mapUrl)) return row.mapUrl;
  if (hasCoordinates(row)) return `https://www.openstreetmap.org/?mlat=${row.latitude}&mlon=${row.longitude}#map=16/${row.latitude}/${row.longitude}`;
  return null;
}
