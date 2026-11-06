'use client';

import { Gift } from 'lucide-react';
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
}: {
  price: number;
  images: GiftPreview[];
  selected: boolean;
  imageId?: string | null;
  onChange: (selected: boolean, imageId: string | null) => void;
  compact?: boolean;
}) {
  const chosen = images.find((img) => img.id === imageId) ?? images[0] ?? null;
  return (
    <div className={cn('gift-pack min-w-0 rounded-theme border border-line p-3', compact ? 'mt-3' : 'mt-5')}>
      <label className="flex min-w-0 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="checkbox mt-1"
          checked={selected}
          onChange={(event) => onChange(event.target.checked, chosen?.id ?? null)}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2 text-[0.92rem] font-medium">
            <Gift size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            Premium gift packaging
          </span>
          <span className="mt-1 block text-[0.8rem] text-muted">Optional. {formatMoney(price)} per piece, added only if you choose it. The complimentary pouch is unchanged.</span>
        </span>
      </label>
      {chosen && (
        <div className="mt-3 grid min-w-0 grid-cols-[4.5rem_1fr] items-center gap-3">
          <span className="relative block h-16 w-[4.5rem] overflow-hidden rounded-theme-sm bg-surface">
            <Img src={chosen.url} alt="" sizes="72px" className="gift-still" />
          </span>
          <span className="min-w-0">
            <span className="block text-[0.82rem]">{chosen.alt}</span>
            {selected && <span className="mt-1 block text-[0.78rem] text-accent">Added · {formatMoney(price)} each</span>}
          </span>
        </div>
      )}
      {selected && images.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Packaging style">
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              aria-pressed={chosen?.id === img.id}
              onClick={() => onChange(true, img.id)}
              className={cn('relative h-14 w-14 overflow-hidden rounded-theme-sm border', chosen?.id === img.id ? 'border-ink' : 'border-line')}
            >
              <Img src={img.url} alt={img.alt} sizes="56px" className="gift-still" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
