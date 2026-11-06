import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { convertFromPkr, formatAtRate, formatDisplay, formatFromBook } from '../src/lib/currency-format';
import { formatMoney } from '../src/lib/money';

const packaging = 25_000;
const usd = 0.0036;
const gbp = 0.0027;
const aed = 0.0132;
const eur = 0.0031;
const jpy = 0.54;

assert.equal(formatFromBook(packaging, 'PKR', {}), formatMoney(packaging));
assert.equal(formatAtRate(packaging, 'PKR', 1), 'Rs 250');
assert.equal(formatAtRate(packaging, null, null), 'Rs 250');
assert.equal(formatAtRate(packaging, 'USD', null), 'Rs 250');
assert.equal(formatAtRate(packaging, 'USD', 0), 'Rs 250');
assert.equal(formatAtRate(packaging, 'USD', -1), 'Rs 250');
assert.equal(formatAtRate(packaging, 'XXX', usd), 'Rs 250');
assert.equal(formatAtRate(packaging, 'USD', String(usd)), formatAtRate(packaging, 'USD', usd));
assert.equal(formatAtRate(packaging, 'USD', 'nope'), 'Rs 250');

for (const [code, rate, symbol] of [
  ['USD', usd, 'US$'],
  ['GBP', gbp, '£'],
  ['EUR', eur, '€'],
  ['AED', aed, 'AED'],
] as const) {
  const live = formatFromBook(packaging, code, { [code]: rate });
  const saved = formatAtRate(packaging, code, rate);
  assert.equal(saved, live, `${code} snapshot must use the same formatter as the live book`);
  assert.equal(saved, formatDisplay(packaging, code, { [code]: rate }));
  assert.equal(saved?.startsWith(symbol), true, `${code} symbol: ${saved}`);
  assert.equal(saved?.includes('Rs'), false, `${code} must not show Rs: ${saved}`);
  assert.equal(saved?.includes('PKR'), false, `${code} must not show PKR: ${saved}`);
  assert.notEqual(formatAtRate(packaging, code, rate * 2), saved, `${code} must follow the rate it is given`);
}

const piece = 18_500_000;
const book = {
  USD: usd,
  GBP: gbp,
  EUR: eur,
  AED: aed,
  SAR: 0.0135,
  CAD: 0.0049,
  AUD: 0.0054,
  CNY: 0.025,
  TRY: 0.12,
  JPY: jpy,
} as const;

function shown(code: keyof typeof book | 'PKR', selected: boolean) {
  const rates = { ...book };
  const unit = formatFromBook(packaging, code, rates);
  const extra = selected ? packaging : 0;
  return {
    unit,
    product: formatFromBook(piece, code, rates),
    packagingLine: selected ? formatFromBook(packaging, code, rates) : null,
    total: formatFromBook(piece + extra, code, rates),
  };
}

let selected = false;
assert.equal(shown('PKR', selected).unit, 'Rs 250');
selected = true;
assert.equal(shown('PKR', selected).packagingLine, 'Rs 250');
assert.equal(shown('PKR', selected).total, formatMoney(piece + packaging));

for (const code of ['USD', 'GBP', 'EUR', 'AED', 'SAR', 'CAD', 'AUD', 'CNY', 'TRY', 'JPY'] as const) {
  const before = shown(code, false).unit;
  const after = shown(code, true);
  assert.equal(after.unit, before, `${code} unit must not change just because the box is checked`);
  assert.equal(after.packagingLine, before);
  assert.equal(after.unit.includes('Rs'), false, after.unit);
  assert.equal(after.unit.includes('PKR'), false, after.unit);
  assert.equal(after.product.includes('Rs'), false);
  assert.equal(after.total.includes('Rs'), false);
  assert.equal(after.total, formatFromBook(piece + packaging, code, book), `${code} total converts the PKR sum once`);
  assert.equal(formatFromBook(packaging, code, book), formatDisplay(packaging, code, book));
}

const usdSelected = shown('USD', true);
const gbpSelected = shown('GBP', true);
assert.notEqual(usdSelected.unit, gbpSelected.unit);
assert.equal(packaging, 25_000, 'the stored base stays PKR paisa');

const once = convertFromPkr(packaging, 'USD', { USD: usd });
assert.ok(once != null);
const twice = convertFromPkr(Math.round(once * 100), 'USD', { USD: usd });
assert.notEqual(twice, once, 'a second conversion is a different number; display must start from PKR paisa');

const yen = formatAtRate(packaging, 'JPY', jpy);
assert.equal(yen?.includes('.'), false, `JPY stays on the existing zero-decimal rule: ${yen}`);
assert.equal(yen?.includes('Rs'), false);

assert.equal(formatFromBook(piece + packaging, 'USD', book), formatDisplay(piece + packaging, 'USD', book));
assert.notEqual(formatFromBook(piece + packaging, 'USD', book), formatFromBook(piece, 'USD', book));

const giftUi = readFileSync('src/components/store/gift-packaging.tsx', 'utf8');
assert.equal(giftUi.includes('formatMoney'), false);
assert.equal(giftUi.includes('fetch('), false);
assert.equal(giftUi.includes('useDisplayMoney'), true);

const admin = readFileSync('src/components/admin/packaging-form.tsx', 'utf8');
assert.equal(admin.includes('formatDisplay'), false);
assert.equal(admin.includes('useDisplayMoney'), false);
assert.equal(admin.includes('formatFromBook'), false);

const checkout = readFileSync('src/app/actions/checkout.ts', 'utf8');
assert.equal(checkout.includes('giftPrice'), false);
assert.match(checkout, /displayRate/);

console.log('currency display checks passed');
