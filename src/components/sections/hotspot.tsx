'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStore } from '@/components/store/providers';
import { Img } from '@/components/ui/img';
import { formatMoney } from '@/lib/money';
import type { CardProduct } from '@/lib/catalog';
import { cn } from '@/lib/utils';

export function Hotspot({ x, y, product }: { x: number; y: number; product: CardProduct }) {
  const [open, setOpen] = useState(false);
  const { setQuickView } = useStore();
  return (
    <div className="absolute z-[2]" style={{ left: `${x}%`, top: `${y}%` }}>
      <button
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        aria-label={`Shop ${product.name}`}
        aria-expanded={open}
        className="relative -translate-x-1/2 -translate-y-1/2"
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-white/60" />
        <span className="relative grid h-7 w-7 place-items-center rounded-full bg-white text-[0.9rem] text-black shadow-lg">+</span>
      </button>
      <div className={cn('absolute left-4 top-4 w-56 rounded-theme-sm bg-bg p-3 text-ink shadow-2xl transition', open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0')} onMouseLeave={() => setOpen(false)}>
        <div className="flex gap-3">
          <span className="relative block h-16 w-14 shrink-0 overflow-hidden bg-surface"><Img src={product.image} alt="" sizes="56px" /></span>
          <div className="min-w-0">
            <Link href={`/products/${product.slug}`} className="block truncate text-[0.85rem] font-medium">{product.name}</Link>
            <p className="text-[0.8rem] text-muted">{formatMoney(product.price)}</p>
            <button onClick={() => setQuickView({ slug: product.slug })} className="mt-1 text-[0.72rem] underline underline-offset-2">Quick shop</button>
          </div>
        </div>
      </div>
    </div>
  );
}
