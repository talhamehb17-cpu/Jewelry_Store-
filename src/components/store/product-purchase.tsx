'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';
import { Heart, Truck, Gift, ShieldCheck, RefreshCcw, Plus, Award, Check } from 'lucide-react';
import { useStore } from './providers';
import { QtyStepper, VariantPicker, useVariantSelection, type PickerVariant } from './variant-picker';
import { Modal } from '@/components/ui/overlay';
import { Badge, Price, Stars } from '@/components/ui/bits';
import { notifyBackInStock } from '@/app/actions/store';
import { formatMoney, percentOff } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { ThemeLayout } from '@/themes/types';

type P = {
  product: { id: number; slug: string; name: string; subtitle: string | null; description: string; details: string[]; materials: string[]; care: string | null; price: number; compareAtPrice: number | null; ratingAvg: number; ratingCount: number; badges: string[]; sku: string | null };
  variants: PickerVariant[];
  image: string | null;
  category: { name: string; slug: string } | null;
  style: ThemeLayout['pdpStyle'];
  stickyAtc: boolean;
  shipping: { freeThreshold: number; standard: number; express: number };
  isNew: boolean;
};

const STYLE: Record<ThemeLayout['pdpStyle'], { wrap: string; title: string; price: string; label?: string }> = {
  soft: { wrap: '', title: 'font-heading text-[clamp(2rem,3.2vw,2.8rem)] leading-[1.08]', price: 'text-[1.15rem] tracking-wide' },
  minimal: { wrap: '', title: 'font-heading text-[clamp(1.7rem,2.6vw,2.2rem)] font-medium leading-tight tracking-tight', price: 'text-[1.1rem]' },
  boutique: { wrap: 'rounded-theme bg-surface p-6 md:p-9', title: 'font-heading text-[clamp(2rem,3vw,2.7rem)] italic leading-tight', price: 'text-[1.2rem] text-primary' },
  noir: { wrap: 'border border-line p-6 md:p-9', title: 'font-heading text-[clamp(1.6rem,2.4vw,2.2rem)] uppercase tracking-[0.12em] leading-snug', price: 'text-[1.15rem] text-accent tracking-[0.1em]' },
  editorial: { wrap: '', title: 'font-heading text-[clamp(2.6rem,4.6vw,4.2rem)] italic leading-[0.95] tracking-[-0.02em]', price: 'text-[0.95rem] uppercase tracking-[0.16em]' },
  heritage: { wrap: '', title: 'font-heading text-[clamp(1.9rem,2.8vw,2.5rem)] leading-tight', price: 'text-[1.15rem]', label: '[font-variant:small-caps]' },
  nordic: { wrap: '', title: 'font-heading text-[clamp(1.8rem,2.6vw,2.3rem)] font-light leading-tight', price: 'text-[1.05rem] text-muted' },
  romantic: { wrap: 'text-center', title: 'font-heading text-[clamp(2.2rem,3.6vw,3.2rem)] italic leading-tight', price: 'text-[1.15rem]' },
  luxe: { wrap: 'rounded-theme border border-accent/40 p-6 md:p-8', title: 'font-heading text-[clamp(2rem,3vw,2.7rem)] leading-tight', price: 'text-[1.35rem] font-semibold' },
  bold: { wrap: '', title: 'font-heading text-[clamp(2.2rem,3.8vw,3.4rem)] font-semibold leading-[0.98] tracking-[-0.03em]', price: 'text-[1.25rem] font-medium' },
};

function deliveryWindow(days: [number, number]) {
  const add = (n: number) => {
    const d = new Date();
    let added = 0;
    while (added < n) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0) added++;
    }
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };
  return `${add(days[0])} – ${add(days[1])}`;
}

function Accordion({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-[0.82rem] uppercase tracking-[0.14em] [&::-webkit-details-marker]:hidden">
        {title}
        <Plus size={16} strokeWidth={1.25} className="transition duration-300 group-open:rotate-45" />
      </summary>
      <div className="pb-6 text-[0.92rem] leading-relaxed text-muted">{children}</div>
    </details>
  );
}

