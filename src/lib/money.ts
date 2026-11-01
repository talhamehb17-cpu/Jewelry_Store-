export const CURRENCY = { code: 'PKR', symbol: 'Rs', locale: 'en-PK' } as const;

/** All amounts are stored in minor units (paisa). PKR is displayed without decimals. */
export function formatMoney(minor: number | null | undefined): string {
  const value = Math.round((minor ?? 0) / 100);
  const sign = value < 0 ? '−' : '';
  return `${sign}Rs ${Math.abs(value).toLocaleString('en-PK')}`;
}

/** Converts rupees to minor units. */
export const rs = (rupees: number) => Math.round(rupees * 100);

/** Converts minor units to rupees (for form inputs). */
export const toRupees = (minor: number | null | undefined) => (minor == null ? '' : String(Math.round(minor) / 100));

export function percentOff(price: number, compareAt?: number | null) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
