import { cache } from 'react';
import { and, asc, desc, eq, gt, gte, inArray, lte, ne, sql, type SQL } from 'drizzle-orm';
import { getDb } from '@/db';
import { categories, collectionProducts, collections, productImages, products, productVariants, reviews, type Collection } from '@/db/schema';

export type CardProduct = {
  id: number;
  slug: string;
  name: string;
  subtitle: string | null;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  image2: string | null;
  badges: string[];
  ratingAvg: number;
  ratingCount: number;
  inStock: boolean;
  lowStock: boolean;
  variantCount: number;
  defaultVariantId: number | null;
  category: string | null;
  categorySlug: string | null;
  isNew: boolean;
  materials: string[];
};

export type SortKey = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'bestselling' | 'rating';
export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'bestselling', label: 'Best selling' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
];

export type ProductFilters = {
  q?: string;
  category?: string;
  collection?: Collection | null;
  materials?: string[];
  sizes?: string[];
  colors?: string[];
  minPrice?: number; // minor units
  maxPrice?: number;
  availability?: 'in' | 'out';
  sort?: SortKey;
  page?: number;
  perPage?: number;
  ids?: number[];
};

const NEW_DAYS = 45;

function textArray(values: string[]) {
  return sql`ARRAY[${sql.join(values.map((v) => sql`${v}`), sql`, `)}]::text[]`;
}

/** Conditions that define the browsing scope (category / collection / search) — facets are computed within it. */
function scopeConditions(f: ProductFilters): SQL[] {
  const conds: SQL[] = [eq(products.status, 'active')];
  if (f.ids?.length) conds.push(inArray(products.id, f.ids));
  if (f.category) conds.push(sql`${products.categoryId} = (select id from categories where slug = ${f.category})`);
  if (f.q?.trim()) {
    const like = `%${f.q.trim().replace(/[%_]/g, (m) => '\\' + m)}%`;
    conds.push(
      sql`(${products.name} ilike ${like} or ${products.subtitle} ilike ${like} or ${products.description} ilike ${like} or ${products.tags}::text ilike ${like} or ${products.materials}::text ilike ${like} or exists (select 1 from categories c where c.id = ${products.categoryId} and c.name ilike ${like}))`,
    );
  }
  const c = f.collection;
  if (c) {
    if (c.rule === 'manual') conds.push(sql`${products.id} in (select product_id from collection_products where collection_id = ${c.id})`);
    else if (c.rule === 'category' && c.ruleValue) conds.push(sql`${products.categoryId} = (select id from categories where slug = ${c.ruleValue})`);
    else if (c.rule === 'sale') conds.push(sql`${products.compareAtPrice} > ${products.price}`);
    else if (c.rule === 'new') conds.push(gte(products.createdAt, new Date(Date.now() - NEW_DAYS * 86_400_000)));
    else if (c.rule === 'bestsellers') conds.push(sql`${products.id} in (select id from products where status = 'active' and sales_count > 0 order by sales_count desc limit 12)`);
  }
  return conds;
}

function filterConditions(f: ProductFilters): SQL[] {
  const conds: SQL[] = [];
  if (f.materials?.length) conds.push(sql`${products.materials} ?| ${textArray(f.materials)}`);
  if (f.sizes?.length) conds.push(sql`exists (select 1 from product_variants v where v.product_id = ${products.id} and v.size = any(${textArray(f.sizes)}))`);
  if (f.colors?.length) conds.push(sql`exists (select 1 from product_variants v where v.product_id = ${products.id} and v.color = any(${textArray(f.colors)}))`);
  if (f.minPrice != null) conds.push(gte(products.price, f.minPrice));
  if (f.maxPrice != null) conds.push(lte(products.price, f.maxPrice));
  if (f.availability === 'in') conds.push(sql`exists (select 1 from product_variants v where v.product_id = ${products.id} and v.stock > 0)`);
  if (f.availability === 'out') conds.push(sql`not exists (select 1 from product_variants v where v.product_id = ${products.id} and v.stock > 0)`);
  return conds;
}

