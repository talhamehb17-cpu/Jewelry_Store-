'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { deleteDeliveryService, resolveDeliveryIssue, runDeliveryCheck, saveDeliveryService } from '@/app/actions/admin/operations';
import { minutesToDays } from '@/lib/delivery-format';
import { Card, Field } from './ui';

type Service = {
  id: number;
  code: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  active: boolean;
  confirmMinutes: number | null;
  processingMinutes: number | null;
  shipMinutes: number | null;
  outMinutes: number | null;
  cutoffNote: string | null;
  position: number;
};

type Issue = { id: number; orderId: number; status: string; note: string | null; createdAt: string; number?: string };

function hours(minutes: number | null) {
  return minutes == null ? '' : String(Math.round((minutes / 60) * 10) / 10);
}

export function DeliveryManager({ services, issues }: { services: Service[]; issues: Issue[] }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    priceRupees: '250',
    durationDays: '5.3',
    active: true,
    confirmHours: '2',
    processingHours: '12',
    shipHours: '',
    outHours: '',
    cutoffNote: '',
    position: 0,
    id: undefined as number | undefined,
  });
  const set = (k: string, v: string | boolean | number) => setForm((f) => ({ ...f, [k]: v }));
  const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));
  return (
    <div className="space-y-6">
      {msg && <p className="text-[0.85rem]">{msg}</p>}
      <Card title="Delivery services">
        <p className="mb-4 text-[0.8rem] text-muted">Durations are estimates in days, including decimals. 3.5 days is 84 hours. Blank shipping stages stay manual, so the site does not claim a parcel shipped or delivered on a timer. Existing orders keep the plan they were placed with.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Code"><input className="field" value={form.code} onChange={(e) => set('code', e.target.value.toLowerCase())} placeholder="express" /></Field>
          <Field label="Name"><input className="field" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Price (Rs)"><input className="field" value={form.priceRupees} onChange={(e) => set('priceRupees', e.target.value)} /></Field>
          <Field label="Estimate (days)"><input className="field" value={form.durationDays} onChange={(e) => set('durationDays', e.target.value)} /></Field>
          <Field label="Auto-confirm after hours (blank = manual)"><input className="field" value={form.confirmHours} onChange={(e) => set('confirmHours', e.target.value)} /></Field>
          <Field label="Auto-processing after hours"><input className="field" value={form.processingHours} onChange={(e) => set('processingHours', e.target.value)} /></Field>
          <Field label="Auto-ship after hours"><input className="field" value={form.shipHours} onChange={(e) => set('shipHours', e.target.value)} placeholder="Blank keeps shipping manual" /></Field>
          <Field label="Auto out-for-delivery after hours"><input className="field" value={form.outHours} onChange={(e) => set('outHours', e.target.value)} /></Field>
          <Field label="Cutoff note"><input className="field sm:col-span-2" value={form.cutoffNote} onChange={(e) => set('cutoffNote', e.target.value)} /></Field>
        </div>
        <label className="mt-3 flex items-center gap-2 text-[0.82rem]"><input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Active at checkout</label>
        <button
          type="button"
          disabled={pending}
          className="btn btn-primary mt-4"
          onClick={() => start(async () => {
            const res = await saveDeliveryService({
              id: form.id,
              code: form.code,
              name: form.name,
              description: form.description,
              priceRupees: Number(form.priceRupees),
              durationDays: Number(form.durationDays),
              active: form.active,
              confirmHours: numOrNull(form.confirmHours),
              processingHours: numOrNull(form.processingHours),
              shipHours: numOrNull(form.shipHours),
              outHours: numOrNull(form.outHours),
              cutoffNote: form.cutoffNote,
              position: form.position,
            });
            setMsg(res.message);
            if (res.ok) router.refresh();
          })}
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : null} Save service
        </button>
      </Card>
      <div className="grid gap-3">
        {services.map((s) => (
          <article key={s.id} className="rounded-lg border border-line p-4 text-[0.85rem]">
            <p className="font-medium">{s.name} · {s.code} · {s.active ? 'Active' : 'Hidden'}</p>
            <p className="break-words text-muted">Rs {s.price / 100} · {minutesToDays(s.durationMinutes)} days · confirm {hours(s.confirmMinutes) || 'manual'}h · processing {hours(s.processingMinutes) || 'manual'}h · ship {hours(s.shipMinutes) || 'manual'}h · out {hours(s.outMinutes) || 'manual'}h</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm({ id: s.id, code: s.code, name: s.name, description: s.description, priceRupees: String(s.price / 100), durationDays: String(minutesToDays(s.durationMinutes)), active: s.active, confirmHours: hours(s.confirmMinutes), processingHours: hours(s.processingMinutes), shipHours: hours(s.shipMinutes), outHours: hours(s.outMinutes), cutoffNote: s.cutoffNote ?? '', position: s.position })}>Edit</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => confirm('Delete this service? Past orders stay as placed.') && start(async () => { setMsg((await deleteDeliveryService(s.id)).message); router.refresh(); })}>Delete</button>
            </div>
          </article>
        ))}
      </div>
      <Card title="Delivery issues">
        <button type="button" className="btn btn-secondary btn-sm mb-4" disabled={pending} onClick={() => start(async () => { setMsg((await runDeliveryCheck()).message); router.refresh(); })}>Run delivery check now</button>
        {!issues.length && <p className="text-[0.82rem] text-muted">No open delivery issues.</p>}
        {issues.map((issue) => (
          <div key={issue.id} className="mb-3 border-t border-line pt-3 text-[0.85rem]">
            <p>Order {issue.number || issue.orderId} · {issue.status}</p>
            <p className="text-muted">{issue.note}</p>
            {issue.status === 'open' && (
              <button type="button" className="btn btn-secondary btn-sm mt-2" disabled={pending} onClick={() => start(async () => { setMsg((await resolveDeliveryIssue(issue.id, 'Resolved by admin')).message); router.refresh(); })}>Mark resolved</button>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
