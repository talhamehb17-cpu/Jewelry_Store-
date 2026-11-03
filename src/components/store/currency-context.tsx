'use client';

import { createContext, useContext, useTransition } from 'react';
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
  const [pending, start] = useTransition();
  if (!book) return null;
  const available = CURRENCIES.filter((c) => c.code === 'PKR' || (book.rates[c.code] ?? 0) > 0);
  return (
    <label className={compact ? 'inline-flex items-center gap-1 text-[0.72rem]' : 'block text-[0.8rem]'}>
      <span className="sr-only">Display currency</span>
      <select
        aria-label="Display currency"
        disabled={pending}
        value={book.code}
        className="max-w-[9.5rem] bg-transparent text-[0.72rem] uppercase tracking-[0.12em]"
        onChange={(e) => start(async () => { await setCurrencyAction(e.target.value); router.refresh(); })}
      >
        {available.map((c) => (
          <option key={c.code} value={c.code}>{c.code}</option>
        ))}
      </select>
      {pending ? <span className="text-muted">…</span> : null}
    </label>
  );
}
