'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ShoppingBag, Trash2, Truck } from 'lucide-react';
import { Drawer } from '@/components/ui/overlay';
import { Img } from '@/components/ui/img';
import { QtyStepper } from './variant-picker';
import { useStore, type CartItem } from './providers';
import { formatMoney } from '@/lib/money';
import type { Quote } from '@/lib/pricing';
import type { CardProduct } from '@/lib/catalog';

export function useQuote(extra: { discountCode?: string | null; shippingMethod?: string | null; paymentMethod?: string | null; email?: string } = {}, enabled = true) {
  const { cart, cartReady, replaceCart } = useStore();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  const key = JSON.stringify({ l: cart.map((c) => [c.variantId, c.quantity]), ...extra });
  useEffect(() => {
    if (!enabled || !cartReady) return;
    if (!cart.length) {
      setQuote(null);
      return;
    }
    const id = ++seq.current;
    setLoading(true);
    const t = setTimeout(() => {
      fetch('/api/cart/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lines: cart.map((c) => ({ variantId: c.variantId, quantity: c.quantity })), ...extra }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((q: Quote | null) => {
          if (id !== seq.current || !q) return;
          setQuote(q);
          // Reconcile local cart with server truth (removed/sold-out items, stock caps, current prices).
          const next: CartItem[] = q.lines.map((l) => ({ variantId: l.variantId, productId: l.productId, slug: l.slug, name: l.name, variantTitle: l.variantTitle, image: l.image, price: l.unitPrice, quantity: l.quantity }));
          const changed = next.length !== cart.length || next.some((n) => { const c = cart.find((x) => x.variantId === n.variantId); return !c || c.quantity !== n.quantity || c.price !== n.price; });
          if (changed) replaceCart(next);
        })
        .catch(() => {})
        .finally(() => id === seq.current && setLoading(false));
    }, 180);
    return () => clearTimeout(t);
  }, [key, enabled, cartReady]); // eslint-disable-line react-hooks/exhaustive-deps
  return { quote, loading };
}

