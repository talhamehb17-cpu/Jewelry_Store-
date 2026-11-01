import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { categories, collectionProducts, collections, productImages, products, productVariants } from '@/db/schema';
import { ProductEditor, type EditorProduct } from '@/components/admin/product-editor';
import { toRupees } from '@/lib/money';

export const metadata = { title: 'Edit product' };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const [cats, cols] = await Promise.all([db.select().from(categories).orderBy(asc(categories.position)), db.select().from(collections).orderBy(asc(collections.position))]);
  const catList = cats.map((c) => ({ id: c.id, name: c.name }));
  const colList = cols.map((c) => ({ id: c.id, name: c.name, rule: c.rule }));
  if (id === 'new') {
    const blank: EditorProduct = {
      name: '', slug: '', subtitle: '', description: '', details: [], materials: [], care: 'Store in the pouch provided, away from moisture. Remove before swimming or bathing.', categoryId: null, collectionIds: [], status: 'draft',
      price: '', compareAtPrice: '', costPrice: '', sku: '', barcode: '', tags: [], badges: [], featured: false, videoUrl: '', seoTitle: '', seoDescription: '', images: [],
      variants: [{ size: null, color: null, sku: '', barcode: '', price: '', compareAtPrice: '', stock: 0, lowStockThreshold: 3 }],
    };
    return <ProductEditor initial={blank} categories={catList} collections={colList} />;
  }
  const pid = Number(id);
  if (!Number.isInteger(pid)) notFound();
  const [p] = await db.select().from(products).where(eq(products.id, pid)).limit(1);
  if (!p) notFound();
  const [imgs, vars, cps] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, pid)).orderBy(asc(productImages.position)),
    db.select().from(productVariants).where(eq(productVariants.productId, pid)).orderBy(asc(productVariants.position)),
    db.select().from(collectionProducts).where(eq(collectionProducts.productId, pid)),
  ]);
  const initial: EditorProduct = {
    name: p.name,
    slug: p.slug,
    subtitle: p.subtitle ?? '',
    description: p.description,
    details: p.details,
    materials: p.materials,
    care: p.care ?? '',
    categoryId: p.categoryId,
    collectionIds: cps.map((c) => c.collectionId),
    status: p.status as EditorProduct['status'],
    price: toRupees(p.price),
    compareAtPrice: toRupees(p.compareAtPrice),
    costPrice: toRupees(p.costPrice),
    sku: p.sku ?? '',
    barcode: p.barcode ?? '',
    tags: p.tags,
    badges: p.badges as EditorProduct['badges'],
    featured: p.featured,
    videoUrl: p.videoUrl ?? '',
    seoTitle: p.seoTitle ?? '',
    seoDescription: p.seoDescription ?? '',
    images: imgs.map((i) => ({ url: i.url, alt: i.alt ?? '' })),
    variants: vars.map((v) => ({ id: v.id, size: v.size, color: v.color, sku: v.sku ?? '', barcode: v.barcode ?? '', price: toRupees(v.price), compareAtPrice: toRupees(v.compareAtPrice), stock: v.stock, lowStockThreshold: v.lowStockThreshold })),
  };
  return <ProductEditor key={p.updatedAt.toISOString()} initial={initial} categories={catList} collections={colList} productId={pid} />;
}
