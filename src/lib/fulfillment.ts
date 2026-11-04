export { progressOrders, ordersAwaitingDeliveryConfirmation, respondToDelivery, customerAlertCount, type ProgressResult, type DeliveryPrompt } from './delivery-engine';

let lastProgress = 0;

/** Catch-up when the atelier opens admin. The timestamps in Neon are the source of truth; this does not wait on a browser timer. */
export function scheduleProgress() {
  if (Date.now() - lastProgress < 60_000) return;
  lastProgress = Date.now();
  void import('./delivery-engine')
    .then((m) => m.progressOrders())
    .catch(() => undefined);
}