export function FreeShippingBar({ remaining, threshold }: { remaining: number; threshold: number }) {
  if (threshold <= 0) return null;
  const pct = Math.min(100, Math.round(((threshold - remaining) / threshold) * 100));
  return (
    <div>
      <p className="flex items-center gap-2 text-[0.82rem]">
        <Truck size={16} strokeWidth={1.25} className="text-accent" />
        {remaining > 0 ? (
          <span>
            You’re <strong className="font-semibold">{formatMoney(remaining)}</strong> away from complimentary shipping
          </span>
        ) : (
          <span>You’ve unlocked <strong className="font-semibold">complimentary shipping</strong></span>
        )}
      </p>
      <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CartLines({ compact }: { compact?: boolean }) {
  const { cart, updateQty, removeFromCart } = useStore();
  return (
    <ul className="divide-y divide-line">
      {cart.map((item) => (
        <li key={item.variantId} className="flex gap-4 py-5">
          <Link href={`/products/${item.slug}`} className="relative block h-28 w-[5.5rem] shrink-0 overflow-hidden rounded-theme-sm bg-surface">
            <Img src={item.image} alt={item.name} sizes="90px" />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/products/${item.slug}`} className="font-heading text-[1.05rem] leading-snug">{item.name}</Link>
                {item.variantTitle && <p className="mt-0.5 text-[0.78rem] text-muted">{item.variantTitle}</p>}
              </div>
              <p className="shrink-0 text-[0.9rem]">{formatMoney(item.price * item.quantity)}</p>
            </div>
            <div className="mt-auto flex items-center justify-between pt-3">
              <QtyStepper value={item.quantity} onChange={(n) => updateQty(item.variantId, n)} small={compact} />
              <button onClick={() => removeFromCart(item.variantId)} className="inline-flex items-center gap-1.5 text-[0.75rem] text-muted transition hover:text-sale" aria-label={`Remove ${item.name}`}>
                <Trash2 size={14} strokeWidth={1.25} /> Remove
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Recommendations({ exclude, title = 'You may also like', limit = 3 }: { exclude: number[]; title?: string; limit?: number }) {
  const [items, setItems] = useState<CardProduct[]>([]);
  const { addToCart, setQuickView } = useStore();
  const key = exclude.join(',');
  useEffect(() => {
    fetch(`/api/products?recommend=1&limit=${limit}&exclude=${key}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items ?? []))
      .catch(() => {});
  }, [key, limit]);
  if (!items.length) return null;
  return (
    <div>
      <p className="eyebrow mb-4">{title}</p>
      <div className="grid grid-cols-3 gap-3">
        {items.map((p) => (
          <div key={p.id} className="group">
            <Link href={`/products/${p.slug}`} className="relative block aspect-[4/5] overflow-hidden rounded-theme-sm bg-surface">
              <Img src={p.image} alt={p.name} sizes="120px" className="transition duration-700 group-hover:scale-105" />
            </Link>
            <p className="mt-2 truncate text-[0.78rem]">{p.name}</p>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[0.75rem] text-muted">{formatMoney(p.price)}</span>
              <button
                onClick={() =>
                  p.variantCount === 1 && p.defaultVariantId
                    ? addToCart({ variantId: p.defaultVariantId, productId: p.id, slug: p.slug, name: p.name, variantTitle: null, image: p.image, price: p.price }, 1, { silent: true })
                    : setQuickView({ slug: p.slug })
                }
                disabled={!p.inStock}
                className="text-[0.7rem] underline underline-offset-2 transition hover:text-accent disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CartDrawer() {
  const { cartOpen, setCartOpen, cart, cartCount } = useStore();
  const { quote, loading } = useQuote({}, cartOpen);
  const subtotal = quote?.subtotal ?? cart.reduce((a, b) => a + b.price * b.quantity, 0);
  return (
    <Drawer
      open={cartOpen}
      onClose={() => setCartOpen(false)}
      title={<span>Your Bag <span className="text-base text-muted">({cartCount})</span></span>}
      footer={
        cart.length ? (
          <div className="space-y-4 px-6 py-5">
            <div className="flex items-center justify-between text-[0.95rem]">
              <span>Subtotal</span>
              <span className={loading ? 'opacity-50' : ''}>{formatMoney(subtotal)}</span>
            </div>
            <p className="text-[0.75rem] text-muted">Shipping, discounts and payment options are calculated at checkout.</p>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/cart" onClick={() => setCartOpen(false)} className="btn btn-secondary">View bag</Link>
              <Link href="/checkout" onClick={() => setCartOpen(false)} className="btn btn-primary">Checkout</Link>
            </div>
          </div>
        ) : null
      }
    >
      {cart.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center px-8 py-16 text-center">
          <ShoppingBag size={40} strokeWidth={1} className="text-muted" />
          <p className="font-heading mt-6 text-2xl">Your bag is empty</p>
          <p className="mt-2 text-[0.9rem] text-muted">Discover pieces made for your moments.</p>
          <Link href="/shop" onClick={() => setCartOpen(false)} className="btn btn-primary mt-8">Start shopping</Link>
          <div className="mt-12 w-full text-left"><Recommendations exclude={[]} title="Most loved" /></div>
        </div>
      ) : (
        <div className="px-6">
          {quote && (
            <div className="border-b border-line py-5">
              <FreeShippingBar remaining={quote.freeShippingRemaining} threshold={quote.freeShippingThreshold} />
            </div>
          )}
          {quote?.issues.map((i) => (
            <p key={i} className="mt-4 rounded-theme-sm bg-surface px-3 py-2 text-[0.8rem] text-sale">{i}</p>
          ))}
          <CartLines compact />
          <div className="border-t border-line py-6">
            <Recommendations exclude={cart.map((c) => c.productId)} />
          </div>
        </div>
      )}
    </Drawer>
  );
}