function SizeGuide({ open, onClose, kind }: { open: boolean; onClose: () => void; kind: string }) {
  const rings = [['5', '15.7', '49.3'], ['6', '16.5', '51.9'], ['7', '17.3', '54.4'], ['8', '18.2', '57.0'], ['9', '19.0', '59.5']];
  return (
    <Modal open={open} onClose={onClose} label="Size guide" className="sm:max-w-xl">
      <div className="p-7 md:p-10">
        <h2 className="t-3">Size guide</h2>
        {kind === 'rings' ? (
          <>
            <p className="mt-3 text-[0.9rem] text-muted">Measure the inside diameter of a ring that fits you well, or wrap a strip of paper around your finger to find the circumference.</p>
            <table className="mt-6 w-full text-left text-[0.88rem]">
              <thead><tr className="border-b border-line text-muted"><th className="py-2">US size</th><th>Diameter (mm)</th><th>Circumference (mm)</th></tr></thead>
              <tbody>{rings.map((r) => <tr key={r[0]} className="border-b border-line"><td className="py-2.5">{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody>
            </table>
          </>
        ) : kind === 'bracelets' ? (
          <p className="mt-3 text-[0.9rem] text-muted">Measure your wrist snugly with a soft tape and add 1–1.5 cm (0.5 in) for comfort. 6 in suits petite wrists, 6.5 in is our most popular, and 7 in offers a relaxed drape.</p>
        ) : kind === 'earrings' ? (
          <p className="mt-3 text-[0.9rem] text-muted">Hoop sizes refer to outer diameter: Small 15 mm sits close to the lobe, Medium 22 mm is our everyday favourite, and Large 30 mm makes a statement.</p>
        ) : (
          <p className="mt-3 text-[0.9rem] text-muted">16 in sits at the base of the neck (choker-adjacent), 18 in falls at the collarbone — the most versatile — and 20 in drapes just below, ideal for layering.</p>
        )}
        <p className="mt-6 text-[0.85rem]">Still unsure? <Link href="/contact" className="underline underline-offset-4">Message our stylists</Link> — we reply within minutes on WhatsApp.</p>
      </div>
    </Modal>
  );
}

function NotifyForm({ product }: { product: string }) {
  const [state, action, pending] = useActionState(notifyBackInStock, null);
  if (state?.ok) return <p className="flex items-center gap-2 text-[0.88rem]"><Check size={16} className="text-accent" /> {state.message}</p>;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="product" value={product} />
      <p className="text-[0.85rem]">This piece is currently sold out. Get notified when it’s back:</p>
      <div className="flex gap-2">
        <input name="email" type="email" required placeholder="Your email" className="field" aria-label="Email for back-in-stock alert" />
        <button disabled={pending} className="btn btn-secondary shrink-0">{pending ? '…' : 'Notify me'}</button>
      </div>
      {state && !state.ok && <p className="text-[0.8rem] text-sale">{state.message}</p>}
    </form>
  );
}

export function ProductPurchase({ product: p, variants, image, category, style, stickyAtc, shipping, isNew }: P) {
  const { addToCart, toggleWishlist, inWishlist } = useStore();
  const router = useRouter();
  const state = useVariantSelection(variants);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [guide, setGuide] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const [eta, setEta] = useState<{ std: string; exp: string } | null>(null);
  useEffect(() => setEta({ std: deliveryWindow([3, 5]), exp: deliveryWindow([1, 2]) }), []);
  const atcRef = useRef<HTMLDivElement>(null);
  const s = STYLE[style];
  const v = state.selected;
  const price = v?.price ?? p.price;
  const compare = v?.compareAtPrice ?? p.compareAtPrice;
  const allSoldOut = variants.every((x) => x.stock <= 0);
  const soldOut = v ? v.stock <= 0 : allSoldOut;
  const low = v && v.stock > 0 && v.stock <= 3;
  const off = percentOff(price, compare);

  useEffect(() => {
    if (!stickyAtc || !atcRef.current) return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e!.isIntersecting && e!.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(atcRef.current);
    return () => io.disconnect();
  }, [stickyAtc]);

  const add = (buyNow = false) => {
    setError('');
    if (state.needsSize || !v) {
      setError(`Please select a ${category?.slug === 'rings' ? 'ring size' : 'size'}.`);
      atcRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (soldOut) return;
    addToCart({ variantId: v.id, productId: p.id, slug: p.slug, name: p.name, variantTitle: v.title === 'Default' ? null : v.title, image, price }, qty, { silent: buyNow });
    if (buyNow) router.push('/checkout');
  };

  const wished = inWishlist(p.id);
  const sizeLabel = category?.slug === 'rings' ? 'Ring size' : category?.slug === 'necklaces' ? 'Length' : category?.slug === 'bracelets' ? 'Wrist size' : 'Size';

  return (
    <div className={cn(s.wrap)}>
      <div className={cn('flex flex-wrap items-center gap-2', style === 'romantic' && 'justify-center')}>
        {off > 0 && <Badge tone="sale">Save {off}%</Badge>}
        {p.badges.includes('limited') && <Badge tone="accent">Limited edition</Badge>}
        {p.badges.includes('bestseller') && <Badge tone="muted">Best seller</Badge>}
        {(isNew || p.badges.includes('new')) && <Badge tone="muted">New</Badge>}
      </div>
      <h1 className={cn('mt-4', s.title)}>{p.name}</h1>
      {p.subtitle && <p className={cn('mt-2 text-[0.95rem] text-muted', style === 'heritage' && 'accent-italic text-[1.1rem]')}>{p.subtitle}</p>}
      <div className={cn('mt-4 flex flex-wrap items-center gap-x-5 gap-y-2', style === 'romantic' && 'justify-center')}>
        <Price price={price} compareAt={compare} className={s.price} />
        {p.ratingCount > 0 && (
          <a href="#reviews" className="inline-flex items-center gap-2 text-[0.8rem] text-muted hover:text-ink">
            <Stars value={p.ratingAvg} size={13} /> {p.ratingAvg.toFixed(1)} · {p.ratingCount} reviews
          </a>
        )}
      </div>
      <p className="mt-2 text-[0.78rem] text-muted">Tax included. {price >= shipping.freeThreshold ? 'Complimentary shipping.' : `Free shipping over ${formatMoney(shipping.freeThreshold)}.`}</p>
      <p className={cn('mt-6 text-[0.95rem] leading-[1.8]', style === 'romantic' ? 'mx-auto max-w-md text-muted' : 'text-muted')}>{p.description}</p>

      <div className={cn('mt-8', style === 'romantic' && 'text-left')} ref={atcRef}>
        <VariantPicker variants={variants} state={state} sizeLabel={sizeLabel} onSizeGuide={state.sizes.length ? () => setGuide(true) : undefined} />
        {error && <p className="mt-3 text-[0.82rem] text-sale" role="alert">{error}</p>}
        <div className="mt-7">
          {soldOut && v ? (
            <NotifyForm product={p.slug} />
          ) : (
            <>
              <p className={cn('mb-3 flex items-center gap-2 text-[0.82rem]', low ? 'text-sale' : 'text-muted')}>
                <span className={cn('h-2 w-2 rounded-full', low ? 'bg-sale' : 'bg-emerald-600')} />
                {low ? `Only ${v!.stock} left — order soon` : state.needsSize ? 'Select a size to see availability' : 'In stock — dispatched within 24 hours'}
              </p>
              <div className="flex gap-3">
                <QtyStepper value={qty} onChange={setQty} max={Math.max(1, Math.min(20, v?.stock ?? 20))} />
                <button onClick={() => add(false)} disabled={allSoldOut} className="btn btn-primary flex-1">{allSoldOut ? 'Sold out' : 'Add to bag'}</button>
                <button onClick={() => toggleWishlist(p.id, p.name)} aria-pressed={wished} className="grid w-12 shrink-0 place-items-center border border-line transition hover:border-ink rounded-theme-sm" aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}>
                  <Heart size={18} strokeWidth={1.25} className={cn(wished && 'fill-current text-sale')} />
                </button>
              </div>
              <button onClick={() => add(true)} disabled={allSoldOut} className="btn btn-secondary mt-3 w-full">Buy it now</button>
            </>
          )}
        </div>
      </div>

      <div className={cn('mt-8 space-y-3 rounded-theme-sm bg-surface/70 p-5 text-[0.85rem]', style === 'romantic' && 'text-left')}>
        <p className="flex items-start gap-3"><Truck size={17} strokeWidth={1.25} className="mt-0.5 shrink-0 text-accent" /><span>{eta ? <>Order today — estimated delivery <strong className="font-medium">{eta.std}</strong> (Express: {eta.exp})</> : <>Delivered in 3–5 working days nationwide (Express 1–2 days)</>}</span></p>
        <p className="flex items-start gap-3"><Gift size={17} strokeWidth={1.25} className="mt-0.5 shrink-0 text-accent" /><span>Complimentary gift box &amp; handwritten note</span></p>
        {style === 'heritage' || p.materials.some((m) => m.includes('Diamond')) ? (
          <p className="flex items-start gap-3"><Award size={17} strokeWidth={1.25} className="mt-0.5 shrink-0 text-accent" /><span>Certificate of authenticity included</span></p>
        ) : null}
      </div>

      <div className={cn('mt-6 border-t border-line', style === 'romantic' && 'text-left')}>
        <Accordion title="Details & materials" open={style === 'editorial'}>
          <ul className="space-y-1.5">
            {p.details.map((d) => <li key={d} className="flex gap-2"><span className="text-accent">—</span>{d}</li>)}
          </ul>
          {p.materials.length > 0 && <p className="mt-4"><span className="text-ink">Materials:</span> {p.materials.join(' · ')}</p>}
          {p.sku && <p className="mt-1"><span className="text-ink">Reference:</span> {p.sku}</p>}
        </Accordion>
        <Accordion title="Care instructions">{p.care}</Accordion>
        <Accordion title="Shipping & returns">
          <p>Standard delivery ({formatMoney(shipping.standard)}) arrives in 3–5 working days nationwide — complimentary over {formatMoney(shipping.freeThreshold)}. Express delivery ({formatMoney(shipping.express)}) arrives in 1–2 working days in Lahore, Karachi and Islamabad.</p>
          <p className="mt-3">Cash on Delivery available. Unworn pieces can be returned or exchanged within 7 days. <Link href="/policies/return-policy" className="underline underline-offset-4">Read our returns policy</Link>.</p>
        </Accordion>
      </div>

      <ul className="mt-8 grid grid-cols-2 gap-4 text-[0.75rem] text-muted sm:grid-cols-4">
        {[
          { i: ShieldCheck, t: 'Secure checkout' },
          { i: Gift, t: 'Premium packaging' },
          { i: Truck, t: 'Fast, insured delivery' },
          { i: RefreshCcw, t: '7-day returns' },
        ].map(({ i: Icon, t }) => (
          <li key={t} className="flex flex-col items-center gap-2 text-center"><Icon size={20} strokeWidth={1.1} className="text-ink" />{t}</li>
        ))}
      </ul>

      <SizeGuide open={guide} onClose={() => setGuide(false)} kind={category?.slug ?? ''} />

      {stickyAtc && !allSoldOut && (
        <div className={cn('fixed inset-x-0 bottom-0 z-[55] border-t border-line bg-bg/95 px-4 py-3 backdrop-blur transition-transform duration-500 md:hidden', showSticky ? 'translate-y-0' : 'translate-y-full')}>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.85rem] font-medium">{p.name}</p>
              <p className="text-[0.8rem] text-muted">{formatMoney(price)}{v && v.title !== 'Default' ? ` · ${v.title}` : ''}</p>
            </div>
            <button onClick={() => add(false)} className="btn btn-primary shrink-0">Add to bag</button>
          </div>
        </div>
      )}
    </div>
  );
}
