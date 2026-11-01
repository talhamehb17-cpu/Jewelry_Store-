import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import type { DB } from './index';
import * as s from './schema';
import {
  CARE_DEFAULT,
  CITIES,
  CUSTOMER_NAMES,
  DEFAULT_SETTINGS,
  REVIEW_SNIPPETS,
  SEED_CATEGORIES,
  SEED_COLLECTIONS,
  SEED_DISCOUNTS,
  SEED_PAGES,
  SEED_PRODUCTS,
  STREETS,
} from './seed-data';

const DAY = 86_400_000;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function chunked<T>(rows: T[], size: number, fn: (part: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

export async function seedDatabase(db: DB, log: (m: string) => void = () => {}) {
  const rand = rng(20261101);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;
  const weighted = <T extends { weight: number }>(arr: T[]) => {
    const total = arr.reduce((a, b) => a + b.weight, 0);
    let r = rand() * total;
    for (const x of arr) {
      r -= x.weight;
      if (r <= 0) return x;
    }
    return arr[arr.length - 1]!;
  };
  const now = Date.now();
  const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

  /* --------------------------- settings --------------------------- */
  await db.insert(s.settings).values(Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value }))).onConflictDoNothing();

  /* ------------------------ categories ---------------------------- */
  const cats = await db
    .insert(s.categories)
    .values(SEED_CATEGORIES.map((c, i) => ({ ...c, position: i })))
    .returning();
  const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));
  log(`categories: ${cats.length}`);

  /* ------------------------ collections --------------------------- */
  const cols = await db
    .insert(s.collections)
    .values(
      SEED_COLLECTIONS.map((c, i) => ({
        slug: c.slug,
        name: c.name,
        description: c.description,
        image: c.image,
        rule: c.rule,
        ruleValue: 'ruleValue' in c ? c.ruleValue : null,
        featured: 'featured' in c ? !!c.featured : false,
        position: i,
      })),
    )
    .returning();
  const colId = Object.fromEntries(cols.map((c) => [c.slug, c.id]));

  /* -------------------------- products ---------------------------- */
  type VariantRow = typeof s.productVariants.$inferSelect;
  const productRows: { id: number; seed: (typeof SEED_PRODUCTS)[number]; variants: VariantRow[] }[] = [];
  for (const p of SEED_PRODUCTS) {
    const created = new Date(now - p.daysAgo * DAY);
    const [row] = await db
      .insert(s.products)
      .values({
        slug: p.slug,
        name: p.name,
        subtitle: p.subtitle,
        description: p.description,
        details: p.details,
        materials: p.materials,
        care: CARE_DEFAULT,
        categoryId: catId[p.category] ?? null,
        status: 'active',
        price: p.price * 100,
        compareAtPrice: p.compareAt ? p.compareAt * 100 : null,
        costPrice: p.cost ? p.cost * 100 : null,
        sku: p.sku,
        barcode: `890${String(1000000000 + Math.floor(rand() * 8999999999)).slice(0, 10)}`,
        tags: p.tags,
        badges: p.badges,
        featured: !!p.featured,
        videoUrl: p.videoUrl ?? null,
        seoTitle: `${p.name} — ${p.subtitle}`,
        seoDescription: p.description.slice(0, 155),
        createdAt: created,
        updatedAt: created,
      })
      .returning();
    await db.insert(s.productImages).values(p.images.map((url, i) => ({ productId: row!.id, url, alt: `${p.name}${i ? ' — worn' : ''}`, position: i })));

    const sizes = p.sizes ?? [null];
    const colors = p.colors ?? [null];
    const variants: (typeof s.productVariants.$inferInsert)[] = [];
    let pos = 0;
    for (const color of colors) {
      for (const size of sizes) {
        const key = [size, colors.length > 1 ? color : null].filter(Boolean).join('/');
        const stock = typeof p.stock === 'number' ? p.stock : (p.stock[key] ?? p.stock[size ?? ''] ?? 5);
        const title = [color, size].filter(Boolean).join(' / ') || 'Default';
        variants.push({
          productId: row!.id,
          title,
          size,
          color,
          sku: `${p.sku}${color ? '-' + color.replace(/\s+/g, '').slice(0, 3).toUpperCase() : ''}${size ? '-' + size.replace(/\s+/g, '').replace('.', '') : ''}`,
          barcode: `890${String(2000000000 + Math.floor(rand() * 7999999999)).slice(0, 10)}`,
          stock,
          lowStockThreshold: p.price > 50000 ? 1 : 3,
          position: pos++,
        });
      }
    }
    const vrows = await db.insert(s.productVariants).values(variants).returning();
    productRows.push({ id: row!.id, seed: p, variants: vrows });
    const manual = (p.collections ?? []).filter((c) => SEED_COLLECTIONS.find((x) => x.slug === c)?.rule === 'manual');
    if (manual.length) {
      await db.insert(s.collectionProducts).values(manual.map((slug, i) => ({ collectionId: colId[slug]!, productId: row!.id, position: i })));
    }
  }
  log(`products: ${productRows.length}`);

  /* --------------------------- users ------------------------------ */
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@maisonaurelle.pk').toLowerCase();
  let adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    adminPassword = isProd ? crypto.randomBytes(9).toString('base64url') : 'Aurelle#Dev2026';
    log(`SEED_ADMIN_PASSWORD not set — generated admin password: ${adminPassword}`);
  }
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD || (isProd ? crypto.randomBytes(9).toString('base64url') : 'Pearl#Dev2026');
  const [adminHash, customerHash, lockedHash] = await Promise.all([
    bcrypt.hash(adminPassword, 10),
    bcrypt.hash(customerPassword, 10),
    bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10),
  ]);
  await db.insert(s.users).values({ email: adminEmail, passwordHash: adminHash, firstName: 'Aurelle', lastName: 'Admin', role: 'admin', createdAt: new Date(now - 200 * DAY) });
  await db.insert(s.users).values({ email: 'studio@maisonaurelle.pk', passwordHash: lockedHash, firstName: 'Sana', lastName: 'Studio', role: 'staff', createdAt: new Date(now - 150 * DAY) });

  const customers = await db
    .insert(s.users)
    .values(
      CUSTOMER_NAMES.map(([first, last], i) => ({
        email: i === 0 ? 'ayesha@example.com' : `${first!.toLowerCase()}.${last!.toLowerCase()}${i > 30 ? i : ''}@example.com`,
        passwordHash: i === 0 ? customerHash : lockedHash,
        firstName: first!,
        lastName: last!,
        phone: `+92 3${Math.floor(rand() * 5)}${Math.floor(rand() * 10)} ${String(1000000 + Math.floor(rand() * 8999999))}`,
        role: 'customer',
        status: i === 37 ? 'disabled' : 'active',
        acceptsMarketing: rand() > 0.4,
        createdAt: new Date(now - (i === 0 ? 118 : Math.floor(5 + rand() * 115)) * DAY),
      })),
    )
    .returning();
  const addressRows = customers.map((c, i) => {
    const city = i === 0 ? CITIES[0]! : weighted(CITIES);
    return {
      userId: c.id,
      label: 'Home',
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone ?? '+92 300 0000000',
      line1: i === 0 ? '17-C, Gulberg II' : pick(STREETS),
      line2: null,
      city: city.city,
      province: city.province,
      postalCode: String(10000 + Math.floor(rand() * 89999)),
      country: 'Pakistan',
      isDefault: true,
    };
  });
  const addrs = await db.insert(s.addresses).values(addressRows).returning();
  await db.insert(s.addresses).values({ ...addressRows[0]!, label: 'Office', line1: '9th Floor, Arfa Software Technology Park, Ferozepur Road', isDefault: false });
  log(`users: ${customers.length + 2}`);

  /* ------------------------- discounts ---------------------------- */
  const discountRows = await db
    .insert(s.discounts)
    .values(
      SEED_DISCOUNTS.map((d) => ({
        code: d.code,
        description: d.description,
        type: d.type,
        value: d.value,
        minOrderAmount: d.minOrderAmount,
        appliesTo: 'appliesTo' in d ? d.appliesTo : 'all',
        collectionIds: 'collectionSlugs' in d ? d.collectionSlugs.map((c) => colId[c]!) : [],
        endsAt: 'endsInDays' in d ? new Date(now + d.endsInDays * DAY) : null,
        startsAt: 'endsInDays' in d && d.endsInDays < 0 ? new Date(now - 90 * DAY) : null,
        usageLimit: 'usageLimit' in d ? d.usageLimit : null,
        usageCount: 'usageCount' in d ? d.usageCount : 0,
        oncePerCustomer: 'oncePerCustomer' in d ? d.oncePerCustomer : false,
        active: true,
      })),
    )
    .returning();
  const discountByCode = Object.fromEntries(discountRows.map((d) => [d.code, d]));

  /* --------------------------- orders ----------------------------- */
  const popularity = productRows.map((p) => ({
    p,
    weight: (p.seed.badges.includes('bestseller') ? 3 : 1) * (p.seed.featured ? 1.5 : 1) * (p.seed.price > 60000 ? 0.35 : 1),
  }));
  const soldByVariant = new Map<number, number>();
  const movements: (typeof s.inventoryMovements.$inferInsert)[] = [];
  const orderSpecs: { createdAt: number; customer: (typeof customers)[number] | null; addrIdx: number }[] = [];
  const TOTAL = 210;
  for (let i = 0; i < TOTAL; i++) {
    const daysAgo = 120 * Math.pow(rand(), 1.3);
    const created = now - daysAgo * DAY - Math.floor(rand() * 10) * 3_600_000;
    const guest = rand() < 0.14;
    const ci = guest ? -1 : Math.floor(Math.pow(rand(), 1.4) * customers.length);
    orderSpecs.push({ createdAt: created, customer: guest ? null : customers[ci]!, addrIdx: ci });
  }
  // Guarantee a realistic history for the demo customer
  orderSpecs.push({ createdAt: now - 64 * DAY, customer: customers[0]!, addrIdx: 0 });
  orderSpecs.push({ createdAt: now - 6 * DAY, customer: customers[0]!, addrIdx: 0 });
  orderSpecs.push({ createdAt: now - 0.3 * DAY, customer: customers[0]!, addrIdx: 0 });
  orderSpecs.sort((a, b) => a.createdAt - b.createdAt);

  const ordersByCustomer = new Map<number, number>();
  const carriers = ['TCS', 'Leopards Courier', 'M&P'];
  const guestNames = [['Sobia', 'Rehman'], ['Maham', 'Ijaz'], ['Tooba', 'Kazmi'], ['Nida', 'Pervez'], ['Asma', 'Latif'], ['Mehak', 'Asghar']];
  let number = 10001;
  const allEvents: (typeof s.orderEvents.$inferInsert)[] = [];

  for (const spec of orderSpecs) {
    const age = (now - spec.createdAt) / DAY;
    const nItems = rand() < 0.62 ? 1 : rand() < 0.8 ? 2 : 3;
    const chosen = new Set<(typeof productRows)[number]>();
    let guard = 0;
    while (chosen.size < nItems && guard++ < 20) {
      const cand = weighted(popularity).p;
      if (spec.createdAt >= now - cand.seed.daysAgo * DAY) chosen.add(cand);
    }
    if (!chosen.size) chosen.add(productRows.find((p) => p.seed.slug === 'aurelia-gold-necklace')!);
    const items = [...chosen].map((p) => {
      const variant = pick(p.variants);
      const qty = rand() < 0.9 ? 1 : 2;
      const unit = variant.price ?? p.seed.price * 100;
      return { p, variant, qty, unit, line: unit * qty };
    });
    const subtotal = items.reduce((a, b) => a + b.line, 0);
    const cust = spec.customer;
    const prior = cust ? ordersByCustomer.get(cust.id) ?? 0 : 0;
    let discountCode: string | null = null;
    let discountTotal = 0;
    let freeShip = false;
    const r = rand();
    if (cust && prior === 0 && r < 0.18) {
      discountCode = 'WELCOME10';
      discountTotal = Math.round(subtotal * 0.1);
    } else if (subtotal >= 2500000 && r < 0.12) {
      discountCode = 'AURELLE15';
      discountTotal = Math.round(subtotal * 0.15);
    } else if (subtotal >= 1500000 && r < 0.08) {
      discountCode = 'EID2000';
      discountTotal = 200000;
    } else if (subtotal >= 500000 && r < 0.05) {
      discountCode = 'FREESHIP';
      freeShip = true;
    }
    const express = rand() < 0.2;
    const afterDiscount = subtotal - discountTotal;
    const shippingTotal = freeShip ? 0 : express ? 50000 : afterDiscount >= 1000000 ? 0 : 25000;
    const total = afterDiscount + shippingTotal;
    const pm = rand();
    const paymentMethod = pm < 0.55 ? 'cod' : pm < 0.73 ? 'bank' : pm < 0.88 ? 'wallet' : 'card';

    let status: string;
    const sr = rand();
    if (age > 10) status = sr < 0.89 ? 'delivered' : 'cancelled';
    else if (age > 4) status = sr < 0.42 ? 'delivered' : sr < 0.85 ? 'shipped' : sr < 0.95 ? 'processing' : 'cancelled';
    else if (age > 1) status = sr < 0.3 ? 'shipped' : sr < 0.65 ? 'processing' : sr < 0.9 ? 'confirmed' : 'pending';
    else status = sr < 0.6 ? 'pending' : 'confirmed';
    if (cust?.id === customers[0]!.id) status = age > 30 ? 'delivered' : age > 2 ? 'shipped' : 'pending';

    const created = new Date(spec.createdAt);
    const shippedAt = ['shipped', 'delivered'].includes(status) ? new Date(spec.createdAt + (1 + rand()) * DAY) : null;
    const deliveredAt = status === 'delivered' && shippedAt ? new Date(shippedAt.getTime() + (1.5 + rand() * 2.5) * DAY) : null;
    const cancelledAt = status === 'cancelled' ? new Date(spec.createdAt + rand() * DAY) : null;
    let paymentStatus = 'unpaid';
    let paidAt: Date | null = null;
    if (status === 'cancelled') paymentStatus = paymentMethod === 'card' ? 'refunded' : 'unpaid';
    else if (paymentMethod === 'card') {
      paymentStatus = 'paid';
      paidAt = created;
    } else if (paymentMethod === 'bank' || paymentMethod === 'wallet') {
      if (status === 'pending') paymentStatus = 'awaiting';
      else {
        paymentStatus = 'paid';
        paidAt = new Date(spec.createdAt + 3 * 3_600_000);
      }
    } else if (status === 'delivered') {
      paymentStatus = 'paid';
      paidAt = deliveredAt;
    }

    const addr = spec.addrIdx >= 0 ? addressRows[spec.addrIdx]! : null;
    const gname = pick(guestNames);
    const city = weighted(CITIES);
    const shippingAddress: s.OrderAddress = addr
      ? { firstName: addr.firstName, lastName: addr.lastName, phone: addr.phone, line1: addr.line1, line2: null, city: addr.city, province: addr.province, postalCode: addr.postalCode, country: 'Pakistan' }
      : { firstName: gname[0]!, lastName: gname[1]!, phone: `+92 300 ${String(1000000 + Math.floor(rand() * 8999999))}`, line1: pick(STREETS), line2: null, city: city.city, province: city.province, postalCode: null, country: 'Pakistan' };
    const email = cust ? cust.email : `${shippingAddress.firstName.toLowerCase()}.${shippingAddress.lastName.toLowerCase()}${Math.floor(rand() * 90 + 10)}@example.com`;

    const [order] = await db
      .insert(s.orders)
      .values({
        number: `AUR-${number++}`,
        userId: cust?.id ?? null,
        email,
        phone: shippingAddress.phone,
        customerName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
        status,
        paymentStatus,
        paymentMethod,
        paymentRef: paymentMethod === 'bank' ? `IBFT${Math.floor(rand() * 1e9)}` : paymentMethod === 'wallet' ? `TID${Math.floor(rand() * 1e10)}` : paymentMethod === 'card' ? `cs_demo_${Math.floor(rand() * 1e12).toString(36)}` : null,
        shippingMethod: express ? 'express' : 'standard',
        shippingMethodName: express ? 'Express Delivery' : 'Standard Delivery',
        shippingAddress,
        subtotal,
        discountTotal,
        shippingTotal,
        total,
        discountCode,
        discountId: discountCode ? discountByCode[discountCode]?.id ?? null : null,
        trackingCarrier: shippedAt ? pick(carriers) : null,
        trackingNumber: shippedAt ? String(Math.floor(1e11 + rand() * 9e11)) : null,
        refundedAmount: paymentStatus === 'refunded' ? total : 0,
        stockRestored: status === 'cancelled',
        paidAt,
        shippedAt,
        deliveredAt,
        cancelledAt,
        createdAt: created,
        updatedAt: deliveredAt ?? shippedAt ?? cancelledAt ?? created,
      })
      .returning();
    await db.insert(s.orderItems).values(
      items.map((it) => ({
        orderId: order!.id,
        productId: it.p.id,
        variantId: it.variant.id,
        name: it.p.seed.name,
        variantTitle: it.variant.title === 'Default' ? null : it.variant.title,
        sku: it.variant.sku,
        image: it.p.seed.images[0],
        unitPrice: it.unit,
        quantity: it.qty,
        lineTotal: it.line,
      })),
    );
    if (cust) ordersByCustomer.set(cust.id, prior + 1);

    allEvents.push({ orderId: order!.id, type: 'created', message: `Order placed via website (${paymentMethod.toUpperCase()})`, actor: 'customer', createdAt: created });
    if (paidAt && paymentMethod !== 'cod') allEvents.push({ orderId: order!.id, type: 'payment', message: paymentMethod === 'card' ? 'Card payment captured' : 'Payment verified by admin', actor: paymentMethod === 'card' ? 'system' : 'admin', createdAt: paidAt });
    if (status !== 'pending' && status !== 'cancelled') allEvents.push({ orderId: order!.id, type: 'status', message: 'Order confirmed', actor: 'admin', createdAt: new Date(spec.createdAt + 2 * 3_600_000) });
    if (shippedAt) allEvents.push({ orderId: order!.id, type: 'status', message: `Shipped via ${order!.trackingCarrier} · ${order!.trackingNumber}`, actor: 'admin', createdAt: shippedAt });
    if (deliveredAt) allEvents.push({ orderId: order!.id, type: 'status', message: 'Delivered to customer', actor: 'system', createdAt: deliveredAt });
    if (cancelledAt) allEvents.push({ orderId: order!.id, type: 'status', message: 'Order cancelled — stock restored', actor: 'admin', createdAt: cancelledAt });

    for (const it of items) {
      movements.push({ variantId: it.variant.id, productId: it.p.id, change: -it.qty, stockAfter: 0, reason: 'order', note: order!.number, orderId: order!.id, createdAt: created });
      if (status === 'cancelled') {
        movements.push({ variantId: it.variant.id, productId: it.p.id, change: it.qty, stockAfter: 0, reason: 'cancel', note: order!.number, orderId: order!.id, createdAt: cancelledAt! });
      } else {
        soldByVariant.set(it.variant.id, (soldByVariant.get(it.variant.id) ?? 0) + it.qty);
      }
    }
  }
  await chunked(allEvents, 400, (part) => db.insert(s.orderEvents).values(part));
  log(`orders: ${orderSpecs.length}`);

  /* ---------------- inventory history & sales counts ---------------- */
  const allMovements: (typeof s.inventoryMovements.$inferInsert)[] = [];
  for (const p of productRows) {
    let productSold = 0;
    for (const v of p.variants) {
      const own = movements.filter((m) => m.variantId === v.id).sort((a, b) => +a.createdAt! - +b.createdAt!);
      const net = own.reduce((a, m) => a + m.change, 0);
      let level = v.stock - net;
      allMovements.push({ variantId: v.id, productId: p.id, change: level, stockAfter: level, reason: 'initial', note: 'Opening stock', createdAt: new Date(now - p.seed.daysAgo * DAY) });
      for (const m of own) {
        level += m.change;
        allMovements.push({ ...m, stockAfter: level });
      }
      productSold += soldByVariant.get(v.id) ?? 0;
    }
    await db.update(s.products).set({ salesCount: productSold }).where(eqId(s.products.id, p.id));
  }
  const restockVariant = productRows.find((p) => p.seed.slug === 'luna-crescent-necklace')!.variants[1]!;
  allMovements.push({ variantId: restockVariant.id, productId: restockVariant.productId, change: 0, stockAfter: restockVariant.stock, reason: 'adjustment', note: 'Quarterly stock count — verified', createdAt: new Date(now - 3 * DAY) });
  await chunked(allMovements, 400, (part) => db.insert(s.inventoryMovements).values(part));

  /* --------------------------- reviews ---------------------------- */
  const reviewRows: (typeof s.reviews.$inferInsert)[] = [];
  for (const p of productRows) {
    const pool = REVIEW_SNIPPETS[p.seed.category] ?? REVIEW_SNIPPETS.necklaces!;
    const count = p.seed.badges.includes('bestseller') ? 4 + Math.floor(rand() * 3) : p.seed.daysAgo < 25 ? Math.floor(rand() * 2) : 1 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const snip = pool[(i + Math.floor(rand() * pool.length)) % pool.length]!;
      const c = pick(customers);
      const city = addrs.find((a) => a.userId === c.id)?.city ?? 'Lahore';
      reviewRows.push({
        productId: p.id,
        userId: c.id,
        name: `${c.firstName} ${c.lastName[0]}. · ${city}`,
        email: c.email,
        rating: snip.rating,
        title: snip.title,
        body: snip.body,
        status: 'published',
        verified: rand() < 0.8,
        createdAt: new Date(now - Math.min(p.seed.daysAgo - 1, Math.floor(rand() * 90)) * DAY),
      });
    }
  }
  reviewRows.push({ productId: productRows[0]!.id, name: 'Guest shopper', email: 'guest@example.com', rating: 4, title: 'Lovely chain', body: 'Beautiful necklace, slightly shorter than I expected at 16 inches.', status: 'pending', verified: false, createdAt: new Date(now - DAY) });
  await chunked(reviewRows, 200, (part) => db.insert(s.reviews).values(part));
  for (const p of productRows) {
    const rs = reviewRows.filter((r) => r.productId === p.id && r.status === 'published');
    if (!rs.length) continue;
    const avg = rs.reduce((a, r) => a + r.rating, 0) / rs.length;
    await db.update(s.products).set({ ratingAvg: Math.round(avg * 10) / 10, ratingCount: rs.length }).where(eqId(s.products.id, p.id));
  }
  log(`reviews: ${reviewRows.length}`);

  /* ----------------------- pages & misc --------------------------- */
  await db.insert(s.pages).values(SEED_PAGES.map((p) => ({ ...p, status: 'published', system: p.slug !== 'jewelry-care', seoTitle: p.title })));
  const subs = customers.filter((c) => c.acceptsMarketing).map((c) => ({ email: c.email, source: 'checkout', createdAt: c.createdAt }));
  ['noor.fatima@example.com', 'sehar.khan@example.com', 'mina.asif@example.com', 'rimsha.ali@example.com', 'zara.anwar@example.com'].forEach((email, i) =>
    subs.push({ email, source: 'footer', createdAt: new Date(now - (i * 7 + 2) * DAY) }),
  );
  await db.insert(s.newsletterSubscribers).values(subs).onConflictDoNothing();
  await db.insert(s.contactMessages).values([
    { name: 'Hira Ahmed', email: 'hira.ahmed@example.com', phone: '+92 321 4455667', subject: 'Bridal appointment', message: 'Assalam o Alaikum, I would like to book a bridal consultation for the Rania set next Saturday afternoon. Is the Gulberg atelier open?', createdAt: new Date(now - 2 * DAY) },
    { name: 'Komal Rafiq', email: 'komal.rafiq@example.com', subject: 'Ring sizing', message: 'Could you guide me on how to measure my ring size at home before ordering the Elara ring?', read: true, createdAt: new Date(now - 9 * DAY) },
    { name: 'Daniyal Khan', email: 'daniyal.k@example.com', subject: 'Engraving on Mehr bracelet', message: 'Can I get “M & D 14.02” engraved on the Mehr ID bracelet as an anniversary gift?', createdAt: new Date(now - 0.5 * DAY) },
  ]);
  const wish = ['celestine-pearl-necklace', 'elara-solitaire-ring', 'isabella-gold-hoops'];
  await db.insert(s.wishlistItems).values(wish.map((slug) => ({ userId: customers[0]!.id, productId: productRows.find((p) => p.seed.slug === slug)!.id })));
  log('pages, subscribers, messages and wishlist seeded');
}

import { eq } from 'drizzle-orm';
function eqId(col: typeof s.products.id, id: number) {
  return eq(col, id);
}
