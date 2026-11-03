'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Truck, CheckCircle2, XCircle, RotateCcw, Save, Loader2 } from 'lucide-react';
import { markPaid, refundOrder, rejectPayment, saveOrderNote, saveTracking, updateOrderStatus } from '@/app/actions/admin/orders';
import { Card, Field } from './ui';
import { formatMoney } from '@/lib/money';
import { titleCase } from '@/lib/utils';

type O = { id: number; status: string; paymentStatus: string; paymentMethod: string; paymentRef: string | null; total: number; refundedAmount: number; trackingCarrier: string | null; trackingNumber: string | null; adminNote: string | null };

export function OrderActions({ order, next }: { order: O; next: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [carrier, setCarrier] = useState(order.trackingCarrier ?? 'TCS');
  const [tracking, setTracking] = useState(order.trackingNumber ?? '');
  const [notify, setNotify] = useState(true);
  const [note, setNote] = useState(order.adminNote ?? '');
  const [ref, setRef] = useState(order.paymentRef ?? '');
  const [refund, setRefund] = useState(String((order.total - order.refundedAmount) / 100));
  const [reason, setReason] = useState('');
  const [restock, setRestock] = useState(true);
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r);
      if (r.ok) router.refresh();
    });
  const canPay = order.paymentStatus !== 'paid' && order.paymentStatus !== 'refunded' && order.status !== 'cancelled' && order.paymentMethod !== 'card';
  const canRefund = order.paymentStatus === 'paid' || order.paymentStatus === 'partially_refunded';

  return (
    <Card title="Manage order" actions={pending ? <Loader2 size={16} className="animate-spin text-muted" /> : null}>
      {msg && <p className={`mb-4 rounded-md px-3 py-2 text-[0.82rem] ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{msg.message}</p>}
      <div className="space-y-6">
        {next.length > 0 && (
          <div>
            <p className="label">Update fulfilment status</p>
            {next.includes('shipped') && (
              <div className="mb-3 grid gap-2 sm:grid-cols-[160px_1fr]">
                <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className="field"><option>TCS</option><option>Leopards Courier</option><option>M&amp;P</option><option>BlueEX</option><option>Trax</option><option>PostEx</option></select>
                <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number (for shipping)" className="field" />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {next.filter((s) => s !== 'cancelled').map((s) => (
                <button key={s} disabled={pending} onClick={() => run(() => updateOrderStatus(order.id, s, { carrier, tracking, notify }))} className="btn btn-primary">
                  {s === 'shipped' ? <Truck size={14} /> : <CheckCircle2 size={14} />} Mark {titleCase(s)}
                </button>
              ))}
              {next.includes('cancelled') && (
                <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Cancellation reason" className="field" />
                  <button disabled={pending} onClick={() => reason.trim() && run(() => updateOrderStatus(order.id, 'cancelled', { notify, reason }))} className="btn btn-secondary !text-rose-700">
                    <XCircle size={14} /> Cancel order
                  </button>
                </div>
              )}
            </div>
            <label className="mt-3 flex items-center gap-2 text-[0.8rem] text-muted"><input type="checkbox" className="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Email the customer about this update (when email is configured)</label>
          </div>
        )}

        {(order.status === 'shipped' || order.status === 'delivered') && (
          <div className="grid gap-2 border-t border-line pt-5 sm:grid-cols-[160px_1fr_auto]">
            <input value={carrier} onChange={(e) => setCarrier(e.target.value)} className="field" aria-label="Carrier" />
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} className="field" aria-label="Tracking number" />
            <button disabled={pending} onClick={() => run(() => saveTracking(order.id, carrier, tracking))} className="btn btn-secondary">Update tracking</button>
          </div>
        )}

        {canPay && (
          <div className="border-t border-line pt-5">
            <p className="label">Record payment</p>
            <div className="flex flex-wrap gap-2">
              <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Transaction / receipt reference" className="field max-w-xs" />
              <button disabled={pending} onClick={() => run(() => markPaid(order.id, ref))} className="btn btn-primary"><CheckCircle2 size={14} /> Verify payment</button>
              <button disabled={pending} onClick={() => run(() => rejectPayment(order.id, ref))} className="btn btn-secondary">Reject payment</button>
            </div>
            <p className="mt-2 text-[0.75rem] text-muted">Verify only after the funds and the receipt match. Rejecting does not delete the order.</p>
          </div>
        )}

        {canRefund && (
          <details className="border-t border-line pt-5">
            <summary className="cursor-pointer text-[0.85rem] font-medium">Issue a refund</summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label={`Amount (max ${formatMoney(order.total - order.refundedAmount)})`}><input value={refund} onChange={(e) => setRefund(e.target.value.replace(/[^\d.]/g, ''))} className="field" /></Field>
              <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} className="field" placeholder="e.g. Customer return" /></Field>
            </div>
            <label className="mt-3 flex items-center gap-2 text-[0.8rem]"><input type="checkbox" className="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Return items to inventory</label>
            <button disabled={pending} onClick={() => confirm(`Refund Rs ${refund}?${order.paymentMethod === 'card' ? ' This will refund the card via Stripe.' : ''}`) && run(() => refundOrder(order.id, Number(refund), reason, restock))} className="btn btn-secondary mt-3"><RotateCcw size={14} /> {order.paymentMethod === 'card' ? 'Refund via Stripe' : 'Record refund'}</button>
          </details>
        )}

        <div className="border-t border-line pt-5">
          <p className="label">Admin override</p>
          <p className="mb-2 text-[0.75rem] text-muted">This records the previous status, the new status, the time and your name. It does not pretend a refund has been paid out.</p>
          <div className="flex flex-wrap gap-2">
            {['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].filter((s) => s !== order.status).map((s) => (
              <button key={s} type="button" disabled={pending || (s === 'cancelled' && !reason.trim())} className="btn btn-secondary btn-sm" onClick={() => run(() => updateOrderStatus(order.id, s, { notify, reason, force: true, carrier, tracking }))}>Set {s.replaceAll('_', ' ')}</button>
            ))}
          </div>
        </div>
        <div className="border-t border-line pt-5">
          <Field label="Internal note (not visible to customer)"><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="field" /></Field>
          <button disabled={pending} onClick={() => run(() => saveOrderNote(order.id, note))} className="btn btn-secondary mt-2"><Save size={14} /> Save note</button>
        </div>
      </div>
    </Card>
  );
}
