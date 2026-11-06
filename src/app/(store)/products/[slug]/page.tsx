import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductGallery, type Media } from '@/components/store/product-gallery';
import { ProductPurchase } from '@/components/store/product-purchase';
import { RecentlyViewed, ReviewForm, TrackRecentlyViewed } from '@/components/store/product-extras';
import { ProductCard } from '@/components/store/product-card';
import { Rail } from '@/components/sections/slider';
import { getCompleteTheLook, getProductBySlug, getRelatedProducts } from '@/lib/catalog';
import { campaignHit, getActiveCampaign, presentPrice } from '@/lib/campaigns';
import { getThemeContext } from '@/lib/theme-server';
import { getSettings } from '@/lib/settings';
import { getCurrentUser } from '@/lib/auth';
import { eligiblePurchases, presentReview } from '@/lib/reviews';
import { ReviewsSection } from '@/components/store/review-list';
import { absoluteUrl, cn, jsonLd } from '@/lib/utils';
import { BRAND } from '@/lib/brand';
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
    description: (p.seoDescription || `${p.name}${p.subtitle ? ` — ${p.subtitle}` : ''}. ${p.description}`).replace(/\s+/g, ' ').trim().slice(0, 160),
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: {
      type: 'website',
      url: `/products/${p.slug}`,
      siteName: 'EVERMOON',
      title: p.seoTitle || p.name,
      description: (p.seoDescription || p.description).replace(/\s+/g, ' ').trim().slice(0, 200),
      images: img ? [{ url: isRemote(img) ? `${img.split('?')[0]}?auto=format&w=1200&q=80` : absoluteUrl(img), alt: p.name }] : undefined,
    },
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
  const purchases = user ? await eligiblePurchases(user.id, user.email, p.id) : [];
  const std = settings.shipping.methods.find((m) => m.id === 'standard')?.price ?? 25000;
  const exp = settings.shipping.methods.find((m) => m.id === 'express')?.price ?? 50000;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    sku: p.sku ?? undefined,
    gtin13: p.barcode ?? undefined,
    brand: { '@type': 'Brand', name: BRAND.name },
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
      seller: { '@type': 'Organization', name: BRAND.name },
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
              product={{ id: p.id, slug: p.slug, name: p.name, subtitle: p.subtitle, description: p.description, details: p.details, materials: p.materials, care: p.care, price: priced.price, compareAtPrice: priced.compareAt, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount, badges: [...new Set([...(onSale ? ['sale'] : []), ...(p.featured ? ['featured'] : []), ...p.badges])], featured: p.featured, sku: p.sku }}
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
        <ReviewsSection
          slug={p.slug}
          initial={d.reviews.map(presentReview)}
          total={d.distribution.reduce((sum, row) => sum + row.count, 0)}
          average={p.ratingAvg}
          distribution={d.distribution}
        >
          <ReviewForm productId={p.id} productName={p.name} image={d.images[0]?.url} defaultName={user ? `${user.firstName} ${user.lastName}`.trim() : ''} avatar={user?.avatar} purchases={purchases} signedIn={!!user} returnTo={`/products/${p.slug}#reviews`} />
        </ReviewsSection>
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
