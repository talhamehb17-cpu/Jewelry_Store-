'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { answerDelivery } from '@/app/actions/account-orders';

export function DeliveryAnswer({ orderId, mode }: { orderId: number; mode: 'pending' | 'no' }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ask = (received: boolean) =>
    start(async () => {
      const res = await answerDelivery(orderId, received);
      setMsg(res.message);
      if (res.ok || ('stale' in res && res.stale)) router.refresh();
    });
  return (
    <div className="rounded-theme border border-line bg-surface/70 p-4">
      <p className="font-medium">{mode === 'no' ? 'You said this package had not arrived.' : 'Have you received this package?'}</p>
      <p className="mt-1 text-[0.85rem] text-muted">{mode === 'no' ? 'The order is still out for delivery. You can update that if it has arrived since.' : 'Yes marks it delivered. No keeps it out for delivery and tells the atelier.'}</p>
      {msg && <p className="mt-2 text-[0.85rem]" role="status">{msg}</p>}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button type="button" className="btn btn-primary" disabled={pending} onClick={() => ask(true)}>{pending ? 'Saving…' : 'Yes, I received it'}</button>
        {mode === 'pending' && <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => ask(false)}>No, not yet</button>}
      </div>
    </div>
  );
}
