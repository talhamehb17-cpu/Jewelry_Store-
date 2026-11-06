export const CURRENCY_COOKIE = 'evermoon_currency';

export const CURRENCIES = [
  { code: 'PKR', label: 'Pakistani Rupee', symbol: 'Rs', flag: '🇵🇰' },
  { code: 'USD', label: 'US Dollar', symbol: 'US$', flag: '🇺🇸' },
  { code: 'GBP', label: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'EUR', label: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'AED', label: 'UAE Dirham', symbol: 'AED', flag: '🇦🇪' },
  { code: 'SAR', label: 'Saudi Riyal', symbol: 'SAR', flag: '🇸🇦' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'CA$', flag: '🇨🇦' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CNY', label: 'Chinese Yuan', symbol: 'CN¥', flag: '🇨🇳' },
  { code: 'TRY', label: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
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
  const digits = code === 'JPY' || abs >= 100 ? 0 : 2;
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${major < 0 ? '−' : ''}${meta.symbol} ${formatted}`;
}

/** Live storefront display. Converts PKR paisa once. A missing rate stays in PKR rather than inventing one. */
export function formatFromBook(paisa: number, code: CurrencyCode, rates: Partial<Record<CurrencyCode, number>>) {
  if (code === 'PKR') return formatDisplay(paisa, 'PKR', {})!;
  return formatDisplay(paisa, code, rates) ?? formatDisplay(paisa, 'PKR', {})!;
}

/**
 * Historical order display. Uses only the rate saved on that order.
 * A later live rate must not be passed here, and a missing snapshot stays in PKR.
 */
export function formatAtRate(paisa: number, code: string | null | undefined, rate: number | string | null | undefined) {
  const numeric = typeof rate === 'number' ? rate : typeof rate === 'string' && rate.trim() !== '' ? Number(rate) : Number.NaN;
  if (!isCurrency(code) || code === 'PKR' || !(Number.isFinite(numeric) && numeric > 0)) {
    return formatDisplay(paisa, 'PKR', {})!;
  }
  return formatDisplay(paisa, code, { [code]: numeric }) ?? formatDisplay(paisa, 'PKR', {})!;
}
