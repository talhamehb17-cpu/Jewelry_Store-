'use server';

import { revalidatePath } from 'next/cache';
import { OrderError, cancelPendingByToken, cancelPendingOrder } from '@/lib/orders';
import { respondToDelivery } from '@/lib/fulfillment';
import { getCurrentUser } from '@/lib/auth';
import { sendEmail, statusEmail } from '@/lib/email';
import { absoluteUrl } from '@/lib/utils';
import type { Order } from '@/db/schema';

async function mailCancelled(order: Order) {
  const link = absoluteUrl(`/account/orders/${order.number}`);
  await sendEmail(order.email, `Your EVERMOON order ${order.number} is cancelled`, statusEmail(order, 'cancelled', link), 'order-cancelled', { orderId: order.id }).catch(() => undefined);
}

export async function cancelMyOrder(orderId: number) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Sign in to cancel an order.' };
  try {
    const order = await cancelPendingOrder(orderId, user.id);
    await mailCancelled(order);
    revalidatePath('/account/orders');
    return { ok: true, message: `${order.number} is cancelled. Stock has been returned.` };
  } catch (e) {
    return { ok: false, message: e instanceof OrderError ? e.message : 'The order could not be cancelled.' };
  }
}

export async function cancelGuestOrder(number: string, token: string) {
  try {
    const order = await cancelPendingByToken(number, token);
    await mailCancelled(order);
    revalidatePath('/checkout/success');
    return { ok: true, message: `${order.number} is cancelled. Stock has been returned.` };
  } catch (e) {
    return { ok: false, message: e instanceof OrderError ? e.message : 'The order could not be cancelled.' };
  }
}

export async function answerDelivery(orderId: number, received: boolean) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Sign in to confirm delivery.' };
  const result = await respondToDelivery(orderId, user.id, received);
  revalidatePath('/account/orders');
  return result;
}