function orderBy(sort: SortKey | undefined, collection?: Collection | null) {
  switch (sort) {
    case 'newest':
      return [desc(products.createdAt)];
    case 'price-asc':
      return [asc(products.price)];
    case 'price-desc':
      return [desc(products.price)];
    case 'bestselling':
      return [desc(products.salesCount), desc(products.createdAt)];
    case 'rating':
      return [desc(products.ratingAvg), desc(products.ratingCount)];
    default:
      if (collection?.rule === 'new') return [desc(products.createdAt)];
      if (collection?.rule === 'bestsellers') return [desc(products.salesCount)];
      return [desc(products.featured), desc(products.salesCount), desc(products.createdAt)];
  }
}

export async function hydrateCards(rows: (typeof products.$inferSelect)[]): Promise<CardProduct[]> {
  if (!rows.length) return [];
  const db = await getDb();
  const ids = rows.map((r) => r.id);
  const [imgs, vars, cats] = await Promise.all([
    db.select({ productId: productImages.productId, url: productImages.url, position: productImages.position }).from(productImages).where(inArray(productImages.productId, ids)).orderBy(asc(productImages.position)),
    db
      .select({ productId: productVariants.productId, id: productVariants.id, stock: productVariants.stock, threshold: productVariants.lowStockThreshold, position: productVariants.position })
      .from(productVariants)
      .where(inArray(productVariants.productId, ids))
      .orderBy(asc(productVariants.position)),
    db.select({ id: categories.id, name: categories.name, slug: categories.slug }).from(categories),
  ]);
  const catMap = new Map(cats.map((c) => [c.id, c]));
  const newCutoff = Date.now() - NEW_DAYS * 86_400_000;
  return rows.map((p) => {
    const pi = imgs.filter((i) => i.productId === p.id);
    const pv = vars.filter((v) => v.productId === p.id);
    const total = pv.reduce((a, v) => a + Math.max(0, v.stock), 0);
    const cat = p.categoryId ? catMap.get(p.categoryId) : undefined;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      subtitle: p.subtitle,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      image: pi[0]?.url ?? null,
      image2: pi[1]?.url ?? null,
      badges: p.badges ?? [],
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      inStock: total > 0,
      lowStock: total > 0 && pv.some((v) => v.stock > 0 && v.stock <= v.threshold) && total <= 5,
      variantCount: pv.length,
      defaultVariantId: pv.length === 1 ? pv[0]!.id : (pv.find((v) => v.stock > 0)?.id ?? pv[0]?.id ?? null),
      category: cat?.name ?? null,
      categorySlug: cat?.slug ?? null,
      isNew: +p.createdAt > newCutoff,
      materials: p.materials ?? [],
    };
  });
}

export async function listProducts(f: ProductFilters) {
  const db = await getDb();
  const perPage = Math.min(48, Math.max(1, f.perPage ?? 12));
  const page = Math.max(1, f.page ?? 1);
  const where = and(...scopeConditions(f), ...filterConditions(f));
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(products).where(where).orderBy(...orderBy(f.sort, f.collection)).limit(perPage).offset((page - 1) * perPage),
    db.select({ count: sql<number>`count(*)::int` }).from(products).where(where),
  ]);
  return { items: await hydrateCards(rows), total: Number(count), page, perPage, pages: Math.max(1, Math.ceil(Number(count) / perPage)) };
}

export type Facets = { materials: string[]; sizes: string[]; colors: string[]; minPrice: number; maxPrice: number };

