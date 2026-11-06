import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { exchangeRates } from '@/db/schema';
import { CURRENCIES, isCurrency, type CurrencyCode } from './currency-format';

export { CURRENCY_COOKIE, CURRENCIES, convertFromPkr, formatAtRate, formatDisplay, formatFromBook, isCurrency, type CurrencyCode } from './currency-format';

export type RateBook = {
  code: CurrencyCode;
  rates: Partial<Record<CurrencyCode, number>>;
  fetchedAt: string | null;
  source: string | null;
};

export async function getRateBook(): Promise<RateBook> {
  const db = await getDb();
  const rows = await db.select().from(exchangeRates);
  const rates: Partial<Record<CurrencyCode, number>> = { PKR: 1 };
  let fetchedAt: string | null = null;
  let source: string | null = null;
  for (const row of rows) {
    if (!isCurrency(row.code) || !(row.perPkr > 0)) continue;
    rates[row.code] = row.perPkr;
    const iso = row.fetchedAt.toISOString();
    if (!fetchedAt || iso > fetchedAt) {
      fetchedAt = iso;
      source = row.source;
    }
  }
  return { code: 'PKR', rates, fetchedAt, source };
}

const RATE_URL = 'https://open.er-api.com/v6/latest/USD';

/** Pulls a public rate table. Stores only currencies the source actually returned. */
export async function refreshExchangeRates() {
  const res = await fetch(RATE_URL, { cache: 'no-store', signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`Exchange-rate source returned ${res.status}.`);
  const body = (await res.json()) as { result?: string; rates?: Record<string, number>; time_last_update_unix?: number };
  const table = body.rates;
  const pkr = table?.PKR;
  if (body.result !== 'success' || !table || pkr == null || !(pkr > 0)) {
    throw new Error('The exchange-rate source did not include a PKR rate. No rates were changed.');
  }
  const pkrPerUsd = pkr;
  const fetchedAt = body.time_last_update_unix ? new Date(body.time_last_update_unix * 1000) : new Date();
  const db = await getDb();
  const saved: string[] = ['PKR'];
  await db
    .insert(exchangeRates)
    .values({ code: 'PKR', perPkr: 1, source: 'base', fetchedAt })
    .onConflictDoUpdate({ target: exchangeRates.code, set: { perPkr: 1, source: 'base', fetchedAt } });
  for (const code of CURRENCIES.map((c) => c.code)) {
    if (code === 'PKR') continue;
    const foreign = table[code];
    if (!(foreign > 0)) continue;
    const perPkr = foreign / pkrPerUsd;
    await db
      .insert(exchangeRates)
      .values({ code, perPkr, source: 'open.er-api.com', fetchedAt })
      .onConflictDoUpdate({ target: exchangeRates.code, set: { perPkr, source: 'open.er-api.com', fetchedAt } });
    saved.push(code);
  }
  return { saved, fetchedAt: fetchedAt.toISOString(), source: RATE_URL };
}

export async function saveManualRate(code: CurrencyCode, perPkr: number) {
  if (code === 'PKR') return;
  if (!(perPkr > 0) || perPkr > 1000) throw new Error('Enter how many units of that currency equal 1 Pakistani rupee.');
  const db = await getDb();
  const fetchedAt = new Date();
  await db
    .insert(exchangeRates)
    .values({ code, perPkr, source: 'admin', fetchedAt })
    .onConflictDoUpdate({ target: exchangeRates.code, set: { perPkr, source: 'admin', fetchedAt } });
}

export async function clearRate(code: CurrencyCode) {
  if (code === 'PKR') return;
  const db = await getDb();
  await db.delete(exchangeRates).where(eq(exchangeRates.code, code));
}
