import { and, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { discounts, newsletterSubscribers, orders, productImages, products, productVariants, type Discount } from '@/db/schema';
import { getSettings, enabledShippingMethods } from './settings';
import { productIdsInCollections } from './catalog';
import { formatMoney } from './money';
import { campaignHit, discountPrice, getActiveCampaign } from './campaigns';
import { activeDeliveryServices, formatDuration } from './delivery';
import { evaluateHighValue, normalizeRule, normalizeShopping, type HighValueQuote } from './shopping-rules';
import { giftImage, giftLineCharge, normalizeGift, type GiftImage } from './gift-packaging';

export type CartLineInput = { variantId: number; quantity: number; giftPackaging?: boolean; giftImageId?: string | null };

export type QuoteLine = {
  variantId: number;
  productId: number;
  slug: string;
  name: string;
  variantTitle: string | null;
  image: string | null;
  unitPrice: number;
  catalogUnitPrice: number;
  compareAtPrice: number | null;
  categoryId: number | null;
  campaignHit: boolean;
  quantity: number;
  lineTotal: number;
  stock: number;
  sku: string | null;
  giftEligible: boolean;
  giftSelected: boolean;
  giftUnitPrice: number;
  giftLineTotal: number;
  giftImage: string | null;
  giftImageId: string | null;
};

export type Quote = {
  lines: QuoteLine[];
  itemCount: number;
  subtotal: number;
  discount: { id: number; code: string; amount: number; freeShipping: boolean; label: string } | null;
  discountError: string | null;
  campaign: { id: number; name: string; percent: number; amount: number; endsAt: string; href: string } | null;
  catalogSubtotal: number;
  shippingMethods: { id: string; name: string; description: string; price: number; originalPrice: number; durationMinutes: number | null }[];
  shippingMethod: string;
  shipping: number;
  codFee: number;
  tax: number;
  taxLabel: string;
  total: number;
  freeShippingThreshold: number;
  freeShippingRemaining: number;
  issues: string[];
  highValue: HighValueQuote;
  checkoutBlock: string | null;
  giftEnabled: boolean;
  giftUnitPrice: number;
  giftTotal: number;
  giftImages: GiftImage[];
};

export async function validateDiscount(
  code: string,
  ctx: { lines: QuoteLine[]; subtotal: number; email?: string; userId?: number | null },
): Promise<{ discount: Discount; eligible: number } | { error: string }> {
  const db = await getDb();
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { error: 'Enter a discount code.' };
  const [d] = await db.select().from(discounts).where(eq(sql`upper(${discounts.code})`, normalized)).limit(1);
  if (!d || !d.active) return { error: 'This discount code is not valid.' };
  const now = new Date();
  if (d.startsAt && d.startsAt > now) return { error: 'This discount is not active yet.' };
  if (d.endsAt && d.endsAt < now) return { error: 'This discount code has expired.' };
  if (d.usageLimit != null && d.usageCount >= d.usageLimit) return { error: 'This discount code has reached its usage limit.' };
  if (ctx.subtotal < d.minOrderAmount) return { error: `Add ${formatMoney(d.minOrderAmount - ctx.subtotal)} more to use ${d.code} (minimum order ${formatMoney(d.minOrderAmount)}).` };
  if (d.audience === 'subscribers') {
    const email = ctx.email?.trim().toLowerCase();
    if (!email) return { error: 'Enter the email you subscribed with before using this subscriber code.' };
    const [sub] = await db
      .select({ id: newsletterSubscribers.id })
      .from(newsletterSubscribers)
      .where(and(eq(sql`lower(${newsletterSubscribers.email})`, email), eq(newsletterSubscribers.status, 'subscribed')))
      .limit(1);
    if (!sub) return { error: 'This code is only for current newsletter subscribers.' };
  }

  let eligible = ctx.subtotal;
  if (d.appliesTo === 'products') {
    const ids = new Set(d.productIds ?? []);
    eligible = ctx.lines.filter((l) => ids.has(l.productId)).reduce((a, l) => a + l.lineTotal, 0);
  } else if (d.appliesTo === 'collections') {
    const ids = await productIdsInCollections(d.collectionIds ?? []);
    eligible = ctx.lines.filter((l) => ids.has(l.productId)).reduce((a, l) => a + l.lineTotal, 0);
  } else if (d.appliesTo === 'categories') {
    const ids = new Set(d.categoryIds ?? []);
    eligible = ctx.lines.filter((l) => l.categoryId != null && ids.has(l.categoryId)).reduce((a, l) => a + l.lineTotal, 0);
  }
  if (eligible <= 0 && d.type !== 'free_shipping') return { error: `${d.code} doesn’t apply to the items in your bag.` };

  const perUser = d.perUserLimit ?? (d.oncePerCustomer ? 1 : null);
  if (perUser && (ctx.email || ctx.userId)) {
    const conds = [ctx.email ? eq(sql`lower(${orders.email})`, ctx.email.toLowerCase()) : undefined, ctx.userId ? eq(orders.userId, ctx.userId) : undefined].filter(Boolean);
    const used = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.discountId, d.id), ne(orders.status, 'cancelled'), or(...(conds as never[]))))
      .limit(perUser);
    if (used.length >= perUser) return { error: perUser === 1 ? `${d.code} can only be used once per customer.` : `${d.code} has already been used ${perUser} times on this account.` };
  }
  return { discount: d, eligible };
}

