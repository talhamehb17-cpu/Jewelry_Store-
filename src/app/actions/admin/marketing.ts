'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { and, eq, ne } from 'drizzle-orm';
import { getDb } from '@/db';
import { campaigns } from '@/db/schema';
import { assertAdmin } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { syncCampaignClocks } from '@/lib/campaigns';
import { subscriberCount } from '@/lib/campaigns';
import { campaignEmailHtml } from '@/lib/email';
import { sendCampaignToSubscribers } from '@/lib/promotions';
import { absoluteUrl } from '@/lib/utils';
import { parsePkDateTime, slugify } from '@/lib/utils';
import { publicImage } from '@/lib/look';

const schema = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().min(2, 'Enter a campaign name.').max(160),
  description: z.string().trim().max(2000).default(''),
  percent: z.coerce.number().int().min(1, 'Discount must be at least 1%.').max(90, 'Discount cannot exceed 90%.'),
  image: z.string().trim().max(1000).optional().default(''),
  appliesTo: z.enum(['all', 'products', 'categories']),
  productIds: z.array(z.number().int()).max(500).default([]),
  categoryIds: z.array(z.number().int()).max(100).default([]),
  startsAt: z.string().min(1, 'Choose a start date and time.'),
  endsAt: z.string().min(1, 'Choose an end date and time.'),
  status: z.enum(['draft', 'scheduled', 'active', 'paused']),
  allowStacking: z.boolean().default(false),
  ctaLabel: z.string().trim().max(80).default('Shop the sale'),
  ctaHref: z.string().trim().max(300).default('/shop'),
});

export type CampaignInput = z.input<typeof schema>;

function clockStatus(wanted: 'draft' | 'scheduled' | 'active' | 'paused', start: Date, end: Date) {
  if (wanted === 'draft' || wanted === 'paused') return wanted;
  const now = new Date();
  if (end <= now) return 'expired' as const;
  if (start > now) return 'scheduled' as const;
  return 'active' as const;
}

export async function saveCampaign(input: CampaignInput) {
  await assertAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0]!.message };
  const d = parsed.data;
  const startsAt = parsePkDateTime(d.startsAt);
  const endsAt = parsePkDateTime(d.endsAt);
  if (!startsAt || !endsAt) return { ok: false as const, message: 'Enter a valid start and end time. Times are Pakistan time.' };
  if (endsAt <= startsAt) return { ok: false as const, message: 'The end time must be after the start time.' };
  if (d.appliesTo === 'products' && !d.productIds.length) return { ok: false as const, message: 'Choose at least one product, or apply the sale to everything.' };
  if (d.appliesTo === 'categories' && !d.categoryIds.length) return { ok: false as const, message: 'Choose at least one category.' };
  if (d.image && !/^(https?:\/\/|\/)/.test(d.image)) return { ok: false as const, message: 'The campaign image must be an uploaded file or an https URL.' };
  const image = d.image ? publicImage(d.image, '') : '';
  const db = await getDb();
  const base = slugify(d.name) || 'sale';
  let slug = base;
  const clash = await db.select({ id: campaigns.id, slug: campaigns.slug }).from(campaigns).where(and(eq(campaigns.slug, slug), d.id ? ne(campaigns.id, d.id) : undefined)).limit(1);
  if (clash.length) slug = `${base}-${Date.now().toString(36)}`;
  const values = {
    name: d.name,
    slug,
    description: d.description,
    percent: d.percent,
    image: image || null,
    appliesTo: d.appliesTo,
    productIds: d.appliesTo === 'products' ? d.productIds : [],
    categoryIds: d.appliesTo === 'categories' ? d.categoryIds : [],
    startsAt,
    endsAt,
    status: clockStatus(d.status, startsAt, endsAt),
    allowStacking: d.allowStacking,
    ctaLabel: d.ctaLabel || 'Shop the sale',
    ctaHref: d.ctaHref || '/shop',
    updatedAt: new Date(),
  };
  if (d.id) {
    const { slug: _slug, ...rest } = values;
    await db.update(campaigns).set(rest).where(eq(campaigns.id, d.id));
  } else {
    await db.insert(campaigns).values(values);
  }
  revalidatePath('/admin/marketing');
  revalidatePath('/', 'layout');
  return { ok: true as const, message: d.id ? 'Campaign updated.' : 'Campaign created. It will not email anyone until you confirm Send campaign email.' };
}

export async function setCampaignStatus(id: number, status: 'active' | 'paused' | 'draft') {
  await assertAdmin();
  const db = await getDb();
  const [row] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  if (!row) return { ok: false, message: 'Campaign not found.' };
  const next = status === 'active' ? clockStatus('active', row.startsAt, row.endsAt) : status;
  if (next === 'expired') return { ok: false, message: 'This campaign’s end time has passed. Edit the dates before activating it.' };
  await db.update(campaigns).set({ status: next, updatedAt: new Date() }).where(eq(campaigns.id, id));
  revalidatePath('/admin/marketing');
  revalidatePath('/', 'layout');
  return { ok: true, message: next === 'paused' ? 'Campaign paused. The discount has stopped.' : `Campaign is ${next}.` };
}

export async function deleteCampaign(id: number) {
  await assertAdmin();
  const db = await getDb();
  await db.delete(campaigns).where(eq(campaigns.id, id));
  revalidatePath('/admin/marketing');
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Campaign deleted. Past orders keep the discount that was charged.' };
}

export async function duplicateCampaign(id: number) {
  await assertAdmin();
  const db = await getDb();
  const [row] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  if (!row) return { ok: false, message: 'Campaign not found.' };
  await db.insert(campaigns).values({
    name: `Copy of ${row.name}`.slice(0, 160),
    slug: `${row.slug}-copy-${Date.now().toString(36)}`,
    description: row.description,
    percent: row.percent,
    image: row.image,
    appliesTo: row.appliesTo,
    productIds: row.productIds,
    categoryIds: row.categoryIds,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: 'draft',
    allowStacking: row.allowStacking,
    notifySubscribers: false,
    ctaLabel: row.ctaLabel,
    ctaHref: row.ctaHref,
  });
  revalidatePath('/admin/marketing');
  return { ok: true, message: 'Draft copy created. It is not live and no email was sent.' };
}

export async function sendCampaignEmail(id: number, confirm: boolean) {
  await assertAdmin({ adminOnly: true });
  if (!confirm) return { ok: false, message: 'Confirm the send before emailing subscribers.' };
  if (!rateLimit(`campaign-mail:${await clientIp()}`, 3, 60 * 60_000)) return { ok: false, message: 'Campaign email was sent recently. Wait before sending again.' };
  const result = await sendCampaignToSubscribers(id);
  revalidatePath('/admin/marketing');
  return result;
}

export async function previewCampaignEmail(id: number) {
  await assertAdmin();
  const db = await getDb();
  const [row] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  if (!row) return { ok: false as const, message: 'Campaign not found.', html: '', recipients: 0 };
  const recipients = await subscriberCount();
  const html = campaignEmailHtml({
    name: row.name,
    percent: row.percent,
    description: row.description,
    endsAt: row.endsAt,
    image: row.image,
    href: row.ctaHref || '/shop',
    unsubscribe: absoluteUrl('/unsubscribe?token=preview'),
  });
  return { ok: true as const, message: '', html, recipients };
}

export async function refreshCampaigns() {
  await assertAdmin();
  await syncCampaignClocks();
  revalidatePath('/admin/marketing');
  revalidatePath('/', 'layout');
}
