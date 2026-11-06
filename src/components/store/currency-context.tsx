'use client';

import { createContext, useContext, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setCurrencyAction } from '@/app/actions/currency';
import { CURRENCIES, formatDisplay, type CurrencyCode } from '@/lib/currency-format';
import { formatMoney } from '@/lib/money';

type Book = { code: CurrencyCode; rates: Partial<Record<CurrencyCode, number>>; fetchedAt: string | null; source: string | null };

const Ctx = createContext<Book | null>(null);

export function CurrencyProvider({ value, children }: { value: Book; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrency() {
  return useContext(Ctx);
}

export function Money({ minor, className }: { minor: number; className?: string }) {
  const book = useCurrency();
  const text = !book || book.code === 'PKR' ? formatMoney(minor) : formatDisplay(minor, book.code, book.rates) ?? formatMoney(minor);
  return <span className={className}>{text}</span>;
}

export function PayLine({ minor }: { minor: number }) {
  const book = useCurrency();
  const display = book && book.code !== 'PKR' ? formatDisplay(minor, book.code, book.rates) : null;
  return (
    <p className="text-[0.78rem] leading-relaxed text-muted">
      You pay {formatMoney(minor)} PKR
      {book?.code === 'PKR' ? '. Cash on Delivery, EasyPaisa, JazzCash and bank transfer are collected in rupees.' : display ? `. About ${display} at the saved ${book?.code} rate — that figure is a display estimate, not a charge in ${book?.code}.` : '. The selected display currency has no saved rate, so the payable amount stays in PKR.'}
    </p>
  );
}

export function CurrencySwitcher({ compact = false }: { compact?: boolean }) {
  const book = useCurrency();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', key);
    };
  }, [open]);
  if (!book) return null;
  const available = CURRENCIES.filter((c) => c.code === 'PKR' || (book.rates[c.code] ?? 0) > 0);
  const current = available.find((c) => c.code === book.code) ?? available[0];
  const choose = (code: string) => start(async () => {
    await setCurrencyAction(code);
    setOpen(false);
    router.refresh();
  });
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Display currency"
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className={compact ? 'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.72rem] uppercase tracking-[0.12em]' : 'inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[0.78rem]'}
      >
        <span aria-hidden>{current?.flag}</span>
        <span className={compact ? 'max-[359px]:sr-only' : undefined}>{current?.code}</span>
        {pending ? <span className="text-muted">…</span> : null}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[70] mt-2 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-theme border border-line bg-bg text-ink shadow-[0_24px_48px_-28px_rgba(0,0,0,.45)]" role="listbox">
          <p className="border-b border-line px-3 py-2 text-[0.68rem] uppercase tracking-[0.14em] text-muted">Display currency · you still pay in PKR</p>
          <ul className="max-h-80 overflow-auto py-1">
            {available.map((c) => (
              <li key={c.code}>
                <button type="button" role="option" aria-selected={c.code === book.code} onClick={() => choose(c.code)} className="flex w-full items-center gap-3 px-3 py-2 text-left text-[0.84rem] hover:bg-surface">
                  <span className="text-base" aria-hidden>{c.flag}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{c.code} · {c.symbol}</span>
                    <span className="block text-[0.72rem] text-muted">{c.label}</span>
                  </span>
                  {c.code === book.code && <span className="text-[0.7rem] text-accent">Selected</span>}
                </button>
              </li>
            ))}
          </ul>
          {book.fetchedAt && <p className="border-t border-line px-3 py-2 text-[0.68rem] text-muted">Rates saved {new Date(book.fetchedAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi' })}</p>}
        </div>
      )}
    </div>
  );
}
