'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { answerDelivery } from '@/app/actions/account-orders';
import { formatMoney } from '@/lib/money';

type Prompt = { id: number; number: string; expectedAt: string; total: number; shippingMethodName: string; summary: string };

export function DeliveryPrompt({ order }: { order: Prompt }) {
  const [open, setOpen] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!open) return null;
  const ask = (received: boolean) =>
    start(async () => {
      const res = await answerDelivery(order.id, received);
      setMsg(res.message);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-black/40 p-4 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="delivery-ask">
      <div className="w-full max-w-md rounded-theme border border-line bg-bg p-6 text-ink shadow-2xl">
        <p className="eyebrow">Delivery</p>
        <h2 id="delivery-ask" className="mt-2 font-heading text-3xl">Has your EVERMOON order been delivered?</h2>
        <p className="mt-3 text-[0.92rem] leading-relaxed">{order.number} · {order.summary}</p>
        <p className="mt-1 text-[0.85rem] text-muted">{order.shippingMethodName} · expected {new Date(order.expectedAt).toLocaleString('en-GB', { timeZone: 'Asia/Karachi' })} PKT · {formatMoney(order.total)} PKR</p>
        {msg && <p className="mt-3 text-[0.85rem]" role="status">{msg}</p>}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button type="button" disabled={pending} className="btn btn-primary" onClick={() => ask(true)}>{pending ? 'Saving…' : 'Yes, I received it'}</button>
          <button type="button" disabled={pending} className="btn btn-secondary" onClick={() => ask(false)}>{pending ? 'Saving…' : 'No, I haven’t received it'}</button>
        </div>
      </div>
    </div>
  );
}
