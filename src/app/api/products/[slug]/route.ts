import { NextResponse } from 'next/server';
import { getProductBySlug } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const d = await getProductBySlug(slug);
  if (!d) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const p = d.product;
  return NextResponse.json({
    product: { id: p.id, slug: p.slug, name: p.name, subtitle: p.subtitle, description: p.description, price: p.price, compareAtPrice: p.compareAtPrice, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount },
    images: d.images.map((i) => ({ url: i.url, alt: i.alt })),
    variants: d.variants.map((v) => ({ id: v.id, title: v.title, size: v.size, color: v.color, stock: v.stock, price: v.price, compareAtPrice: v.compareAtPrice })),
  });
}
