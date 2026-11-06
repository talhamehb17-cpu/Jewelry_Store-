'use client';

import { Img } from '@/components/ui/img';
import { useDisplayMoney } from './currency-context';
import { cn } from '@/lib/utils';

export type GiftPreview = { id: string; url: string; alt: string };

export function GiftPackagingChoice({
  price,
  images,
  selected,
  imageId,
  onChange,
  compact,
  quantity = 1,
}: {
  price: number;
  images: GiftPreview[];
  selected: boolean;
  imageId?: string | null;
  onChange: (selected: boolean, imageId: string | null) => void;
  compact?: boolean;
  quantity?: number;
}) {
  const money = useDisplayMoney();
  const chosen = images.find((img) => img.id === imageId) ?? images[0] ?? null;
  const units = Math.max(1, quantity);
  const extra = price * units;
  const pick = (on: boolean, id: string | null = chosen?.id ?? null) => onChange(on, on ? id : null);

  return (
    <div className={cn('gift-pack min-w-0', compact && 'is-compact')}>
      <label className={cn('gift-check', selected && 'is-on')}>
        <input
          type="checkbox"
          className="gift-check-input"
          checked={selected}
          onChange={(e) => pick(e.target.checked)}
        />
        <span className="gift-tick-box" aria-hidden>
          <svg viewBox="0 0 16 16" className="gift-tick">
            <path d="M3.2 8.2 6.3 11.2 12.8 4.6" />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="gift-check-title">Add Premium Gift Packaging</span>
          <span className="gift-check-copy">Make your order extra special with our premium gift packaging.</span>
          <span className="gift-check-price">
            {money(price)}
            {units > 1 ? ` each · ${money(extra)} for ${units}` : ''}
          </span>
        </span>
      </label>
      <div className={cn('gift-reveal', selected && images.length > 0 && 'is-open')} aria-hidden={!selected} inert={!selected}>
        <div className="gift-reveal-inner">
          {chosen && (
            <div className="gift-preview">
              <span className="gift-preview-frame">
                <Img src={chosen.url} alt={chosen.alt} sizes="160px" className="gift-still" />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.82rem]">{chosen.alt}</span>
                <span className="mt-1 block text-[0.75rem] text-muted">
                  {money(extra)} added separately. It is not part of the piece price.
                </span>
              </span>
            </div>
          )}
          {images.length > 1 && (
            <div className="gift-styles" role="group" aria-label="Packaging style">
              {images.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  aria-pressed={chosen?.id === img.id}
                  onClick={() => pick(true, img.id)}
                  className={cn('gift-style', chosen?.id === img.id && 'is-on')}
                >
                  <span className="relative block h-14 w-14 overflow-hidden rounded-theme-sm bg-surface">
                    <Img src={img.url} alt="" sizes="56px" className="gift-still" />
                  </span>
                  <span className="mt-1 block max-w-16 truncate text-[0.68rem]">{img.alt}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {selected ? `Premium Gift Packaging added. ${money(extra)}.` : 'Premium Gift Packaging removed.'}
      </p>
    </div>
  );
}

/** Live product-page total. Uses the server price; it does not submit a charge. */
export function GiftPurchaseTotal({ productTotal, packaging, selected }: { productTotal: number; packaging: number; selected: boolean }) {
  const money = useDisplayMoney();
  const extra = selected ? packaging : 0;
  return (
    <dl className="gift-pay" aria-live="polite">
      <div>
        <dt>Product</dt>
        <dd>{money(productTotal)}</dd>
      </div>
      {selected && (
        <div>
          <dt>Premium Gift Packaging</dt>
          <dd>{money(packaging)}</dd>
        </div>
      )}
      <div className="gift-pay-total">
        <dt>Total</dt>
        <dd>{money(productTotal + extra)}</dd>
      </div>
    </dl>
  );
}
