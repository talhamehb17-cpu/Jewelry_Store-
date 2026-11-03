'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelMyOrder } from '@/app/actions/account-orders';

export function CancelOrder({ orderId, pendingStatus, phone, email }: { orderId: number; pendingStatus: boolean; phone: string; email: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const router = useRouter();
  if (!pendingStatus) {
    return (
      <div className="rounded-theme border border-line p-4 text-[0.88rem] leading-relaxed">
        <p className="font-medium">Cancellation</p>
        <p className="mt-1 text-muted">This order is no longer Pending, so it cannot be cancelled from your account. Contact client care{phone ? ` on ${phone}` : ''}{email ? ` or ${email}` : ''} and they can review it.</p>
      </div>
    );
  }
  return (
    <div className="rounded-theme border border-line p-4">
      <p className="text-[0.88rem] text-muted">You can cancel while the order is Pending. After it is confirmed, use client care.</p>
      {msg && <p className="mt-2 text-[0.85rem]" role="status">{msg}</p>}
      <button
        type="button"
        disabled={busy}
        className="btn btn-secondary mt-3"
        onClick={() => {
          if (!confirm('Cancel this pending order?')) return;
          start(async () => {
            const res = await cancelMyOrder(orderId);
            setMsg(res.message);
            if (res.ok) router.refresh();
          });
        }}
      >
        {busy ? 'Cancelling…' : 'Cancel order'}
      </button>
    </div>
  );
}
