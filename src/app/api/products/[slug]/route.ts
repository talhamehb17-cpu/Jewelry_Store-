import { NextResponse } from 'next/server';
import { getProductBySlug } from '@/lib/catalog';
import { campaignHit, getActiveCampaign, presentPrice } from '@/lib/campaigns';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const d = await getProductBySlug(slug);
  if (!d) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const p = d.product;
  const campaign = await getActiveCampaign();
  const onSale = campaignHit(campaign, p.id, p.categoryId);
  const priced = presentPrice(p.price, p.compareAtPrice, onSale, campaign?.percent ?? 0);
  return NextResponse.json({
    product: { id: p.id, slug: p.slug, name: p.name, subtitle: p.subtitle, description: p.description, price: priced.price, compareAtPrice: priced.compareAt, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount },
    images: d.images.map((i) => ({ url: i.url, alt: i.alt })),
    variants: d.variants.map((v) => {
      const shown = presentPrice(v.price ?? p.price, v.compareAtPrice ?? p.compareAtPrice, onSale, campaign?.percent ?? 0);
      return { id: v.id, title: v.title, size: v.size, color: v.color, stock: v.stock, price: shown.price, compareAtPrice: shown.compareAt };
    }),
  });
}
