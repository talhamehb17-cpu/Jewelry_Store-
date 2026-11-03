import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck } from 'lucide-react';
import { Img } from '@/components/ui/img';
import { ProductGallery, type Media } from '@/components/store/product-gallery';
import { ProductPurchase } from '@/components/store/product-purchase';
import { RecentlyViewed, ReviewForm, TrackRecentlyViewed } from '@/components/store/product-extras';
import { ProductCard } from '@/components/store/product-card';
import { Rail } from '@/components/sections/slider';
import { Stars } from '@/components/ui/bits';
import { getCompleteTheLook, getProductBySlug, getRelatedProducts } from '@/lib/catalog';
import { campaignHit, getActiveCampaign, presentPrice } from '@/lib/campaigns';
import { getThemeContext } from '@/lib/theme-server';
import { getSettings } from '@/lib/settings';
import { getCurrentUser } from '@/lib/auth';
import { absoluteUrl, cn, formatDate, jsonLd } from '@/lib/utils';
import { isRemote } from '@/lib/images';

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const d = await getProductBySlug(slug);
  if (!d) return { title: 'Product not found', robots: { index: false } };
  const p = d.product;
  const img = d.images[0]?.url;
  return {
    title: p.seoTitle || p.name,
    description: p.seoDescription || p.description.slice(0, 160),
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { type: 'website', title: p.name, description: p.description.slice(0, 200), images: img ? [{ url: isRemote(img) ? `${img.split('?')[0]}?auto=format&w=1200&q=80` : absoluteUrl(img) }] : undefined },
  };
}

