import type { Metadata } from 'next';
import { eq, desc } from 'drizzle-orm';
import { CheckoutForm } from '@/components/store/checkout-form';
import { getCurrentUser } from '@/lib/auth';
import { getSettings, stripeConfigured } from '@/lib/settings';
import { getDb } from '@/db';
import { addresses, orders } from '@/db/schema';
import { verifyOrderToken } from '@/lib/orders';
import { cancelUnpaidCardOrder } from '@/lib/stripe';
import { PROVINCES } from '@/lib/utils';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

type SP = Promise<{ cancelled?: string; token?: string }>;

export default async function CheckoutPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const db = await getDb();

  // Returning from an abandoned Stripe Checkout: release the reserved stock immediately.
  let cancelledNotice: string | null = null;
  if (sp.cancelled && verifyOrderToken(sp.cancelled, sp.token)) {
    const [o] = await db.select().from(orders).where(eq(orders.number, sp.cancelled)).limit(1);
    if (o && o.paymentMethod === 'card' && o.paymentStatus !== 'paid') {
      await cancelUnpaidCardOrder(o.id, 'Customer cancelled card payment');
      cancelledNotice = `Payment for order ${o.number} was not completed, so the order was cancelled and nothing was charged. Your bag is saved — you can try again or choose another payment method.`;
    }
  }

  let prefill = { email: '', phone: '', firstName: '', lastName: '', line1: '', line2: '', city: '', province: '', postalCode: '' };
  if (user) {
    const [addr] = await db.select().from(addresses).where(eq(addresses.userId, user.id)).orderBy(desc(addresses.isDefault)).limit(1);
    prefill = {
      email: user.email,
      phone: addr?.phone ?? user.phone ?? '',
      firstName: addr?.firstName ?? user.firstName,
      lastName: addr?.lastName ?? user.lastName,
      line1: addr?.line1 ?? '',
      line2: addr?.line2 ?? '',
      city: addr?.city ?? '',
      province: addr?.province ?? '',
      postalCode: addr?.postalCode ?? '',
    };
  }
  const p = settings.payments;
  return (
    <CheckoutForm
      prefill={prefill}
      provinces={PROVINCES}
      loggedIn={!!user}
      cancelledNotice={cancelledNotice}
      payments={{
        cod: { enabled: p.cod.enabled, instructions: p.cod.instructions, maxOrder: p.cod.maxOrder },
        bank: { ...p.bank },
        easypaisa: { ...p.easypaisa },
        jazzcash: { ...p.jazzcash },
        wallet: { ...p.wallet },
        card: { enabled: p.card.enabled && stripeConfigured() },
      }}
    />
  );
}
