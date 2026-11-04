import { formatMoney } from './money';

export const ADVANCE_METHODS = ['easypaisa', 'jazzcash', 'bank'] as const;
export type AdvanceMethod = (typeof ADVANCE_METHODS)[number];

/** Initial example only. Live checkout reads the saved admin rule, never these literals. */
export const INITIAL_HIGH_VALUE_RULE: HighValueRule = {
  enabled: true,
  threshold: 20_000_000,
  advancePercent: 20,
  remainingPercent: 80,
  requireSlip: true,
  requireVerification: true,
  allowRemainingCod: true,
  advanceMethods: ['easypaisa', 'jazzcash', 'bank'],
  basis: 'payable',
};

export type HighValueRule = {
  enabled: boolean;
  threshold: number;
  advancePercent: number;
  remainingPercent: number;
  requireSlip: boolean;
  requireVerification: boolean;
  allowRemainingCod: boolean;
  advanceMethods: AdvanceMethod[];
  basis: 'payable' | 'subtotal';
};

export type ShoppingSettings = {
  minOrderEnabled: boolean;
  minOrderAmount: number;
  highValue: HighValueRule;
  audit: { by: string; at: string } | null;
};

export type HighValueQuote = {
  enabled: boolean;
  applied: boolean;
  blocked: string | null;
  threshold: number;
  basis: 'payable' | 'subtotal';
  basisAmount: number;
  advancePercent: number;
  remainingPercent: number;
  advanceAmount: number;
  remainingAmount: number;
  advanceMethods: AdvanceMethod[];
  requireSlip: boolean;
  requireVerification: boolean;
  remainingMethod: 'cod' | 'none';
};

export type PaymentPlan = {
  version: 1;
  applied: true;
  basis: 'payable' | 'subtotal';
  threshold: number;
  basisAmount: number;
  total: number;
  advancePercent: number;
  remainingPercent: number;
  advanceAmount: number;
  remainingAmount: number;
  advanceMethod: AdvanceMethod;
  remainingMethod: 'cod' | 'none';
  requireSlip: boolean;
  requireVerification: boolean;
  advanceStatus: 'pending' | 'verified' | 'rejected' | 'not_required';
  verifiedById: number | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
  rejectedReason: string | null;
  rejectedByName: string | null;
  rejectedAt: string | null;
  snapshottedAt: string;
};

const isAdvance = (value: unknown): value is AdvanceMethod => (ADVANCE_METHODS as readonly string[]).includes(String(value));

