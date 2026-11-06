'use client';

import { Check, Gift } from 'lucide-react';
import { Img } from '@/components/ui/img';
import { formatMoney } from '@/lib/money';
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
  const chosen = images.find((img) => img.id === imageId) ?? images[0] ?? null;
  const extra = price * Math.max(1, quantity);
  const pick = (on: boolean) => onChange(on, on ? chosen?.id ?? null : null);

  return (
    <fieldset className={cn('gift-pack gift-choice min-w-0 border-0 p-0', compact ? 'mt-3' : 'mt-5')}>
      <legend className="mb-2 flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.16em] text-muted">
        <Gift size={14} strokeWidth={1.5} className="text-accent" aria-hidden />
        Send it
      </legend>
      <div className={cn('gift-choice-grid', compact && 'is-compact')} role="group" aria-label="Gift packaging">
        <button type="button" className="gift-choice-card" aria-pressed={!selected} onClick={() => pick(false)}>
          <span className="gift-choice-check" aria-hidden>{!selected && <Check size={13} strokeWidth={2} />}</span>
          <span className="min-w-0">
            <span className="block text-[0.9rem] font-medium">Without packaging</span>
            <span className="mt-0.5 block text-[0.75rem] text-muted">{compact ? 'No extra charge' : 'No extra charge. The complimentary pouch and note stay included.'}</span>
          </span>
        </button>
        <button type="button" className="gift-choice-card" aria-pressed={selected} onClick={() => pick(true)}>
          <span className="gift-choice-check" aria-hidden>{selected && <Check size={13} strokeWidth={2} />}</span>
          <span className="flex min-w-0 flex-1 items-center gap-2">
            {chosen && (
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-theme-sm bg-surface">
                <Img src={chosen.url} alt="" sizes="48px" className="gift-still" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-[0.9rem] font-medium">With gift packaging</span>
              <span className="mt-0.5 block text-[0.75rem] text-accent">{formatMoney(price)} each{quantity > 1 ? ` · ${formatMoney(extra)} for ${quantity}` : ''}</span>
            </span>
          </span>
        </button>
      </div>
      {selected && images.length > 1 && (
        <div className="gift-styles" role="group" aria-label="Packaging style">
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              aria-pressed={chosen?.id === img.id}
              onClick={() => onChange(true, img.id)}
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
      <p className={cn('mt-2 text-[0.75rem] text-muted', compact && 'sr-only')} aria-live="polite">
        {selected ? `Packaging added. ${formatMoney(extra)} will be shown separately before you pay.` : 'Packaging is not added. You can choose it later in the bag.'}
      </p>
    </fieldset>
  );
}
