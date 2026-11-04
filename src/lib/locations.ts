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

function pair(lat: string, lng: string) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

/** Reads coordinates only when a saved map link already contains them. Does not geocode an address. */
export function coordsFromMapUrl(url: string | null) {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const at = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) return pair(at[1], at[2]);
  const d = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (d) return pair(d[1], d[2]);
  try {
    const q = new URL(url);
    const ll = q.searchParams.get('ll') || q.searchParams.get('q') || q.searchParams.get('query');
    const fromQuery = ll?.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
    if (fromQuery) return pair(fromQuery[1], fromQuery[2]);
    const mlat = q.searchParams.get('mlat');
    const mlon = q.searchParams.get('mlon');
    if (mlat && mlon) return pair(mlat, mlon);
  } catch {
    return null;
  }
  return null;
}

export function pinFor(row: { latitude: number | null; longitude: number | null; mapUrl: string | null }) {
  if (hasCoordinates(row)) return { latitude: row.latitude!, longitude: row.longitude! };
  return coordsFromMapUrl(row.mapUrl);
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