function clampPercent(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function normalizeRule(input: Partial<HighValueRule> | null | undefined): HighValueRule {
  const advancePercent = clampPercent(input?.advancePercent, INITIAL_HIGH_VALUE_RULE.advancePercent);
  const remainingPercent = input?.remainingPercent == null ? 100 - advancePercent : clampPercent(input.remainingPercent, 100 - advancePercent);
  const methods = (Array.isArray(input?.advanceMethods) ? input.advanceMethods : INITIAL_HIGH_VALUE_RULE.advanceMethods).filter(isAdvance);
  return {
    enabled: input?.enabled ?? INITIAL_HIGH_VALUE_RULE.enabled,
    threshold: Math.max(0, Math.round(Number(input?.threshold) || 0)),
    advancePercent,
    remainingPercent,
    requireSlip: input?.requireSlip !== false,
    requireVerification: input?.requireVerification !== false,
    allowRemainingCod: input?.allowRemainingCod !== false,
    advanceMethods: [...new Set(methods)],
    basis: input?.basis === 'subtotal' ? 'subtotal' : 'payable',
  };
}

export function normalizeShopping(input: Partial<ShoppingSettings> | null | undefined): ShoppingSettings {
  return {
    minOrderEnabled: !!input?.minOrderEnabled,
    minOrderAmount: Math.max(0, Math.round(Number(input?.minOrderAmount) || 0)),
    highValue: normalizeRule(input?.highValue),
    audit: input?.audit?.by && input.audit.at ? { by: String(input.audit.by).slice(0, 120), at: String(input.audit.at) } : null,
  };
}

/** Advance is rounded to the nearest paisa. The remainder is the balance, so the two portions always equal `total`. */
export function splitAmounts(total: number, advancePercent: number) {
  const safeTotal = Math.max(0, Math.round(total));
  const advanceAmount = Math.min(safeTotal, Math.max(0, Math.round((safeTotal * advancePercent) / 100)));
  return { advanceAmount, remainingAmount: safeTotal - advanceAmount };
}

export function evaluateHighValue(input: { total: number; subtotal: number; rule: HighValueRule }): HighValueQuote {
  const rule = normalizeRule(input.rule);
  const basisAmount = rule.basis === 'subtotal' ? Math.max(0, Math.round(input.subtotal)) : Math.max(0, Math.round(input.total));
  const split = splitAmounts(input.total, rule.advancePercent);
  const base: HighValueQuote = {
    enabled: rule.enabled,
    applied: false,
    blocked: null,
    threshold: rule.threshold,
    basis: rule.basis,
    basisAmount,
    advancePercent: rule.advancePercent,
    remainingPercent: rule.remainingPercent,
    advanceAmount: 0,
    remainingAmount: Math.max(0, Math.round(input.total)),
    advanceMethods: rule.advanceMethods,
    requireSlip: rule.requireSlip,
    requireVerification: rule.requireVerification,
    remainingMethod: 'none',
  };
  if (!rule.enabled || rule.threshold <= 0 || basisAmount < rule.threshold) return base;
  if (rule.advancePercent < 1 || rule.advancePercent > 99 || rule.advancePercent + rule.remainingPercent !== 100) {
    return { ...base, blocked: 'The high-value payment rule is incomplete. An administrator needs to save percentages that add up to 100.' };
  }
  if (!rule.advanceMethods.length) {
    return { ...base, blocked: 'This order qualifies for an advance payment, but no advance method is enabled. Choose EasyPaisa, JazzCash or bank transfer in Shopping conditions.' };
  }
  return {
    ...base,
    applied: true,
    advanceAmount: split.advanceAmount,
    remainingAmount: split.remainingAmount,
    remainingMethod: rule.allowRemainingCod ? 'cod' : 'none',
  };
}

export function snapshotPlan(quote: HighValueQuote, method: AdvanceMethod, total: number): PaymentPlan {
  const now = new Date().toISOString();
  return {
    version: 1,
    applied: true,
    basis: quote.basis,
    threshold: quote.threshold,
    basisAmount: quote.basisAmount,
    total,
    advancePercent: quote.advancePercent,
    remainingPercent: quote.remainingPercent,
    advanceAmount: quote.advanceAmount,
    remainingAmount: quote.remainingAmount,
    advanceMethod: method,
    remainingMethod: quote.remainingMethod,
    requireSlip: quote.requireSlip,
    requireVerification: quote.requireVerification,
    advanceStatus: quote.requireVerification ? 'pending' : 'not_required',
    verifiedById: null,
    verifiedByName: null,
    verifiedAt: null,
    rejectedReason: null,
    rejectedByName: null,
    rejectedAt: null,
    snapshottedAt: now,
  };
}

export function advanceBlocksFulfilment(plan: PaymentPlan | null | undefined) {
  if (!plan?.applied) return false;
  if (plan.advanceStatus === 'rejected') return true;
  if (!plan.requireVerification) return false;
  return plan.advanceStatus !== 'verified';
}

export function methodAllowedForQuote(method: string, quote: HighValueQuote) {
  if (quote.blocked) return false;
  if (!quote.applied) return method !== 'card' && method !== 'wallet';
  return isAdvance(method) && quote.advanceMethods.includes(method);
}

/** The field is the source of truth. An emptied or edited box must not resend an earlier code. */
export function discountFieldChange(input: string, applied: string | null) {
  const typed = input.trim().toUpperCase();
  if (!typed || !applied) return null;
  return applied.trim().toUpperCase() === typed ? applied.trim().toUpperCase() : null;
}

export function discountToSubmit(input: string, applied: string | null) {
  return discountFieldChange(input, applied) ?? '';
}

export function planSummary(plan: PaymentPlan) {
  const method = plan.advanceMethod === 'bank' ? 'bank transfer' : plan.advanceMethod === 'jazzcash' ? 'JazzCash' : 'EasyPaisa';
  return `Advance ${formatMoney(plan.advanceAmount)} by ${method}. Remaining ${formatMoney(plan.remainingAmount)} is cash on delivery.`;
}
