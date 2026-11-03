import Link from 'next/link';
import { ProductCard } from './product-card';
import { listSaleCards } from '@/lib/catalog';
import type { Campaign } from '@/db/schema';
import type { CardVariant } from '@/themes/types';

export async function CampaignHome({ campaign, card }: { campaign: Campaign; card: CardVariant }) {
  const items = await listSaleCards(campaign, 8);
  if (!items.length) return null;
  return (
    <section className="section-y-sm border-b border-line">
      <div className="container-x">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow mb-2">{campaign.percent}% off · live now</p>
            <h2 className="t-2">{campaign.name}</h2>
            {campaign.description && <p className="mt-3 max-w-xl text-muted">{campaign.description}</p>}
          </div>
          <Link href={campaign.ctaHref || '/shop'} className="btn btn-primary btn-sm">{campaign.ctaLabel || 'Shop the sale'}</Link>
        </div>
        <div className="grid grid-cols-2 gap-[var(--grid-gap)] md:grid-cols-4">
          {items.map((p, i) => <ProductCard key={p.id} p={p} variant={card} index={i} />)}
        </div>
      </div>
    </section>
  );
}
