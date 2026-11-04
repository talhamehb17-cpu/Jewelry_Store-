import assert from 'node:assert/strict';
import { discountFieldChange, discountToSubmit, evaluateHighValue, splitAmounts, type HighValueRule } from '../src/lib/shopping-rules';

const rule = (patch: Partial<HighValueRule> = {}): HighValueRule => ({
  enabled: true,
  threshold: 20_000_000,
  advancePercent: 20,
  remainingPercent: 80,
  requireSlip: true,
  requireVerification: true,
  allowRemainingCod: true,
  advanceMethods: ['easypaisa', 'jazzcash', 'bank'],
  basis: 'payable',
  ...patch,
});

const below = evaluateHighValue({ total: 19_999_900, subtotal: 19_999_900, rule: rule() });
assert.equal(below.applied, false);
assert.equal(below.blocked, null);

const exact = evaluateHighValue({ total: 20_000_000, subtotal: 20_000_000, rule: rule() });
assert.equal(exact.applied, true);
assert.equal(exact.advanceAmount + exact.remainingAmount, 20_000_000);
assert.equal(exact.advanceAmount, 4_000_000);
assert.equal(exact.remainingAmount, 16_000_000);

const odd = splitAmounts(10001, 20);
assert.equal(odd.advanceAmount + odd.remainingAmount, 10001);

const custom = evaluateHighValue({ total: 500_000, subtotal: 500_000, rule: rule({ threshold: 100_000, advancePercent: 30, remainingPercent: 70 }) });
assert.equal(custom.applied, true);
assert.equal(custom.advanceAmount, 150_000);
assert.equal(custom.remainingAmount, 350_000);
assert.equal(custom.advanceAmount + custom.remainingAmount, custom.advanceAmount + custom.remainingAmount);

const off = evaluateHighValue({ total: 50_000_000, subtotal: 50_000_000, rule: rule({ enabled: false }) });
assert.equal(off.applied, false);

const noMethods = evaluateHighValue({ total: 50_000_000, subtotal: 50_000_000, rule: rule({ advanceMethods: [] }) });
assert.equal(noMethods.applied, false);
assert.ok(noMethods.blocked);

const subtotalBasis = evaluateHighValue({ total: 30_000_000, subtotal: 5_000_000, rule: rule({ basis: 'subtotal', threshold: 10_000_000 }) });
assert.equal(subtotalBasis.applied, false);

assert.equal(discountToSubmit('', 'OLDCODE'), '');
assert.equal(discountToSubmit('   ', 'OLDCODE'), '');
assert.equal(discountFieldChange('NEW', 'OLDCODE'), null);
assert.equal(discountToSubmit('SAVE10', 'SAVE10'), 'SAVE10');
assert.equal(discountToSubmit('save10', null), '');

console.log('shopping-rules-check: ok');