export async function getFacets(f: ProductFilters): Promise<Facets> {
  const db = await getDb();
  const scope = and(...scopeConditions(f));
  const [mats, sizes, colors, range] = await Promise.all([
    db.execute(sql`select distinct m as value from products, jsonb_array_elements_text(products.materials) m where ${scope} order by 1`),
    db.execute(sql`select distinct v.size as value from product_variants v join products on products.id = v.product_id where ${scope} and v.size is not null`),
    db.execute(sql`select distinct v.color as value from product_variants v join products on products.id = v.product_id where ${scope} and v.color is not null order by 1`),
    db.execute(sql`select coalesce(min(price),0)::int as min, coalesce(max(price),0)::int as max from products where ${scope}`),
  ]);
  const val = (r: { rows: unknown[] }) => (r.rows as { value: string }[]).map((x) => x.value);
  const sizeOrder = (a: string, b: string) => {
    const order = ['Small', 'Medium', 'Large'];
    const na = parseFloat(a);
    const nb = parseFloat(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb || a.localeCompare(b);
    if (order.includes(a) && order.includes(b)) return order.indexOf(a) - order.indexOf(b);
    return a.localeCompare(b);
  };
  const rr = (range.rows as { min: number; max: number }[])[0] ?? { min: 0, max: 0 };
  return { materials: val(mats), sizes: val(sizes).sort(sizeOrder), colors: val(colors), minPrice: Number(rr.min), maxPrice: Number(rr.max) };
}

export const getCategories = cache(async () => {
  const db = await getDb();
  return db.select().from(categories).orderBy(asc(categories.position));
});

export const getCollections = cache(async (opts: { includeHidden?: boolean } = {}) => {
  const db = await getDb();
  const rows = await db.select().from(collections).orderBy(asc(collections.position));
  return opts.includeHidden ? rows : rows.filter((c) => c.status === 'active');
});

export const getCollectionBySlug = cache(async (slug: string) => {
  const db = await getDb();
  const [c] = await db.select().from(collections).where(eq(collections.slug, slug)).limit(1);
  return c ?? null;
});

export const getProductBySlug = cache(async (slug: string, opts: { includeDrafts?: boolean } = {}) => {
  const db = await getDb();
  const [p] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!p || (p.status !== 'active' && !opts.includeDrafts)) return null;
  const [images, variants, cat, revs] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, p.id)).orderBy(asc(productImages.position)),
    db.select().from(productVariants).where(eq(productVariants.productId, p.id)).orderBy(asc(productVariants.position)),
    p.categoryId ? db.select().from(categories).where(eq(categories.id, p.categoryId)).limit(1) : Promise.resolve([]),
    db
      .select()
      .from(reviews)
      .where(and(eq(reviews.productId, p.id), eq(reviews.status, 'published')))
      .orderBy(desc(reviews.createdAt))
      .limit(50),
  ]);
  const distribution = [5, 4, 3, 2, 1].map((star) => ({ star, count: revs.filter((r) => r.rating === star).length }));
  return { product: p, images, variants, category: cat[0] ?? null, reviews: revs, distribution };
});

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

export async function getCardsBySlugs(slugs: string[]) {
  if (!slugs.length) return [];
  const db = await getDb();
  const rows = await db.select().from(products).where(and(inArray(products.slug, slugs), eq(products.status, 'active')));
  const cards = await hydrateCards(rows);
  return slugs.map((s) => cards.find((c) => c.slug === s)).filter((c): c is CardProduct => !!c);
}

export async function getCardsByIds(ids: number[]) {
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db.select().from(products).where(and(inArray(products.id, ids), eq(products.status, 'active')));
  const cards = await hydrateCards(rows);
  return ids.map((id) => cards.find((c) => c.id === id)).filter((c): c is CardProduct => !!c);
}

