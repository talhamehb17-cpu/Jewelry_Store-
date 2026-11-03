'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Lock, ShieldCheck, Tag, X, Banknote, Landmark, Smartphone, ShoppingBag, ChevronDown } from 'lucide-react';
import { useStore } from './providers';
import { useQuote, FreeShippingBar } from './cart-drawer';
import { Img } from '@/components/ui/img';
import { placeOrder } from '@/app/actions/checkout';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

type AccountMethod = { enabled: boolean; accountName: string; accountNumber: string; instructions: string };
type Payments = {
  cod: { enabled: boolean; instructions: string; maxOrder: number };
  bank: { enabled: boolean; bankName: string; accountTitle: string; accountNumber: string; iban: string; instructions: string };
  easypaisa: AccountMethod;
  jazzcash: AccountMethod;
  wallet: { enabled: boolean; jazzcash: string; easypaisa: string; accountTitle: string; instructions: string };
  card: { enabled: boolean };
};
type PayId = 'cod' | 'bank' | 'easypaisa' | 'jazzcash';

type Prefill = { email: string; phone: string; firstName: string; lastName: string; line1: string; line2: string; city: string; province: string; postalCode: string };

const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Sialkot', 'Gujranwala', 'Hyderabad', 'Quetta', 'Bahawalpur', 'Sargodha', 'Abbottabad', 'Sukkur'];

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-[0.78rem] text-sale" role="alert">{error}</p>}
    </div>
  );
}

function ProofUpload({ token, onToken }: { token: string | null; onToken: (token: string | null) => void }) {
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <label className="label">Payment receipt</label>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="field file:mr-3 file:border-0 file:bg-transparent file:text-[0.82rem]"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          onToken(null);
          setName('');
          if (!file) return;
          if (file.size > 4 * 1024 * 1024) {
            setErr('The receipt must be under 4 MB.');
            return;
          }
          setBusy(true);
          setErr('');
          const body = new FormData();
          body.set('file', file);
          const res = await fetch('/api/checkout/proof', { method: 'POST', body });
          const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
          setBusy(false);
          if (!res.ok || !data.token) {
            setErr(data.error || 'Could not upload the receipt.');
            return;
          }
          setName(file.name);
          onToken(data.token);
        }}
      />
      <p className="mt-1 text-[0.75rem] text-muted">{busy ? 'Uploading…' : token ? `Receipt attached${name ? `: ${name}` : ''}. It is visible only to you and the store team.` : 'Required. JPG, PNG, WEBP or PDF, up to 4 MB.'}</p>
      {err && <p className="mt-1 text-[0.78rem] text-sale" role="alert">{err}</p>}
    </div>
  );
}

