'use server';

import { cookies } from 'next/headers';
import { refresh } from 'next/cache';
import { CURRENCY_COOKIE, getRateBook, isCurrency } from '@/lib/currency';

export async function setCurrencyAction(code: string) {
  if (!isCurrency(code)) return { ok: false, message: 'Unknown currency.' };
  if (code !== 'PKR') {
    const book = await getRateBook();
    if (!(book.rates[code] && book.rates[code]! > 0)) return { ok: false, message: 'That currency has no saved rate, so it was not selected.' };
  }
  const jar = await cookies();
  jar.set(CURRENCY_COOKIE, code, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  refresh();
  return { ok: true, message: 'Display currency updated. Payment remains in PKR.' };
}