export async function getProductsForSection(settings: { source?: string; collection?: string; category?: string; products?: string[]; limit?: number }) {
  const limit = Math.min(16, Math.max(1, Number(settings.limit) || 8));
  switch (settings.source) {
    case 'manual':
      return getCardsBySlugs((settings.products ?? []).slice(0, limit));
    case 'new':
      return (await listProducts({ sort: 'newest', perPage: limit })).items;
    case 'sale':
      return (await listProducts({ collection: { rule: 'sale' } as Collection, perPage: limit, sort: 'bestselling' })).items;
    case 'featured': {
      const db = await getDb();
      const rows = await db.select().from(products).where(and(eq(products.status, 'active'), eq(products.featured, true))).orderBy(desc(products.salesCount)).limit(limit);
      return hydrateCards(rows);
    }
    case 'collection': {
      const c = settings.collection ? await getCollectionBySlug(settings.collection) : null;
      return (await listProducts({ collection: c, perPage: limit })).items;
    }
    case 'category':
      return (await listProducts({ category: settings.category, perPage: limit, sort: 'bestselling' })).items;
    default:
      return (await listProducts({ sort: 'bestselling', perPage: limit })).items;
  }
}

export async function getRelatedProducts(productId: number, categoryId: number | null, limit = 8) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.status, 'active'), ne(products.id, productId), categoryId ? eq(products.categoryId, categoryId) : undefined))
    .orderBy(desc(products.salesCount))
    .limit(limit);
  return hydrateCards(rows);
}

/** Pieces that style well together: shared manual collections, different category. */
export async function getCompleteTheLook(productId: number, categoryId: number | null, limit = 4) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.status, 'active'),
        ne(products.id, productId),
        categoryId ? ne(products.categoryId, categoryId) : undefined,
        sql`${products.id} in (select cp2.product_id from collection_products cp1 join collection_products cp2 on cp1.collection_id = cp2.collection_id where cp1.product_id = ${productId})`,
      ),
    )
    .orderBy(desc(products.salesCount))
    .limit(limit);
  let cards = await hydrateCards(rows);
  if (cards.length < limit) {
    const extra = await db
      .select()
      .from(products)
      .where(and(eq(products.status, 'active'), ne(products.id, productId), categoryId ? ne(products.categoryId, categoryId) : undefined, gt(products.salesCount, 0)))
      .orderBy(desc(products.salesCount))
      .limit(limit * 2);
    const more = await hydrateCards(extra.filter((e) => !cards.some((c) => c.id === e.id)));
    cards = [...cards, ...more].slice(0, limit);
  }
  return cards;
}

export async function searchSuggestions(q: string) {
  const term = q.trim();
  if (term.length < 2) return { products: [], collections: [], categories: [] };
  const like = `%${term.replace(/[%_]/g, (m) => '\\' + m)}%`;
  const db = await getDb();
  const [prod, cols, cats] = await Promise.all([
    listProducts({ q: term, perPage: 6, sort: 'bestselling' }),
    db.select({ slug: collections.slug, name: collections.name }).from(collections).where(and(eq(collections.status, 'active'), sql`${collections.name} ilike ${like}`)).limit(4),
    db.select({ slug: categories.slug, name: categories.name }).from(categories).where(sql`${categories.name} ilike ${like}`).limit(4),
  ]);
  return { products: prod.items, total: prod.total, collections: cols, categories: cats };
}

/** Returns the set of product ids that belong to any of the given collections (respecting rules). */
export async function productIdsInCollections(collectionIds: number[]): Promise<Set<number>> {
  const out = new Set<number>();
  if (!collectionIds.length) return out;
  const db = await getDb();
  const cols = await db.select().from(collections).where(inArray(collections.id, collectionIds));
  for (const c of cols) {
    if (c.rule === 'manual') {
      const rows = await db.select({ id: collectionProducts.productId }).from(collectionProducts).where(eq(collectionProducts.collectionId, c.id));
      rows.forEach((r) => out.add(r.id));
    } else {
      const rows = await db.select({ id: products.id }).from(products).where(and(...scopeConditions({ collection: c })));
      rows.forEach((r) => out.add(r.id));
    }
  }
  return out;
}
