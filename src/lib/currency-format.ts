export const CURRENCY_COOKIE = 'evermoon_currency';

export const CURRENCIES = [
  { code: 'PKR', label: 'Pakistani Rupee', symbol: 'Rs' },
  { code: 'USD', label: 'US Dollar', symbol: 'US$' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'AED', label: 'UAE Dirham', symbol: 'AED' },
  { code: 'SAR', label: 'Saudi Riyal', symbol: 'SAR' },
  { code: 'CNY', label: 'Chinese Yuan', symbol: 'CN¥' },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];

const CODES = new Set<string>(CURRENCIES.map((c) => c.code));

export function isCurrency(value: string | null | undefined): value is CurrencyCode {
  return !!value && CODES.has(value);
}

/** Converts a PKR minor-unit amount. Returns null if that currency has no stored rate. Never invents a rate. */
export function convertFromPkr(paisa: number, code: CurrencyCode, rates: Partial<Record<CurrencyCode, number>>) {
  if (code === 'PKR') return paisa / 100;
  const perPkr = rates[code];
  if (!perPkr || perPkr <= 0) return null;
  return (paisa / 100) * perPkr;
}

export function formatDisplay(paisa: number, code: CurrencyCode, rates: Partial<Record<CurrencyCode, number>>) {
  if (code === 'PKR') {
    const value = Math.round(paisa / 100);
    const sign = value < 0 ? '−' : '';
    return `${sign}Rs ${Math.abs(value).toLocaleString('en-PK')}`;
  }
  const major = convertFromPkr(paisa, code, rates);
  if (major == null) return null;
  const meta = CURRENCIES.find((c) => c.code === code)!;
  const abs = Math.abs(major);
  const digits = abs >= 100 ? 0 : 2;
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${major < 0 ? '−' : ''}${meta.symbol} ${formatted}`;
}
