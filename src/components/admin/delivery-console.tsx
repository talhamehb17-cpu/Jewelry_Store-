'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { markDelivered, saveDeliveryNote, updateOrderStatus } from '@/app/actions/admin/orders';
import { resolveDeliveryIssue } from '@/app/actions/admin/operations';

type Facts = {
  id: number;
  number: string;
  status: string;
  paymentStatus: string;
  shippingMethodName: string;
  timelineStartAt: string | null;
  expectedAt: string | null;
  processingAt: string | null;
  shippedAt: string | null;
  outForDeliveryAt: string | null;
  notificationDueAt: string | null;
  deliveryResponse: string | null;
  confirmationSource: string | null;
  deliveryConfirmedAt: string | null;
  confirmationNote: string | null;
  automationState: string;
  nextStatus: string | null;
  nextStatusAt: string | null;
  issueId: number | null;
  issueNote: string | null;
};

function when(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function DeliveryConsole({ order }: { order: Facts }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const eligible = ['processing', 'shipped', 'out_for_delivery', 'awaiting_confirm'].includes(order.status);
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const res = await fn();
      setMsg(res);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  return (
    <section className="admin-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 className="text-[0.92rem] font-semibold">Delivery</h2>
        {pending && <Loader2 size={16} className="animate-spin text-muted" />}
      </div>
      <div className="space-y-4 p-5 text-[0.84rem]">
        {msg && <p className={`rounded-md px-3 py-2 ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`} role="status">{msg.message}</p>}
        <dl className="grid gap-2 sm:grid-cols-2">
          <div><dt className="text-muted">Service</dt><dd>{order.shippingMethodName}</dd></div>
          <div><dt className="text-muted">Automation</dt><dd className="capitalize">{order.automationState.replaceAll('_', ' ')}</dd></div>
          <div><dt className="text-muted">Payment confirmed</dt><dd>{when(order.timelineStartAt)}</dd></div>
          <div><dt className="text-muted">Expected</dt><dd>{when(order.expectedAt)} PKT</dd></div>
          <div><dt className="text-muted">Processing</dt><dd>{when(order.processingAt)}</dd></div>
          <div><dt className="text-muted">Shipped</dt><dd>{when(order.shippedAt)}</dd></div>
          <div><dt className="text-muted">Out for delivery</dt><dd>{when(order.outForDeliveryAt)}</dd></div>
          <div><dt className="text-muted">Customer question</dt><dd>{when(order.notificationDueAt)}</dd></div>
          <div><dt className="text-muted">Customer response</dt><dd>{order.deliveryResponse === 'yes' ? 'Received' : order.deliveryResponse === 'no' ? 'Not yet' : 'Waiting'}</dd></div>
          <div><dt className="text-muted">Confirmation</dt><dd>{order.confirmationSource ? `${order.confirmationSource} · ${when(order.deliveryConfirmedAt)}` : 'Not confirmed'}</dd></div>
          {order.nextStatus && <div className="sm:col-span-2"><dt className="text-muted">Next automatic step</dt><dd>{order.nextStatus.replaceAll('_', ' ')} · {when(order.nextStatusAt)}. A passed estimate never marks this delivered.</dd></div>}
        </dl>
        {order.confirmationNote && <p className="rounded-md bg-secondary px-3 py-2">{order.confirmationNote}</p>}
        {order.issueId && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">Open delivery issue{order.issueNote ? `: ${order.issueNote}` : ''}. The customer’s “not yet” stays in the history if you later confirm delivery.</p>}
        <div className="flex flex-wrap gap-2">
          {order.status === 'confirmed' && <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run(() => updateOrderStatus(order.id, 'processing', { notify: true }))}>Mark processing</button>}
          {order.status === 'processing' && <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run(() => updateOrderStatus(order.id, 'shipped', { notify: true }))}>Mark shipped</button>}
          {order.status === 'shipped' && <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run(() => updateOrderStatus(order.id, 'out_for_delivery', { notify: true }))}>Mark out for delivery</button>}
          {eligible && <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => setOpen(true)}>Mark as delivered</button>}
        </div>
        <p className="text-[0.75rem] text-muted">Manual changes are saved immediately. Later automatic steps use the timeline from confirmation and never move the order backwards. The customer question is scheduled 10 minutes after the actual out-for-delivery time.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} placeholder="Delivery note" className="field" />
          <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => run(() => saveDeliveryNote(order.id, deliveryNote))}>Save note</button>
        </div>
        {order.issueId && (
          <button type="button" className="btn btn-secondary" disabled={pending || !deliveryNote.trim()} onClick={() => run(() => resolveDeliveryIssue(order.issueId!, deliveryNote))}>Resolve issue without marking delivered</button>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-4 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="deliver-title">
          <div className="max-h-[min(90dvh,640px)] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
            <h3 id="deliver-title" className="font-heading text-2xl">Mark {order.number} as delivered?</h3>
            <p className="mt-2 text-[0.86rem] text-muted">Only confirm if you have checked that the package arrived. This does not wait for the customer, and it does not happen because the estimate passed.</p>
            <label className="mt-4 block text-[0.78rem] text-muted">Optional verification note
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="field mt-1" placeholder="Courier reference or what you checked" />
            </label>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" className="btn btn-primary" disabled={pending} onClick={() => run(() => markDelivered(order.id, note))}>{pending ? 'Saving…' : 'Yes, mark delivered'}</button>
              <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
