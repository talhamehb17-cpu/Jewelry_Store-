'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelGuestOrder } from '@/app/actions/account-orders';

export function GuestCancel({ number, token, pending }: { number: string; token: string; pending: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const router = useRouter();
  if (!pending) return <p className="text-[0.85rem] text-muted">This order is no longer Pending, so it cannot be cancelled from this page. Contact client care.</p>;
  return (
    <div>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={busy}
        onClick={() => {
          if (!confirm('Cancel this pending order?')) return;
          start(async () => {
            const res = await cancelGuestOrder(number, token);
            setMsg(res.message);
            if (res.ok) router.refresh();
          });
        }}
      >
        {busy ? 'Cancelling…' : 'Cancel this pending order'}
      </button>
      {msg && <p className="mt-2 text-[0.85rem]" role="status">{msg}</p>}
    </div>
  );
}
