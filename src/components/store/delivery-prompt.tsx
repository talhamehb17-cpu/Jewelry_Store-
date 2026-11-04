'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { answerDelivery } from '@/app/actions/account-orders';
import { formatMoney } from '@/lib/money';
import { Img } from '@/components/ui/img';

export type PromptOrder = {
  id: number;
  notificationId: number;
  number: string;
  shippingMethodName: string;
  service: string;
  total: number;
  image: string | null;
  productName: string;
  quantity: number;
};

function hiddenKey(id: number) {
  return `evermoon-delivery-hide:${id}`;
}

export function DeliveryPrompt({ orders }: { orders: PromptOrder[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const next = orders.findIndex((o) => sessionStorage.getItem(hiddenKey(o.notificationId)) !== '1');
    setIndex(next);
    setReady(true);
  }, [orders]);
  const order = orders[index];
  if (!ready || !order) return null;
  const ask = (received: boolean) =>
    start(async () => {
      const res = await answerDelivery(order.id, received);
      setMsg(res.message);
      if (res.ok) {
        sessionStorage.setItem(hiddenKey(order.notificationId), '1');
        router.refresh();
      }
      if ('stale' in res && res.stale) router.refresh();
    });
  const close = () => {
    sessionStorage.setItem(hiddenKey(order.notificationId), '1');
    setIndex(orders.findIndex((o, i) => i > index && sessionStorage.getItem(hiddenKey(o.notificationId)) !== '1'));
  };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-black/45 p-3 sm:place-items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="delivery-ask">
      <style>{`@media (prefers-reduced-motion: no-preference) { .em-pop { animation: em-rise .28s ease; } } @keyframes em-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }`}</style>
      <div className="em-pop w-full max-w-md rounded-theme border border-line bg-bg p-5 text-ink shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="eyebrow">EVERMOON</p>
          <button type="button" className="text-[0.78rem] text-muted underline-offset-2 hover:underline" onClick={close}>Ask me later</button>
        </div>
        <h2 id="delivery-ask" className="mt-3 font-heading text-[1.7rem] leading-tight sm:text-3xl">Has your EVERMOON order arrived?</h2>
        <p className="mt-3 text-[0.92rem] leading-relaxed">Your order is marked as Out for Delivery. Have you received your package?</p>
        <div className="mt-4 flex gap-3 rounded-theme-sm bg-surface p-3">
          <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-theme-sm bg-bg"><Img src={order.image} alt="" sizes="64px" /></span>
          <div className="min-w-0 text-[0.86rem]">
            <p className="font-medium">{order.number}</p>
            <p className="truncate">{order.productName}{order.quantity > 1 ? ` · ${order.quantity} pieces` : ''}</p>
            <p className="text-muted">{order.service} · {order.shippingMethodName}</p>
            <p>{formatMoney(order.total)} PKR</p>
          </div>
        </div>
        {orders.length > 1 && <p className="mt-2 text-[0.75rem] text-muted">{index + 1} of {orders.length} deliveries</p>}
        {msg && <p className="mt-3 text-[0.85rem]" role="status">{msg}</p>}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button type="button" disabled={pending} className="btn btn-primary" onClick={() => ask(true)}>{pending ? 'Saving…' : 'Yes, I Received It'}</button>
          <button type="button" disabled={pending} className="btn btn-secondary" onClick={() => ask(false)}>{pending ? 'Saving…' : 'No, Not Yet'}</button>
        </div>
      </div>
    </div>
  );
}