export default async function ProductPage({ params }: P) {
  const { slug } = await params;
  const d = await getProductBySlug(slug);
  if (!d) notFound();
  const p = d.product;
  const [ctx, settings, related, look, user, campaign] = await Promise.all([
    getThemeContext(),
    getSettings(),
    getRelatedProducts(p.id, p.categoryId),
    getCompleteTheLook(p.id, p.categoryId),
    getCurrentUser(),
    getActiveCampaign(),
  ]);
  const onSale = campaignHit(campaign, p.id, p.categoryId);
  const priced = presentPrice(p.price, p.compareAtPrice, onSale, campaign?.percent ?? 0);
  const layout = ctx.config.settings.layout;
  const card = layout.cardVariant;
  const media: Media[] = d.images.map((i) => ({ type: 'image', url: i.url, alt: i.alt || p.name }));
  if (p.videoUrl) media.push({ type: 'video', url: p.videoUrl, alt: `${p.name} video`, poster: d.images[0]?.url });
  const isNew = Date.now() - +p.createdAt < 45 * 86_400_000;
  const totalStock = d.variants.reduce((a, v) => a + Math.max(0, v.stock), 0);
  const std = settings.shipping.methods.find((m) => m.id === 'standard')?.price ?? 25000;
  const exp = settings.shipping.methods.find((m) => m.id === 'express')?.price ?? 50000;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    sku: p.sku ?? undefined,
    gtin13: p.barcode ?? undefined,
    brand: { '@type': 'Brand', name: settings.store.name },
    category: d.category?.name,
    material: p.materials.join(', '),
    image: d.images.map((i) => (isRemote(i.url) ? `${i.url.split('?')[0]}?auto=format&w=1200&q=80` : absoluteUrl(i.url))),
    url: absoluteUrl(`/products/${p.slug}`),
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(`/products/${p.slug}`),
      priceCurrency: 'PKR',
      price: (priced.price / 100).toFixed(0),
      availability: totalStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: settings.store.name },
    },
    ...(p.ratingCount > 0 && { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.ratingAvg.toFixed(1), reviewCount: p.ratingCount } }),
    ...(d.reviews.length > 0 && {
      review: d.reviews.slice(0, 5).map((r) => ({ '@type': 'Review', reviewRating: { '@type': 'Rating', ratingValue: r.rating }, author: { '@type': 'Person', name: r.name.split(' · ')[0] }, reviewBody: r.body })),
    }),
  };
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      ...(d.category ? [{ '@type': 'ListItem', position: 2, name: d.category.name, item: absoluteUrl(`/collections/${d.category.slug}`) }] : []),
      { '@type': 'ListItem', position: d.category ? 3 : 2, name: p.name, item: absoluteUrl(`/products/${p.slug}`) },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      <TrackRecentlyViewed slug={p.slug} />
      <div className="container-x pt-6 md:pt-8">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.75rem] text-muted">
          <Link href="/" className="hover:text-ink">Home</Link> <span>/</span>
          {d.category && <><Link href={`/collections/${d.category.slug}`} className="hover:text-ink">{d.category.name}</Link> <span>/</span></>}
          <span className="min-w-0 break-words text-ink">{p.name}</span>
        </nav>
        <div className={cn('grid gap-8 lg:gap-16', layout.pdpVariant === 'stacked' || layout.pdpVariant === 'grid' ? 'lg:grid-cols-[1.25fr_1fr]' : 'lg:grid-cols-[1.1fr_1fr]')}>
          <div className="min-w-0"><ProductGallery media={media} layout={layout.pdpVariant} /></div>
          <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
            <ProductPurchase
              product={{ id: p.id, slug: p.slug, name: p.name, subtitle: p.subtitle, description: p.description, details: p.details, materials: p.materials, care: p.care, price: priced.price, compareAtPrice: priced.compareAt, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount, badges: onSale ? [...new Set([...p.badges, 'sale'])] : p.badges, sku: p.sku }}
              variants={d.variants.map((v) => {
                const base = v.price ?? p.price;
                const shown = presentPrice(base, v.compareAtPrice ?? p.compareAtPrice, onSale, campaign?.percent ?? 0);
                return { id: v.id, title: v.title, size: v.size, color: v.color, stock: v.stock, price: shown.price, compareAtPrice: shown.compareAt };
              })}
              image={d.images[0]?.url ?? null}
              category={d.category ? { name: d.category.name, slug: d.category.slug } : null}
              style={layout.pdpStyle}
              stickyAtc={ctx.config.settings.mobile.stickyAtc}
              shipping={{ freeThreshold: settings.shipping.freeThreshold, standard: std, express: exp }}
              isNew={isNew}
            />
          </div>
        </div>
      </div>

      {look.length > 0 && (
        <section className="section-y container-x">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Styled together</p>
              <h2 className="t-2">Complete the Look</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-[var(--grid-gap)] md:grid-cols-4">
            {look.map((x, i) => <ProductCard key={x.id} p={x} variant={card} index={i} />)}
          </div>
        </section>
      )}

      <section id="reviews" className="section-y-sm border-t border-line">
        <div className="container-x grid gap-12 md:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="t-2">Reviews</h2>
            {p.ratingCount > 0 ? (
              <>
                <p className="font-heading mt-6 text-[3.5rem] leading-none">{p.ratingAvg.toFixed(1)}</p>
                <Stars value={p.ratingAvg} size={16} className="mt-2" />
                <p className="mt-2 text-[0.85rem] text-muted">Based on {p.ratingCount} reviews</p>
                <div className="mt-6 space-y-2">
                  {d.distribution.map((r) => (
                    <div key={r.star} className="flex items-center gap-3 text-[0.8rem]">
                      <span className="w-6 text-muted">{r.star}★</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><span className="block h-full rounded-full bg-accent" style={{ width: `${p.ratingCount ? (r.count / p.ratingCount) * 100 : 0}%` }} /></span>
                      <span className="w-6 text-right text-muted">{r.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-4 text-muted">No reviews yet — be the first to share your thoughts.</p>
            )}
            <div className="mt-8"><ReviewForm productId={p.id} defaultName={user ? `${user.firstName} ${user.lastName}`.trim() : ''} /></div>
          </div>
          <div className="divide-y divide-line">
            {d.reviews.slice(0, 8).map((r) => {
              const studio = !r.verified && !!r.email?.endsWith('@studio.maisonaurelle.pk');
              return (
              <article key={r.id} className="grid gap-5 py-7 first:pt-0 sm:grid-cols-[auto_1fr]">
                <div className="flex items-start gap-4">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-surface">
                    {r.avatar ? <Img src={r.avatar} alt="" sizes="56px" /> : <span className="grid h-full place-items-center text-[0.8rem]">{r.name.slice(0, 1)}</span>}
                  </span>
                  {r.photo && (
                    <span className="relative hidden h-24 w-20 overflow-hidden rounded-theme-sm bg-surface sm:block">
                      <Img src={r.photo} alt={`${r.name} wearing the piece`} sizes="80px" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Stars value={r.rating} size={13} />
                    <span className="text-[0.75rem] text-muted">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.title && <h3 className="mt-3 text-[1rem] font-medium">{r.title}</h3>}
                  <p className="mt-2 text-[0.92rem] leading-relaxed text-muted">{r.body}</p>
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-[0.8rem]">
                    {r.name}
                    {r.verified && <span className="inline-flex items-center gap-1 text-[0.72rem] text-accent"><BadgeCheck size={14} strokeWidth={1.5} /> Verified buyer</span>}
                    {studio && <span className="text-[0.68rem] uppercase tracking-[0.14em] text-muted">Studio testimonial · not a verified purchase</span>}
                  </p>
                  {r.photo && (
                    <span className="relative mt-4 block aspect-[4/5] max-w-[180px] overflow-hidden rounded-theme-sm bg-surface sm:hidden">
                      <Img src={r.photo} alt="" sizes="180px" />
                    </span>
                  )}
                </div>
              </article>
              );
            })}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section-y container-x overflow-hidden">
          <h2 className="t-2 mb-10">You May Also Like</h2>
          <Rail>{related.map((x, i) => <ProductCard key={x.id} p={x} variant={card} index={i} />)}</Rail>
        </section>
      )}
      <RecentlyViewed exclude={p.slug} variant={card} />
    </>
  );
}
