import crypto from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db';
import { campaigns, newsletterSubscribers, productImages, products } from '@/db/schema';
import { arrivalEmailHtml, campaignEmailHtml } from './email';
import { deliverEmail } from './mailer';
import { absoluteUrl } from './utils';

async function subscribedList() {
  const db = await getDb();
  const rows = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.status, 'subscribed'));
  const missing = rows.filter((r) => !r.token);
  for (const row of missing) {
    const token = crypto.randomBytes(24).toString('hex');
    await db.update(newsletterSubscribers).set({ token }).where(and(eq(newsletterSubscribers.id, row.id), isNull(newsletterSubscribers.token)));
    row.token = token;
  }
  return rows.filter((r) => r.token);
}

export async function sendCampaignToSubscribers(campaignId: number) {
  const db = await getDb();
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  if (!campaign) return { ok: false as const, message: 'Campaign not found.', sent: 0, failed: 0 };
  const people = await subscribedList();
  if (!people.length) return { ok: false as const, message: 'There are no subscribed customers to email.', sent: 0, failed: 0 };
  let sent = 0;
  let failed = 0;
  let firstError = '';
  for (const person of people) {
    const html = campaignEmailHtml({
      name: campaign.name,
      percent: campaign.percent,
      description: campaign.description,
      endsAt: campaign.endsAt,
      image: campaign.image,
      href: campaign.ctaHref || '/shop',
      unsubscribe: absoluteUrl(`/unsubscribe?token=${person.token}`),
    });
    const res = await deliverEmail(person.email, `${campaign.name} — ${campaign.percent}% off`, html, { kind: 'campaign', campaignId: campaign.id });
    if (res.sent) sent += 1;
    else {
      failed += 1;
      firstError ||= res.error || 'Send failed';
    }
  }
  if (sent > 0) {
    await db.update(campaigns).set({ emailSentAt: new Date(), emailRecipientCount: sent, notifySubscribers: true, updatedAt: new Date() }).where(eq(campaigns.id, campaign.id));
  }
  if (!sent) return { ok: false as const, message: firstError || 'No emails were sent.', sent, failed };
  return { ok: true as const, message: `Sent to ${sent} subscriber${sent === 1 ? '' : 's'}${failed ? `. ${failed} failed.` : '.'}`, sent, failed };
}

export async function sendNewArrival(productId: number) {
  const db = await getDb();
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product || product.status !== 'active') return { ok: false as const, message: 'Only an active product can be announced.' };
  if (!product.badges?.includes('new')) return { ok: false as const, message: 'Mark the product as a New arrival before notifying subscribers.' };
  const [image] = await db.select({ url: productImages.url }).from(productImages).where(eq(productImages.productId, productId)).limit(1);
  const people = await subscribedList();
  if (!people.length) return { ok: false as const, message: 'There are no subscribed customers to email.' };
  let sent = 0;
  let failed = 0;
  let firstError = '';
  for (const person of people) {
    const html = arrivalEmailHtml({
      name: product.name,
      price: product.price,
      description: product.subtitle || product.description,
      image: image?.url,
      href: `/products/${product.slug}`,
      unsubscribe: absoluteUrl(`/unsubscribe?token=${person.token}`),
    });
    const res = await deliverEmail(person.email, `New arrival — ${product.name}`, html, { kind: `arrival:${productId}` });
    if (res.sent) sent += 1;
    else {
      failed += 1;
      firstError ||= res.error || 'Send failed';
    }
  }
  if (!sent) return { ok: false as const, message: firstError || 'No emails were sent.' };
  return { ok: true as const, message: `New-arrival email sent to ${sent} subscriber${sent === 1 ? '' : 's'}.` };
}
