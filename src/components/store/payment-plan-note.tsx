import { formatMoney } from '@/lib/money';
import { planSummary, type PaymentPlan } from '@/lib/shopping-rules';

export function PaymentPlanNote({ plan }: { plan: PaymentPlan | null | undefined }) {
  if (!plan?.applied) return null;
  const status = plan.advanceStatus === 'verified'
    ? `Advance verified${plan.verifiedByName ? ` by ${plan.verifiedByName}` : ''}. The remaining cash is still due on delivery.`
    : plan.advanceStatus === 'rejected'
      ? `Advance rejected${plan.rejectedReason ? `: ${plan.rejectedReason}` : ''}.`
      : plan.advanceStatus === 'not_required'
        ? 'This order did not require a separate advance review. The remaining cash is still due on delivery.'
        : 'The receipt is under review. Uploading it does not confirm the payment.';
  return (
    <div className="mt-4 rounded-theme-sm border border-line bg-surface/60 p-4 text-[0.88rem]">
      <p>{planSummary(plan)}</p>
      <p className="mt-1 text-muted">Advance {formatMoney(plan.advanceAmount)} · remaining {formatMoney(plan.remainingAmount)} · these are the amounts saved with the order.</p>
      <p className="mt-1 text-muted">{status}</p>
    </div>
  );
}
