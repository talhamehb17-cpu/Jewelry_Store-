'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ShoppingBag, Tag, X, Lock } from 'lucide-react';
import { useStore } from './providers';
import { CartLines, FreeShippingBar, Recommendations, useQuote } from './cart-drawer';
import { useDisplayMoney } from './currency-context';
import { discountFieldChange } from '@/lib/shopping-rules';
import { cn } from '@/lib/utils';

export function CartPageView() {
  const { cart, cartReady, cartCount } = useStore();
  const money = useDisplayMoney();
  const [codeInput, setCodeInput] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [method, setMethod] = useState('standard');
  const { quote, loading } = useQuote({ discountCode: code, shippingMethod: method });

  if (!cartReady) return <div className="container-x py-24"><div className="skeleton mx-auto h-64 max-w-3xl rounded-theme" /></div>;
  if (!cart.length) {
    return (
      <div className="container-x py-24 text-center">
        <ShoppingBag size={44} strokeWidth={1} className="mx-auto text-muted" />
        <h1 className="t-2 mt-6">Your bag is empty</h1>
        <p className="mt-3 text-muted">Discover timeless pieces made for your moments.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/shop" className="btn btn-primary">Shop all jewelry</Link>
          <Link href="/collections/best-sellers" className="btn btn-secondary">Best sellers</Link>
        </div>
        <div className="mx-auto mt-20 max-w-2xl text-left"><Recommendations exclude={[]} title="Most loved pieces" limit={3} /></div>
      </div>
    );
  }
  return (
    <div className="container-x pb-24 pt-10 md:pt-14">
      <h1 className="t-1">Your Bag <span className="text-[0.5em] text-muted">({cartCount})</span></h1>
      <div className="mt-10 grid gap-12 lg:grid-cols-[1.6fr_1fr]">
        <div>
          {quote && <div className="mb-2 rounded-theme-sm bg-surface/60 p-5"><FreeShippingBar remaining={quote.freeShippingRemaining} threshold={quote.freeShippingThreshold} /></div>}
          {quote?.issues.map((i) => <p key={i} className="mt-3 rounded-theme-sm bg-surface px-3 py-2 text-[0.82rem] text-sale">{i}</p>)}
          <CartLines quote={quote} />
          <div className="mt-10 border-t border-line pt-10"><Recommendations exclude={cart.map((c) => c.productId)} title="Complete your look" limit={3} /></div>
        </div>
        <aside>
          <div className="sticky top-28 space-y-6 rounded-theme bg-surface/60 p-7">
            <h2 className="t-4">Summary</h2>
            <div>
              <p className="label">Discount code</p>
              {code && quote?.discount ? (
                <div className="flex items-center justify-between rounded-theme-sm bg-bg px-3 py-2.5 text-[0.85rem]">
                  <span className="inline-flex items-center gap-2"><Tag size={14} className="text-accent" /> <strong className="font-medium">{quote.discount.code}</strong> · {quote.discount.label}</span>
                  <button onClick={() => { setCode(null); setCodeInput(''); }} aria-label="Remove discount"><X size={15} /></button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input value={codeInput} onChange={(e) => { const next = e.target.value.toUpperCase(); setCodeInput(next); setCode((applied) => discountFieldChange(next, applied)); }} onKeyDown={(e) => { if (e.key === 'Enter' && codeInput.trim()) { const next = codeInput.trim().toUpperCase(); setCodeInput(next); setCode(next); } }} placeholder="e.g. WELCOME10" className="field" aria-label="Discount code" />
                    <button onClick={() => { const next = codeInput.trim().toUpperCase(); if (!next) { setCode(null); setCodeInput(''); return; } setCodeInput(next); setCode(next); }} className="btn btn-secondary shrink-0">Apply</button>
                  </div>
                  {code && quote?.discountError && <p className="mt-2 text-[0.8rem] text-sale">{quote.discountError}</p>}
                </>
              )}
            </div>
            <div>
              <p className="label">Estimate shipping</p>
              <div className="space-y-2">
                {quote?.shippingMethods.map((m) => (
                  <label key={m.id} className={cn('flex cursor-pointer items-center gap-3 rounded-theme-sm border bg-bg px-3 py-2.5 text-[0.85rem]', method === m.id ? 'border-ink' : 'border-line')}>
                    <input type="radio" className="checkbox" checked={method === m.id} onChange={() => setMethod(m.id)} />
                    <span className="flex-1">{m.name}<span className="block text-[0.75rem] text-muted">{m.description}</span></span>
                    <span>{m.price ? money(m.price) : 'Free'}</span>
                  </label>
                ))}
              </div>
            </div>
            {quote && (
              <dl className={cn('space-y-2.5 border-t border-line pt-5 text-[0.9rem]', loading && 'opacity-60')}>
                <div className="flex justify-between"><dt className="text-muted">Product subtotal</dt><dd>{money(quote.catalogSubtotal || quote.subtotal)}</dd></div>
                {quote.campaign && quote.campaign.amount > 0 && <div className="flex justify-between text-accent"><dt>{quote.campaign.name}</dt><dd>−{money(quote.campaign.amount)}</dd></div>}
                {quote.discount && quote.discount.amount > 0 && <div className="flex justify-between text-accent"><dt>Discount</dt><dd>−{money(quote.discount.amount)}</dd></div>}
                {quote.giftTotal > 0 && <div className="flex justify-between"><dt className="text-muted">Premium Gift Packaging</dt><dd>{money(quote.giftTotal)}</dd></div>}
                <div className="flex justify-between"><dt className="text-muted">Delivery charges</dt><dd>{quote.shipping ? money(quote.shipping) : 'Complimentary'}</dd></div>
                <div className="flex items-baseline justify-between border-t border-line pt-4"><dt>Estimated total</dt><dd className="font-heading text-[1.5rem]">{money(quote.total)}</dd></div>
              </dl>
            )}
            <Link href="/checkout" className="btn btn-primary btn-block !py-4"><Lock size={14} /> Secure checkout</Link>
            <p className="text-center text-[0.75rem] text-muted">EasyPaisa · JazzCash · Bank transfer</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
