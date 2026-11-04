import { and, eq, sql } from 'drizzle-orm';
import type { DB } from './index';
import { deliveryServices, pages, settings, storeLocations, themeConfigs } from './schema';
import { BRAND } from '@/lib/brand';

const DARK = {
  background: '#0C0B0A',
  surface: '#2A241E',
  text: '#F7F1E6',
  muted: '#D7C7B0',
  primary: '#C9A96E',
  primaryText: '#14110E',
  secondary: '#3A3128',
  accent: '#E4C98A',
  border: '#B08958',
  sale: '#E7A08A',
  headerBg: '#161310',
  headerText: '#F7F1E6',
  footerBg: '#100E0C',
  footerText: '#F7F1E6',
  announcementBg: '#C9A96E',
  announcementText: '#14110E',
};

function policy(phone: string, email: string) {
  const care = email || 'the address on the contact page';
  const line = phone || 'the number on the contact page';
  return {
    faq: `## Orders

### How do I place an order?
Choose a piece, add it to your bag, and checkout with Cash on Delivery, EasyPaisa, JazzCash or bank transfer. Card payment is not offered. EasyPaisa, JazzCash and bank transfer need a receipt before the order can be submitted. Uploading a receipt does not verify the payment.

### When is an order confirmed?
An order starts as Pending. It becomes Confirmed when the atelier confirms it, or when a submitted payment is verified. You can cancel from your account only while the status is Pending.

### Can I cancel after confirmation?
No. Once the order is Confirmed, Processing, Shipped or Out for delivery, the account cancellation button is removed. Contact client care on ${line} or ${care} and ask for help. The atelier can still cancel in exceptional cases, such as a stock problem, a payment problem or a duplicate order. A recorded refund is not the same as money already returned to you.

## Delivery

### Express and Normal delivery
The checkout shows the delivery services the atelier has switched on, including the current estimate and charge. An estimate such as 3.5 days is a planning figure, not a promise. Weather, verification and courier operations can change the actual day.

### What do the statuses mean?
Pending, Confirmed, Processing, Shipped, Out for delivery, and Delivered. A timer does not mark an order Delivered. About 10 minutes after the order is actually marked Out for delivery, a signed-in customer may be asked whether the package arrived. That question uses the real out-for-delivery time, not the original estimate. Yes records delivery. No opens a delivery issue and leaves the order undelivered. The atelier can also record delivery after checking, without waiting for the customer to return.

### What if it has not arrived?
Choose “No, I haven’t received it” on the prompt, or contact ${line}. The atelier investigates. The website will not tell you the parcel was delivered unless you or the atelier confirmed it.

## Money and email

### Which currency do I pay in?
Prices can be displayed in another currency when a real exchange rate is available. You pay the PKR total shown at checkout for Cash on Delivery, EasyPaisa, JazzCash and bank transfer. A display currency is not a card charge in that currency.

### Will I get emails?
Order emails go to the address on the order when the mailbox accepts them. Promotional emails go only to subscribed addresses and include unsubscribe. A failed mailbox does not mean the order failed.`,
    shipping: `## Estimates, not guarantees

Delivery times on the site are estimates configured by the atelier. They are not a guaranteed courier service. Actual delivery can move because of payment verification, stock, weather or the courier.

Express and Normal (or any other active service) show their current estimate and charge at checkout. The estimate saved on your order does not change if the atelier later edits the service.

## Status

An order moves through Pending, Confirmed, Processing, Shipped and Out for delivery. Standard and Express keep separate estimates. The clock starts when a manual payment is verified, or when the atelier confirms a Cash on Delivery order. Delivered is set when you confirm receipt, or when the atelier records it after checking. The timer alone never marks an order delivered.

About 10 minutes after the order is actually out for delivery, the site can ask if it arrived. If it has not, say so on the prompt or call ${line}. That opens a delivery issue. It does not invent a delivery.

## Charges

The charge you see at checkout is the charge saved on the order. Standard delivery may be complimentary above the threshold shown in the bag. That threshold is in PKR.

## Coverage

Pakistan addresses entered at checkout are accepted for delivery review. International shipping is not offered from this checkout.`,
    returns: `## Before the order is confirmed

You can cancel a Pending order from your account. Stock is returned. If a payment was only awaiting verification, cancelling does not by itself move money.

## After confirmation

The account cancellation button is removed. Contact ${line} or ${care}. The atelier can cancel later for a stock problem, a payment problem, a duplicate, a delivery problem or another exceptional case, and must record a reason.

## Refunds

If money was already collected, a refund has to be arranged. The website records a refund only when the atelier records one. It does not pretend a bank, EasyPaisa or JazzCash transfer has completed unless that record is made.

## Returns after delivery

Unworn pieces in original packaging can be discussed for return or exchange within 7 days of the delivery confirmation. Earrings are final sale for hygiene unless faulty. Engraved and made-to-order pieces are not returnable. Contact ${care} with the order number.`,
    terms: `## Prices

Catalogue prices are stored in Pakistani rupees. A currency selector changes the display only, using a saved exchange rate. If a rate is missing, that currency is unavailable. Checkout states the PKR amount you are expected to pay.

## Orders

Placing an order creates a Pending order. You may cancel it yourself only while it remains Pending. After confirmation, contact client care. The atelier may cancel and must record a reason. A payment receipt upload is not payment verification.

## Delivery

Delivery dates are estimates. The site does not mark an order delivered only because the estimate has passed.

## Payments

Cash on Delivery, bank transfer, EasyPaisa and JazzCash are the methods offered when enabled. Card payment is not offered.`,
  };
}