async function eligibleSubtotal(d: Discount, lines: QuoteLine[]) {
  if (d.appliesTo === 'products') {
    const ids = new Set(d.productIds ?? []);
    return lines.filter((l) => ids.has(l.productId)).reduce((a, l) => a + l.lineTotal, 0);
  }
  if (d.appliesTo === 'collections') {
    const ids = await productIdsInCollections(d.collectionIds ?? []);
    return lines.filter((l) => ids.has(l.productId)).reduce((a, l) => a + l.lineTotal, 0);
  }
  if (d.appliesTo === 'categories') {
    const ids = new Set(d.categoryIds ?? []);
    return lines.filter((l) => l.categoryId != null && ids.has(l.categoryId)).reduce((a, l) => a + l.lineTotal, 0);
  }
  return lines.reduce((a, l) => a + l.lineTotal, 0);
}

export async function buildQuote(input: {
  lines: CartLineInput[];
  discountCode?: string | null;
  shippingMethod?: string | null;
  paymentMethod?: string | null;
  email?: string;
  userId?: number | null;
}): Promise<Quote> {
  const db = await getDb();
  const settings = await getSettings();
  const issues: string[] = [];
  const clean = input.lines
    .filter((l) => Number.isInteger(l.variantId) && l.variantId > 0)
    .map((l) => ({
      variantId: l.variantId,
      quantity: Math.min(20, Math.max(1, Math.floor(l.quantity) || 1)),
      giftPackaging: l.giftPackaging === true,
      giftImageId: typeof l.giftImageId === 'string' ? l.giftImageId.slice(0, 40) : null,
    }))
    .slice(0, 50);
  const ids = [...new Set(clean.map((l) => l.variantId))];
  const rows = ids.length
    ? await db
        .select({
          variantId: productVariants.id,
          variantTitle: productVariants.title,
          vPrice: productVariants.price,
          vCompare: productVariants.compareAtPrice,
          stock: productVariants.stock,
          sku: productVariants.sku,
          productId: products.id,
          slug: products.slug,
          name: products.name,
          price: products.price,
          compareAtPrice: products.compareAtPrice,
          categoryId: products.categoryId,
          status: products.status,
          giftPackaging: products.giftPackaging,
        })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(inArray(productVariants.id, ids))
    : [];
  const imgs = rows.length
    ? await db
        .select({ productId: productImages.productId, url: productImages.url, position: productImages.position })
        .from(productImages)
        .where(inArray(productImages.productId, [...new Set(rows.map((r) => r.productId))]))
    : [];

  const campaign = clean.length ? await getActiveCampaign() : null;
  const lines: QuoteLine[] = [];
  for (const l of clean) {
    const r = rows.find((x) => x.variantId === l.variantId);
    if (!r || r.status !== 'active') {
      issues.push('An item in your bag is no longer available and was removed.');
      continue;
    }
    let qty = l.quantity;
    if (r.stock <= 0) {
      issues.push(`${r.name} is sold out and was removed from your bag.`);
      continue;
    }
    if (qty > r.stock) {
      issues.push(`Only ${r.stock} of ${r.name} available — quantity updated.`);
      qty = r.stock;
    }
    const catalogUnit = r.vPrice ?? r.price;
    const hit = campaignHit(campaign, r.productId, r.categoryId);
    const unit = hit && campaign ? discountPrice(catalogUnit, campaign.percent) : catalogUnit;
    const image = imgs.filter((i) => i.productId === r.productId).sort((a, b) => a.position - b.position)[0]?.url ?? null;
    const wantGift = l.giftPackaging === true;
    const existing = lines.find((x) => x.variantId === r.variantId);
    if (existing) {
      existing.quantity = Math.min(r.stock, existing.quantity + qty);
      existing.lineTotal = existing.quantity * existing.unitPrice;
      if (wantGift) existing.giftSelected = true;
      if (!existing.giftImageId && l.giftImageId) existing.giftImageId = l.giftImageId;
      continue;
    }
    lines.push({
      variantId: r.variantId,
      productId: r.productId,
      slug: r.slug,
      name: r.name,
      variantTitle: r.variantTitle === 'Default' ? null : r.variantTitle,
      image,
      unitPrice: unit,
      catalogUnitPrice: catalogUnit,
      compareAtPrice: r.vCompare ?? r.compareAtPrice,
      categoryId: r.categoryId,
      campaignHit: hit,
      quantity: qty,
      lineTotal: unit * qty,
      stock: r.stock,
      sku: r.sku,
      giftEligible: false,
      giftSelected: wantGift,
      giftUnitPrice: 0,
      giftLineTotal: 0,
      giftImage: null,
      giftImageId: l.giftImageId,
    });
  }
  const gift = normalizeGift(settings.giftPackaging);
  let giftTotal = 0;
  for (const line of lines) {
    const row = rows.find((x) => x.variantId === line.variantId);
    const charge = giftLineCharge({
      enabled: gift.enabled,
      eligible: !!row?.giftPackaging,
      selected: line.giftSelected,
      unitPrice: gift.price,
      quantity: line.quantity,
    });
    line.giftEligible = gift.enabled && !!row?.giftPackaging;
    line.giftSelected = charge.total > 0 || (line.giftEligible && line.giftSelected && gift.price === 0);
    const image = line.giftSelected ? giftImage(gift, line.giftImageId) : null;
    line.giftUnitPrice = line.giftSelected ? gift.price : 0;
    line.giftLineTotal = line.giftSelected ? gift.price * line.quantity : 0;
    line.giftImage = image?.url ?? null;
    line.giftImageId = image?.id ?? null;
    giftTotal += line.giftLineTotal;
  }
  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
  const catalogSubtotal = lines.reduce((a, l) => a + l.catalogUnitPrice * l.quantity, 0);
  const campaignAmount = Math.max(0, catalogSubtotal - subtotal);
  const itemCount = lines.reduce((a, l) => a + l.quantity, 0);

  let discount: Quote['discount'] = null;
  let discountError: string | null = null;
  if (input.discountCode && lines.length) {
    const res = await validateDiscount(input.discountCode, { lines, subtotal, email: input.email, userId: input.userId });
    if ('error' in res) discountError = res.error;
    else {
      const d = res.discount;
      const stack = !!(d.stackable && campaign?.allowStacking);
      const eligible = !stack && lines.some((l) => l.campaignHit) ? await eligibleSubtotal(d, lines.filter((l) => !l.campaignHit)) : res.eligible;
      if (!stack && campaign && eligible <= 0 && d.type !== 'free_shipping') {
        discountError = 'This code can’t be combined with the current event sale. Only one promotional discount applies unless stacking is turned on for both.';
      } else {
        let amount = d.type === 'percentage' ? Math.round((eligible * Math.min(100, d.value)) / 100) : d.type === 'fixed' ? Math.min(d.value, eligible) : 0;
        if (d.type === 'percentage' && d.maxDiscount) amount = Math.min(amount, d.maxDiscount);
        const label = d.type === 'percentage' ? `${d.value}% off` : d.type === 'fixed' ? `${formatMoney(d.value)} off` : 'Free shipping';
        discount = { id: d.id, code: d.code, amount, freeShipping: d.type === 'free_shipping', label };
      }
    }
  }

  const afterDiscount = Math.max(0, subtotal - (discount?.amount ?? 0));
  const shopping = normalizeShopping(settings.shopping);
  const threshold = settings.shipping.freeThreshold;
  const services = await activeDeliveryServices();
  const source = services.length
    ? services.map((m) => ({ id: m.code, name: m.name, description: `${m.description} Estimate: ${formatDuration(m.durationMinutes)}. This is an estimate, not a guaranteed arrival.`, price: m.price, durationMinutes: m.durationMinutes }))
    : enabledShippingMethods(settings).map((m) => ({ id: m.id, name: m.name, description: m.description, price: m.price, durationMinutes: null as number | null }));
  const methods = source.map((m) => {
    const free = discount?.freeShipping || (m.id === 'standard' && threshold > 0 && afterDiscount >= threshold);
    return { id: m.id, name: m.name, description: m.description, originalPrice: m.price, price: free ? 0 : m.price, durationMinutes: m.durationMinutes };
  });
  const chosen = methods.find((m) => m.id === input.shippingMethod) ?? methods[0];
  const shipping = lines.length && chosen ? chosen.price : 0;
  const tax = settings.tax.enabled && !settings.tax.inclusive ? Math.round((afterDiscount * settings.tax.rate) / 100) : 0;
  const preFee = afterDiscount + shipping + tax;
  const rule = normalizeRule(shopping.highValue);
  const fee = settings.payments.cod.fee ?? 0;
  let codFee = input.paymentMethod === 'cod' ? fee : 0;
  let total = preFee + codFee + giftTotal;
  let highValue = evaluateHighValue({ total, subtotal, rule });
  if (highValue.applied && rule.allowRemainingCod && codFee === 0 && fee > 0) {
    codFee = fee;
    total = preFee + codFee + giftTotal;
    highValue = evaluateHighValue({ total, subtotal, rule });
  }
  const checkoutBlock = shopping.minOrderEnabled && shopping.minOrderAmount > 0 && subtotal < shopping.minOrderAmount
    ? `The minimum order is ${formatMoney(shopping.minOrderAmount)}.`
    : highValue.blocked;

  return {
    lines,
    itemCount,
    subtotal,
    discount,
    discountError,
    campaign: campaign && campaignAmount > 0 ? { id: campaign.id, name: campaign.name, percent: campaign.percent, amount: campaignAmount, endsAt: campaign.endsAt.toISOString(), href: campaign.ctaHref || '/shop' } : null,
    catalogSubtotal,
    shippingMethods: methods,
    shippingMethod: chosen?.id ?? 'standard',
    shipping,
    codFee,
    tax,
    taxLabel: settings.tax.label,
    total,
    freeShippingThreshold: threshold,
    freeShippingRemaining: Math.max(0, threshold - afterDiscount),
    issues,
    highValue,
    checkoutBlock,
    giftEnabled: gift.enabled,
    giftUnitPrice: gift.price,
    giftTotal,
    giftImages: gift.images,
  };
}
