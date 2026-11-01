'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export type PickerVariant = { id: number; title: string; size: string | null; color: string | null; stock: number; price: number | null; compareAtPrice: number | null };

const SWATCH: Record<string, string> = {
  Gold: 'linear-gradient(135deg,#b8892f,#ecd18a 50%,#b8892f)',
  'Yellow Gold': 'linear-gradient(135deg,#b8892f,#ecd18a 50%,#b8892f)',
  Silver: 'linear-gradient(135deg,#a9a9a9,#f1f1f1 50%,#9c9c9c)',
  'White Gold': 'linear-gradient(135deg,#bdbdbd,#f6f6f6 50%,#b0b0b0)',
  'Rose Gold': 'linear-gradient(135deg,#b7786a,#f0c4b4 50%,#b7786a)',
};

export function useVariantSelection(variants: PickerVariant[]) {
  const sizes = useMemo(() => [...new Set(variants.map((v) => v.size).filter(Boolean))] as string[], [variants]);
  const colors = useMemo(() => [...new Set(variants.map((v) => v.color).filter(Boolean))] as string[], [variants]);
  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [size, setSize] = useState<string | null>(sizes.length > 1 ? null : (firstAvailable?.size ?? null));
  const [color, setColor] = useState<string | null>(firstAvailable?.color ?? null);
  const selected = variants.find((v) => (sizes.length ? v.size === size : true) && (colors.length ? v.color === color : true)) ?? null;
  const needsSize = sizes.length > 1 && !size;
  return { sizes, colors, size, setSize, color, setColor, selected, needsSize };
}

export function VariantPicker({
  variants,
  state,
  sizeLabel = 'Size',
  onSizeGuide,
  compact,
}: {
  variants: PickerVariant[];
  state: ReturnType<typeof useVariantSelection>;
  sizeLabel?: string;
  onSizeGuide?: () => void;
  compact?: boolean;
}) {
  const { sizes, colors, size, setSize, color, setColor } = state;
  const sizeAvailable = (s: string) => variants.some((v) => v.size === s && (!colors.length || v.color === color) && v.stock > 0);
  return (
    <div className={cn('space-y-6', compact && 'space-y-4')}>
      {colors.length > 0 && (
        <div>
          <p className="label">
            Metal <span className="ml-1 normal-case tracking-normal text-ink">— {color}</span>
          </p>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-pressed={color === c}
                aria-label={c}
                title={c}
                className={cn('h-9 w-9 rounded-full border-2 p-[3px] transition', color === c ? 'border-ink' : 'border-transparent hover:border-line')}
              >
                <span className="block h-full w-full rounded-full shadow-inner" style={{ background: SWATCH[c] ?? '#ccc' }} />
              </button>
            ))}
          </div>
        </div>
      )}
      {sizes.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <p className="label">
              {sizeLabel} {size && <span className="ml-1 normal-case tracking-normal text-ink">— {size}</span>}
            </p>
            {onSizeGuide && (
              <button type="button" onClick={onSizeGuide} className="mb-2 text-[0.75rem] text-muted underline underline-offset-4 hover:text-ink">
                Size guide
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const ok = sizeAvailable(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  aria-pressed={size === s}
                  className={cn(
                    'min-w-[3rem] rounded-theme-sm border px-3.5 py-2.5 text-[0.82rem] transition',
                    size === s ? 'border-ink bg-ink text-bg' : 'border-line hover:border-ink',
                    !ok && 'text-muted line-through decoration-1 opacity-60',
                  )}
                  title={ok ? s : `${s} — sold out`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function QtyStepper({ value, onChange, max = 20, small }: { value: number; onChange: (n: number) => void; max?: number; small?: boolean }) {
  return (
    <div className={cn('inline-flex items-center border border-line rounded-theme-sm', small ? 'h-9' : 'h-12')}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} className={cn('h-full text-lg leading-none text-muted transition hover:text-ink', small ? 'w-8' : 'w-11')} aria-label="Decrease quantity">
        −
      </button>
      <span className={cn('text-center text-[0.9rem] tabular-nums', small ? 'w-6' : 'w-8')} aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className={cn('h-full text-lg leading-none text-muted transition hover:text-ink disabled:opacity-30', small ? 'w-8' : 'w-11')} aria-label="Increase quantity">
        +
      </button>
    </div>
  );
}