/** Additive operational setup. Does not delete customers, products or orders. */
export async function applyOperations(db: DB, log: (m: string) => void = () => {}) {
  const [storeRow] = await db.select().from(settings).where(eq(settings.key, 'store'));
  const store = (storeRow?.value && typeof storeRow.value === 'object' ? storeRow.value : {}) as Record<string, unknown>;
  store.name = BRAND.name;
  store.tagline = BRAND.tagline;
  if (store.address === '42-C Main Boulevard, Gulberg III, Lahore 54660, Pakistan') store.address = '';
  if (store.phone === '+92 300 1234567') store.phone = '';
  if (store.whatsapp === '923001234567') store.whatsapp = '';
  if (store.hours === 'Monday – Saturday, 11am – 8pm PKT') store.hours = '';
  if (storeRow) await db.update(settings).set({ value: store, updatedAt: new Date() }).where(eq(settings.key, 'store'));
  const phone = typeof store.phone === 'string' ? store.phone : '';
  const email = typeof store.email === 'string' ? store.email : '';
  const copy = policy(phone, email);
  const POLICY_VERSION = '2';
  const [policyMarker] = await db.select().from(settings).where(eq(settings.key, 'operations_policy_version'));
  const policyCurrent = policyMarker?.value === POLICY_VERSION || policyMarker?.value === (`"${POLICY_VERSION}"` as never);
  const pagesToWrite = [
    { slug: 'faq', title: 'Frequently Asked Questions', template: 'faq', content: copy.faq },
    { slug: 'shipping-policy', title: 'Shipping & delivery', template: 'policy', content: copy.shipping },
    { slug: 'return-policy', title: 'Cancellation & returns', template: 'policy', content: copy.returns },
    { slug: 'terms-of-service', title: 'Terms of Service', template: 'policy', content: copy.terms },
  ];
  if (!policyCurrent) {
    for (const page of pagesToWrite) {
      const [existing] = await db.select().from(pages).where(eq(pages.slug, page.slug)).limit(1);
      if (existing) {
        await db.update(pages).set({ title: page.title, content: page.content, updatedAt: new Date() }).where(eq(pages.id, existing.id));
      } else {
        await db.insert(pages).values({ ...page, status: 'published', system: true });
      }
    }
    await db
      .insert(settings)
      .values({ key: 'operations_policy_version', value: POLICY_VERSION })
      .onConflictDoUpdate({ target: settings.key, set: { value: POLICY_VERSION, updatedAt: new Date() } });
  }

  const [shipRow] = await db.select().from(settings).where(eq(settings.key, 'shipping'));
  const methods = ((shipRow?.value as { methods?: { id: string; price: number }[] } | undefined)?.methods ?? []);
  const priceOf = (id: string, fallback: number) => methods.find((m) => m.id === id)?.price ?? fallback;
  const existingServices = await db.select({ id: deliveryServices.id }).from(deliveryServices).limit(1);
  if (!existingServices.length) {
    await db.insert(deliveryServices).values([
      {
        code: 'express',
        name: 'Express Delivery',
        description: 'A shorter estimate. The atelier can change the duration; this is not a courier guarantee.',
        price: priceOf('express', 50000),
        durationMinutes: 84 * 60,
        confirmMinutes: 60,
        processingMinutes: 6 * 60,
        shipMinutes: null,
        outMinutes: null,
        position: 0,
        cutoffNote: 'Shipped and out for delivery stay manual unless the atelier turns those timers on.',
      },
      {
        code: 'standard',
        name: 'Normal Delivery',
        description: 'The ordinary estimate. Change it in Delivery settings if the atelier’s timing is different.',
        price: priceOf('standard', 25000),
        durationMinutes: Math.round(5.3 * 24 * 60),
        confirmMinutes: 2 * 60,
        processingMinutes: 12 * 60,
        shipMinutes: null,
        outMinutes: null,
        position: 1,
        cutoffNote: 'Example duration: 5.3 days. Edit it. It is not a fixed promise.',
      },
    ]);
    log('delivery services created as editable estimates');
  }
  const existingLocations = await db.select({ id: storeLocations.id }).from(storeLocations).limit(1);
  if (!existingLocations.length) {
    await db.insert(storeLocations).values([
      { name: 'A Mayfair jewelry evening', city: 'London', country: 'United Kingdom', address: 'Showcase destination — not an EVERMOON boutique.', hours: 'Sample card', image: '/images/locations/london.jpg', mapUrl: 'https://www.google.com/maps/search/?api=1&query=Mayfair+London', position: 0 },
      { name: 'A quiet salon by the Seine', city: 'Paris', country: 'France', address: 'Showcase destination — not an EVERMOON boutique.', hours: 'Sample card', image: '/images/locations/paris.jpg', mapUrl: 'https://www.google.com/maps/search/?api=1&query=Paris+France', position: 1 },
      { name: 'Gold light above the marina', city: 'Dubai', country: 'United Arab Emirates', address: 'Showcase destination — not an EVERMOON boutique.', hours: 'Sample card', image: '/images/locations/dubai.jpg', mapUrl: 'https://www.google.com/maps/search/?api=1&query=Dubai', position: 2 },
      { name: 'A townhouse jewelry counter', city: 'New York', country: 'United States', address: 'Showcase destination — not an EVERMOON boutique.', hours: 'Sample card', image: '/images/locations/new-york.jpg', mapUrl: 'https://www.google.com/maps/search/?api=1&query=New+York', position: 3 },
      { name: 'Lantern light on gold', city: 'Istanbul', country: 'Turkey', address: 'Showcase destination — not an EVERMOON boutique.', hours: 'Sample card', image: '/images/locations/istanbul.jpg', mapUrl: 'https://www.google.com/maps/search/?api=1&query=Istanbul', position: 4 },
      { name: 'A precise pearl atelier', city: 'Tokyo', country: 'Japan', address: 'Showcase destination — not an EVERMOON boutique.', hours: 'Sample card', image: '/images/locations/tokyo.jpg', mapUrl: 'https://www.google.com/maps/search/?api=1&query=Tokyo', position: 5 },
      { name: 'Afternoon light on emerald', city: 'Milan', country: 'Italy', address: 'Showcase destination — not an EVERMOON boutique.', hours: 'Sample card', image: '/images/locations/milan.jpg', mapUrl: 'https://www.google.com/maps/search/?api=1&query=Milan', position: 6 },
      { name: 'Courtyard gold at dusk', city: 'Lahore', country: 'Pakistan', address: 'Showcase destination — not an EVERMOON boutique.', hours: 'Sample card', image: '/images/locations/lahore.jpg', mapUrl: 'https://www.google.com/maps/search/?api=1&query=Lahore', position: 7 },
    ]);
    log('showcase locations created — not retail branches');
  }
  await db.update(deliveryServices).set({ shipMinutes: 24 * 60, outMinutes: 36 * 60 }).where(and(eq(deliveryServices.code, 'express'), sql`${deliveryServices.shipMinutes} is null`));
  await db.update(deliveryServices).set({ shipMinutes: 4 * 24 * 60, outMinutes: Math.round(5.5 * 24 * 60) }).where(and(eq(deliveryServices.code, 'standard'), sql`${deliveryServices.shipMinutes} is null`));
  const [timelineMarker] = await db.select().from(settings).where(eq(settings.key, 'delivery_timeline_v2'));
  if (!timelineMarker) {
    const { DEFAULT_TIMELINE } = await import('@/lib/delivery-schedule');
    await db.insert(settings).values({ key: 'delivery_automation', value: DEFAULT_TIMELINE }).onConflictDoNothing();
    const now = new Date();
    await db.update(deliveryServices).set({
      durationMinutes: DEFAULT_TIMELINE.standard.expectedMinutes,
      confirmMinutes: null,
      processingMinutes: DEFAULT_TIMELINE.standard.processingMinutes,
      shipMinutes: DEFAULT_TIMELINE.standard.shipDay * 1440,
      outMinutes: DEFAULT_TIMELINE.standard.outMinutes,
      description: 'About 6 days after the atelier confirms the order. An estimate, not a guarantee.',
      cutoffNote: 'Processing on day 2, shipped on day 4 evening Pakistan time, out for delivery at day 5.5. Delivered is never automatic.',
      updatedAt: now,
    }).where(eq(deliveryServices.code, 'standard'));
    await db.update(deliveryServices).set({
      durationMinutes: DEFAULT_TIMELINE.express.expectedMinutes,
      confirmMinutes: null,
      processingMinutes: DEFAULT_TIMELINE.express.processingMinutes,
      shipMinutes: DEFAULT_TIMELINE.express.shipMinutes,
      outMinutes: DEFAULT_TIMELINE.express.outMinutes,
      description: 'About 2–3 days after payment is verified. An estimate, not a guarantee.',
      cutoffNote: 'Processing at 12 hours, shipped at 1 day, out for delivery at 1.5 days. Delivered is never automatic.',
      updatedAt: now,
    }).where(eq(deliveryServices.code, 'express'));
    await db.insert(settings).values({ key: 'delivery_timeline_v2', value: '1' }).onConflictDoNothing();
    log('delivery timelines set for new confirmations — existing orders were not rewritten');
  }

  const [dark] = await db.select().from(themeConfigs).where(eq(themeConfigs.themeId, 'dark-luxury')).limit(1);
  if (dark?.published && typeof dark.published === 'object') {
    const published = structuredClone(dark.published) as { settings?: { colors?: Record<string, string>; header?: { logoText?: string }; layout?: { pdpVariant?: string } } };
    published.settings = published.settings ?? {};
    published.settings.colors = { ...DARK };
    published.settings.header = { ...(published.settings.header ?? {}), logoText: 'EVERMOON' };
    published.settings.layout = { ...(published.settings.layout ?? {}), pdpVariant: 'thumbs-left' };
    await db.update(themeConfigs).set({ published, updatedAt: new Date() }).where(eq(themeConfigs.themeId, 'dark-luxury'));
  }
  await db.execute(sql`update theme_configs set published = jsonb_set(published, '{settings,header,logoText}', '"EVERMOON"'::jsonb, true) where published is not null`);
  log('operations sync applied');
}
