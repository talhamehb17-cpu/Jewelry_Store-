import Link from 'next/link';
import { ProductCard } from './product-card';
import { listSaleCards } from '@/lib/catalog';
import { campaignImageSrc } from '@/lib/campaign-image';
import { formatDateTime } from '@/lib/utils';
import type { Campaign } from '@/db/schema';
import type { CardVariant } from '@/themes/types';
import { Img } from '@/components/ui/img';

export async function CampaignHome({ campaign, card }: { campaign: Campaign; card: CardVariant }) {
  const items = await listSaleCards(campaign, 8);
  const image = campaignImageSrc(campaign);
  if (!items.length && !image) return null;
  return (
    <section className="section-y-sm border-b border-line">
      <div className="container-x">
        <div className={image ? 'grid min-w-0 items-start gap-6 sm:gap-8 md:grid-cols-2 md:gap-10 lg:gap-14' : 'mb-8 flex flex-wrap items-end justify-between gap-4'}>
          {image && (
            <div className="min-w-0">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-theme-sm bg-surface sm:aspect-[3/2] md:aspect-[4/5] lg:max-h-[min(70vh,34rem)]">
                <Img src={image} alt={`${campaign.name} campaign`} sizes="(max-width: 767px) 92vw, 46vw" priority className="object-cover object-center" />
              </div>
            </div>
          )}
          <div className="min-w-0">
            <p className="eyebrow mb-2">{campaign.percent}% off · live now</p>
            <h2 className="t-2 break-words">{campaign.name}</h2>
            {campaign.description && <p className="mt-3 max-w-xl text-pretty break-words text-muted">{campaign.description}</p>}
            <p className="mt-3 text-[0.78rem] text-muted">Ends {formatDateTime(campaign.endsAt)} PKT</p>
            {image && <Link href={campaign.ctaHref || '/shop'} className="btn btn-primary btn-sm mt-5 w-full sm:w-auto">{campaign.ctaLabel || 'Shop the sale'}</Link>}
          </div>
          {!image && <Link href={campaign.ctaHref || '/shop'} className="btn btn-primary btn-sm shrink-0">{campaign.ctaLabel || 'Shop the sale'}</Link>}
        </div>
        {items.length > 0 && (
          <div className={`${image ? 'mt-8 ' : ''}grid grid-cols-2 gap-[var(--grid-gap)] md:grid-cols-4`}>
            {items.map((p, i) => <ProductCard key={p.id} p={p} variant={card} index={i} />)}
          </div>
        )}
      </div>
    </section>
  );
}
