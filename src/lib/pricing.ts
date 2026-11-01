import { and, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { discounts, orders, productImages, products, productVariants, type Discount } from '@/db/schema';
import { getSettings, enabledShippingMethods } from './settings';
import { productIdsInCollections } from './catalog';
import { formatMoney } from './money';

export type CartLineInput = { variantId: number; quantity: number };

export type QuoteLine = {
  variantId: number;
  productId: number;
  slug: string;
  name: string;
  variantTitle: string | null;
  image: string | null;
  unitPrice: number;
  compareAtPrice: number | null;
  quantity: number;
  lineTotal: number;
  stock: number;
  sku: string | null;
};

export type Quote = {
  lines: QuoteLine[];
  itemCount: number;
  subtotal: number;
  discount: { id: number; code: string; amount: number; freeShipping: boolean; label: string } | null;
  discountError: string | null;
  shippingMethods: { id: string; name: string; description: string; price: number; originalPrice: number }[];
  shippingMethod: string;
  shipping: number;
  codFee: number;
  tax: number;
  taxLabel: string;
  total: number;
  freeShippingThreshold: number;
  freeShippingRemaining: number;
  issues: string[];
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

  let eligible = ctx.subtotal;
  if (d.appliesTo === 'products') {
    const ids = new Set(d.productIds ?? []);
    eligible = ctx.lines.filter((l) => ids.has(l.productId)).reduce((a, l) => a + l.lineTotal, 0);
  } else if (d.appliesTo === 'collections') {
    const ids = await productIdsInCollections(d.collectionIds ?? []);
    eligible = ctx.lines.filter((l) => ids.has(l.productId)).reduce((a, l) => a + l.lineTotal, 0);
  }
  if (eligible <= 0 && d.type !== 'free_shipping') return { error: `${d.code} doesn’t apply to the items in your bag.` };

  if (d.oncePerCustomer && (ctx.email || ctx.userId)) {
    const conds = [ctx.email ? eq(sql`lower(${orders.email})`, ctx.email.toLowerCase()) : undefined, ctx.userId ? eq(orders.userId, ctx.userId) : undefined].filter(Boolean);
    const used = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.discountId, d.id), ne(orders.status, 'cancelled'), or(...(conds as never[]))))
      .limit(1);
    if (used.length) return { error: `${d.code} can only be used once per customer.` };
  }
  return { discount: d, eligible };
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
    .map((l) => ({ variantId: l.variantId, quantity: Math.min(20, Math.max(1, Math.floor(l.quantity) || 1)) }))
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
          status: products.status,
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
    const unit = r.vPrice ?? r.price;
    const image = imgs.filter((i) => i.productId === r.productId).sort((a, b) => a.position - b.position)[0]?.url ?? null;
    const existing = lines.find((x) => x.variantId === r.variantId);
    if (existing) {
      existing.quantity = Math.min(r.stock, existing.quantity + qty);
      existing.lineTotal = existing.quantity * existing.unitPrice;
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
      compareAtPrice: r.vCompare ?? r.compareAtPrice,
      quantity: qty,
      lineTotal: unit * qty,
      stock: r.stock,
      sku: r.sku,
    });
  }
  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
  const itemCount = lines.reduce((a, l) => a + l.quantity, 0);

  let discount: Quote['discount'] = null;
  let discountError: string | null = null;
  if (input.discountCode && lines.length) {
    const res = await validateDiscount(input.discountCode, { lines, subtotal, email: input.email, userId: input.userId });
    if ('error' in res) discountError = res.error;
    else {
      const d = res.discount;
      const amount = d.type === 'percentage' ? Math.round((res.eligible * Math.min(100, d.value)) / 100) : d.type === 'fixed' ? Math.min(d.value, res.eligible) : 0;
      const label = d.type === 'percentage' ? `${d.value}% off` : d.type === 'fixed' ? `${formatMoney(d.value)} off` : 'Free shipping';
      discount = { id: d.id, code: d.code, amount, freeShipping: d.type === 'free_shipping', label };
    }
  }

  const afterDiscount = Math.max(0, subtotal - (discount?.amount ?? 0));
  const threshold = settings.shipping.freeThreshold;
  const methods = enabledShippingMethods(settings).map((m) => {
    const free = discount?.freeShipping || (m.id === 'standard' && threshold > 0 && afterDiscount >= threshold);
    return { id: m.id, name: m.name, description: m.description, originalPrice: m.price, price: free ? 0 : m.price };
  });
  const chosen = methods.find((m) => m.id === input.shippingMethod) ?? methods[0];
  const shipping = lines.length && chosen ? chosen.price : 0;
  const codFee = input.paymentMethod === 'cod' ? settings.payments.cod.fee ?? 0 : 0;
  const tax = settings.tax.enabled && !settings.tax.inclusive ? Math.round((afterDiscount * settings.tax.rate) / 100) : 0;
  const total = afterDiscount + shipping + codFee + tax;

  return {
    lines,
    itemCount,
    subtotal,
    discount,
    discountError,
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
  };
}