export function CheckoutForm({ prefill, provinces, payments, loggedIn, cancelledNotice }: { prefill: Prefill; provinces: readonly string[]; payments: Payments; loggedIn: boolean; cancelledNotice?: string | null }) {
  const router = useRouter();
  const { cart, cartReady, clearCart } = useStore();
  const [f, setF] = useState<Prefill>(prefill);
  const [shippingMethod, setShippingMethod] = useState('standard');
  const firstPm: PayId = payments.cod.enabled ? 'cod' : payments.easypaisa.enabled ? 'easypaisa' : payments.jazzcash.enabled ? 'jazzcash' : 'bank';
  const [paymentMethod, setPaymentMethod] = useState<PayId>(firstPm);
  const [paymentRef, setPaymentRef] = useState('');
  const [proofToken, setProofToken] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saveAddress, setSaveAddress] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState(cancelledNotice ?? '');
  const [pending, start] = useTransition();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const { quote, loading } = useQuote({ discountCode: code, shippingMethod, paymentMethod, email: f.email });

  useEffect(() => {
    if (quote && !quote.shippingMethods.some((m) => m.id === shippingMethod) && quote.shippingMethods[0]) setShippingMethod(quote.shippingMethods[0].id);
  }, [quote, shippingMethod]);

  const set = (k: keyof Prefill) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  if (cartReady && cart.length === 0) {
    return (
      <div className="container-x py-24 text-center">
        <ShoppingBag size={42} strokeWidth={1} className="mx-auto text-muted" />
        <h1 className="t-2 mt-6">Your bag is empty</h1>
        {formError && <p className="mx-auto mt-4 max-w-md text-[0.9rem] text-sale">{formError}</p>}
        <p className="mt-3 text-muted">Add a few treasures before checking out.</p>
        <Link href="/shop" className="btn btn-primary mt-8">Continue shopping</Link>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError('');
    if ((paymentMethod === 'bank' || paymentMethod === 'easypaisa' || paymentMethod === 'jazzcash') && !proofToken) {
      setFormError('Upload a payment receipt before placing the order.');
      return;
    }
    start(async () => {
      const res = await placeOrder({
        ...f,
        shippingMethod,
        paymentMethod,
        paymentRef,
        proofToken: proofToken ?? '',
        discountCode: code ?? '',
        note,
        saveAddress: loggedIn && saveAddress,
        lines: cart.map((c) => ({ variantId: c.variantId, quantity: c.quantity })),
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (res.external) {
        window.location.href = res.redirect;
        return;
      }
      clearCart();
      router.push(res.redirect);
    });
  };

  const pmOptions = [
    payments.cod.enabled && { id: 'cod' as const, label: 'Cash on Delivery', sub: 'Pay in cash when your order arrives', icon: Banknote },
    payments.easypaisa.enabled && { id: 'easypaisa' as const, label: 'EasyPaisa', sub: 'Transfer, then upload your receipt', icon: Smartphone },
    payments.jazzcash.enabled && { id: 'jazzcash' as const, label: 'JazzCash', sub: 'Transfer, then upload your receipt', icon: Smartphone },
    payments.bank.enabled && { id: 'bank' as const, label: 'Bank Transfer', sub: 'Transfer, then upload your receipt', icon: Landmark },
  ].filter(Boolean) as { id: PayId; label: string; sub: string; icon: typeof Banknote }[];

  const summary = (
    <div className="space-y-5">
      <ul className="space-y-4">
        {(quote?.lines ?? cart.map((c) => ({ variantId: c.variantId, name: c.name, variantTitle: c.variantTitle, image: c.image, quantity: c.quantity, lineTotal: c.price * c.quantity }))).map((l) => (
          <li key={l.variantId} className="flex items-center gap-4">
            <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-theme-sm bg-surface">
              <Img src={l.image} alt={l.name} sizes="64px" />
              <span className="absolute -right-0 -top-0 grid h-5 min-w-5 place-items-center rounded-bl-md bg-ink px-1 text-[0.65rem] text-bg">{l.quantity}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.9rem]">{l.name}</span>
              {l.variantTitle && <span className="block text-[0.78rem] text-muted">{l.variantTitle}</span>}
            </span>
            <span className="text-[0.9rem]">{formatMoney(l.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <div className="border-t border-line pt-5">
        {code && quote?.discount ? (
          <div className="flex items-center justify-between rounded-theme-sm bg-surface px-3 py-2.5 text-[0.85rem]">
            <span className="inline-flex items-center gap-2"><Tag size={14} strokeWidth={1.5} className="text-accent" /> <strong className="font-medium">{quote.discount.code}</strong> · {quote.discount.label}</span>
            <button type="button" onClick={() => { setCode(null); setCodeInput(''); }} aria-label="Remove discount" className="text-muted hover:text-ink"><X size={15} /></button>
          </div>
        ) : (
          <div>
            <div className="flex gap-2">
              <input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (codeInput.trim()) setCode(codeInput.trim()); } }} placeholder="Discount code" className="field" aria-label="Discount code" />
              <button type="button" onClick={() => codeInput.trim() && setCode(codeInput.trim())} className="btn btn-secondary shrink-0">Apply</button>
            </div>
            {code && quote?.discountError && <p className="mt-2 text-[0.8rem] text-sale" role="alert">{quote.discountError}</p>}
          </div>
        )}
      </div>
      {quote && (
        <dl className={cn('space-y-2.5 border-t border-line pt-5 text-[0.9rem]', loading && 'opacity-60')}>
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatMoney(quote.catalogSubtotal || quote.subtotal)}</dd></div>
          {quote.campaign && quote.campaign.amount > 0 && <div className="flex justify-between text-accent"><dt>{quote.campaign.name} ({quote.campaign.percent}%)</dt><dd>−{formatMoney(quote.campaign.amount)}</dd></div>}
          {quote.discount && quote.discount.amount > 0 && <div className="flex justify-between text-accent"><dt>Code ({quote.discount.code})</dt><dd>−{formatMoney(quote.discount.amount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{quote.shipping === 0 ? 'Complimentary' : formatMoney(quote.shipping)}</dd></div>
          {quote.codFee > 0 && <div className="flex justify-between"><dt className="text-muted">COD fee</dt><dd>{formatMoney(quote.codFee)}</dd></div>}
          {quote.tax > 0 && <div className="flex justify-between"><dt className="text-muted">{quote.taxLabel}</dt><dd>{formatMoney(quote.tax)}</dd></div>}
          <div className="flex items-baseline justify-between border-t border-line pt-4 text-[1.1rem]"><dt>Total</dt><dd className="font-heading text-[1.5rem]">{formatMoney(quote.total)}</dd></div>
        </dl>
      )}
      {quote && quote.freeShippingRemaining > 0 && <FreeShippingBar remaining={quote.freeShippingRemaining} threshold={quote.freeShippingThreshold} />}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="container-x grid gap-10 pb-24 pt-8 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
      <div className="space-y-10">
        <div>
          <nav className="text-[0.75rem] text-muted"><Link href="/cart" className="hover:text-ink">Bag</Link> <span className="mx-1.5">/</span> <span className="text-ink">Checkout</span></nav>
          <h1 className="t-2 mt-3">Checkout</h1>
        </div>
        {formError && <div className="rounded-theme-sm border border-sale/40 bg-sale/5 px-4 py-3 text-[0.88rem] text-sale" role="alert">{formError}</div>}

        <details className="rounded-theme-sm border border-line lg:hidden" open={summaryOpen} onToggle={(e) => setSummaryOpen((e.target as HTMLDetailsElement).open)}>
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[0.9rem] [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">Order summary <ChevronDown size={15} className={cn('transition', summaryOpen && 'rotate-180')} /></span>
            <span className="font-medium">{quote ? formatMoney(quote.total) : '…'}</span>
          </summary>
          <div className="border-t border-line p-4">{summary}</div>
        </details>

        <section>
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="t-4">Contact</h2>
            {!loggedIn && <Link href="/account/login?next=/checkout" className="text-[0.82rem] underline underline-offset-4">Sign in for faster checkout</Link>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" error={errors.email}><input type="email" autoComplete="email" value={f.email} onChange={set('email')} className="field" required /></Field>
            <Field label="Mobile number" error={errors.phone}><input type="tel" autoComplete="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="0300 1234567" className="field" required /></Field>
          </div>
        </section>

        <section>
          <h2 className="t-4 mb-5">Delivery address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" error={errors.firstName}><input autoComplete="given-name" value={f.firstName} onChange={set('firstName')} className="field" required /></Field>
            <Field label="Last name" error={errors.lastName}><input autoComplete="family-name" value={f.lastName} onChange={set('lastName')} className="field" required /></Field>
            <Field label="Address" error={errors.line1} className="sm:col-span-2"><input autoComplete="address-line1" value={f.line1} onChange={set('line1')} placeholder="House, street, area" className="field" required /></Field>
            <Field label="Apartment, landmark (optional)" className="sm:col-span-2"><input autoComplete="address-line2" value={f.line2} onChange={set('line2')} className="field" /></Field>
            <Field label="City" error={errors.city}>
              <input list="pk-cities" autoComplete="address-level2" value={f.city} onChange={set('city')} className="field" required />
              <datalist id="pk-cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Province" error={errors.province}>
              <select value={f.province} onChange={set('province')} className="field" required>
                <option value="">Select province</option>
                {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Postal code (optional)"><input autoComplete="postal-code" inputMode="numeric" value={f.postalCode} onChange={set('postalCode')} className="field" /></Field>
            <Field label="Country"><input value="Pakistan" disabled className="field opacity-70" /></Field>
          </div>
          {loggedIn && (
            <label className="mt-4 flex items-center gap-3 text-[0.88rem]"><input type="checkbox" className="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} /> Save this address to my account</label>
          )}
        </section>

        <section>
          <h2 className="t-4 mb-5">Delivery method</h2>
          <div className="space-y-3">
            {(quote?.shippingMethods ?? []).map((m) => (
              <label key={m.id} className={cn('flex cursor-pointer items-center gap-4 rounded-theme-sm border p-4 transition', shippingMethod === m.id ? 'border-ink' : 'border-line hover:border-muted')}>
                <input type="radio" name="ship" className="checkbox" checked={shippingMethod === m.id} onChange={() => setShippingMethod(m.id)} />
                <span className="flex-1">
                  <span className="block text-[0.92rem]">{m.name}</span>
                  <span className="block text-[0.8rem] text-muted">{m.description}</span>
                </span>
                <span className="text-[0.9rem]">{m.price === 0 ? (m.originalPrice > 0 ? <><s className="mr-2 text-muted">{formatMoney(m.originalPrice)}</s>Free</> : 'Free') : formatMoney(m.price)}</span>
              </label>
            ))}
            {!quote && <div className="skeleton h-16 rounded-theme-sm" />}
          </div>
        </section>

        <section>
          <h2 className="t-4 mb-1">Payment</h2>
          <p className="mb-5 flex items-center gap-2 text-[0.8rem] text-muted"><Lock size={13} /> All transactions are secure and encrypted.</p>
          <div className="divide-y divide-line overflow-hidden rounded-theme-sm border border-line">
            {pmOptions.map((o) => (
              <div key={o.id}>
                <label className={cn('flex cursor-pointer items-center gap-4 p-4 transition', paymentMethod === o.id && 'bg-surface/60')}>
                  <input type="radio" name="pm" className="checkbox" checked={paymentMethod === o.id} onChange={() => setPaymentMethod(o.id)} />
                  <o.icon size={20} strokeWidth={1.25} />
                  <span className="flex-1">
                    <span className="block text-[0.92rem]">{o.label}</span>
                    <span className="block text-[0.78rem] text-muted">{o.sub}</span>
                  </span>
                </label>
                {paymentMethod === o.id && (
                  <div className="border-t border-line bg-surface/40 px-5 py-4 text-[0.85rem] leading-relaxed">
                    {o.id === 'cod' && <p className="text-muted">{payments.cod.instructions}</p>}
                    {o.id === 'bank' && (
                      <div className="space-y-3">
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                          <dt className="text-muted">Bank</dt><dd>{payments.bank.bankName}</dd>
                          <dt className="text-muted">Account title</dt><dd>{payments.bank.accountTitle}</dd>
                          <dt className="text-muted">Account no.</dt><dd className="font-mono text-[0.82rem]">{payments.bank.accountNumber}</dd>
                          <dt className="text-muted">IBAN</dt><dd className="font-mono text-[0.82rem] break-all">{payments.bank.iban}</dd>
                        </dl>
                        <p className="text-muted">{payments.bank.instructions}</p>
                      </div>
                    )}
                    {(o.id === 'easypaisa' || o.id === 'jazzcash') && (
                      <div className="space-y-3">
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                          <dt className="text-muted">Account name</dt><dd>{payments[o.id].accountName}</dd>
                          <dt className="text-muted">Account number</dt><dd className="font-mono text-[0.82rem]">{payments[o.id].accountNumber}</dd>
                        </dl>
                        <p className="text-muted">{payments[o.id].instructions}</p>
                      </div>
                    )}
                    {(o.id === 'bank' || o.id === 'easypaisa' || o.id === 'jazzcash') && (
                      <div className="mt-4 space-y-3">
                        <Field label="Transaction reference (optional)"><input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="TID or transfer reference" className="field" /></Field>
                        <ProofUpload token={proofToken} onToken={setProofToken} />
                      </div>
                    )}

                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <Field label="Order note (optional)"><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Gift message, engraving text or delivery instructions" className="field" /></Field>
        </section>

        <button type="submit" disabled={pending || !quote || loading || ((paymentMethod === 'bank' || paymentMethod === 'easypaisa' || paymentMethod === 'jazzcash') && !proofToken)} className="btn btn-primary btn-block !py-4 text-[0.85rem]">
          {pending ? 'Placing your order…' : `Place order · ${quote ? formatMoney(quote.total) : ''}`}
        </button>
        <p className="flex items-center justify-center gap-2 text-[0.75rem] text-muted"><ShieldCheck size={14} /> By placing your order you agree to our <Link href="/policies/terms-of-service" className="underline">Terms</Link> and <Link href="/policies/privacy-policy" className="underline">Privacy Policy</Link>.</p>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-28 rounded-theme bg-surface/60 p-7">
          <h2 className="t-4 mb-6">Order summary</h2>
          {summary}
        </div>
      </aside>
    </form>
  );
}
