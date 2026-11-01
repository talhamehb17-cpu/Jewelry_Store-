export const MANUAL_METHODS = ['bank', 'easypaisa', 'jazzcash'] as const;
export type ManualMethod = (typeof MANUAL_METHODS)[number];
export type CheckoutMethod = ManualMethod | 'cod' | 'card' | 'wallet';

export function isManualMethod(value: string): value is ManualMethod {
  return (MANUAL_METHODS as readonly string[]).includes(value);
}

export function paymentLabel(method: string) {
  const labels: Record<string, string> = {
    cod: 'Cash on Delivery',
    bank: 'Bank transfer',
    wallet: 'JazzCash / EasyPaisa',
    easypaisa: 'EasyPaisa',
    jazzcash: 'JazzCash',
    card: 'Card',
  };
  return labels[method] ?? method;
}

export function paymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    unpaid: 'Payment proof pending',
    awaiting: 'Payment under review',
    paid: 'Payment verified',
    failed: 'Payment rejected',
    refunded: 'Refunded',
    partially_refunded: 'Partially refunded',
  };
  return labels[status] ?? status;
}
