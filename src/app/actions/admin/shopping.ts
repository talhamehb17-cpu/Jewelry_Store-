'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth';
import { getSettings, saveSetting } from '@/lib/settings';
import { ADVANCE_METHODS, normalizeShopping, type AdvanceMethod, type ShoppingSettings } from '@/lib/shopping-rules';

type R = { ok: boolean; message: string };

export async function saveShoppingRules(input: {
  minOrderEnabled: boolean;
  minOrderAmount: number;
  freeShippingRupees: number;
  highValue: ShoppingSettings['highValue'];
}): Promise<R> {
  const user = await assertAdmin({ adminOnly: true });
  const highValue = {
    ...input.highValue,
    threshold: Math.round(Number(input.highValue.threshold) * 100),
    advanceMethods: input.highValue.advanceMethods.filter((method): method is AdvanceMethod => (ADVANCE_METHODS as readonly string[]).includes(method)),
  };
  const shopping = normalizeShopping({
    minOrderEnabled: input.minOrderEnabled,
    minOrderAmount: Math.round(Number(input.minOrderAmount) * 100),
    highValue,
    audit: { by: user.firstName || user.email, at: new Date().toISOString() },
  });
  if (shopping.highValue.enabled) {
    if (shopping.highValue.threshold <= 0) return { ok: false, message: 'Enter a threshold above zero, or turn the high-value rule off.' };
    if (shopping.highValue.advancePercent < 1 || shopping.highValue.advancePercent > 99) return { ok: false, message: 'The advance percentage must be between 1 and 99.' };
    if (shopping.highValue.advancePercent + shopping.highValue.remainingPercent !== 100) return { ok: false, message: 'The advance and remaining percentages must add up to 100.' };
    if (!shopping.highValue.advanceMethods.length) return { ok: false, message: 'Choose at least one advance method. Card payments stay off.' };
    if (!shopping.highValue.allowRemainingCod) return { ok: false, message: 'The remaining balance stays Cash on Delivery. Do not turn that off from this form.' };
  }
  if (shopping.minOrderEnabled && shopping.minOrderAmount <= 0) return { ok: false, message: 'Enter a minimum order amount, or turn that rule off.' };
  const freeShipping = Math.max(0, Math.round(Number(input.freeShippingRupees) * 100));
  const current = await getSettings();
  await saveSetting('shopping', shopping);
  await saveSetting('shipping', { ...current.shipping, freeThreshold: freeShipping });
  revalidatePath('/admin/shopping');
  revalidatePath('/checkout');
  revalidatePath('/', 'layout');
  return { ok: true, message: `Saved by ${shopping.audit?.by} at ${shopping.audit?.at}. Existing orders keep the rule they were placed with.` };
}
