'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { saveDeliveryAutomation } from '@/app/actions/admin/operations';
import type { TimelineSettings } from '@/lib/delivery-schedule';
import { Card, Field } from './ui';

function days(minutes: number) {
  return String(Math.round((minutes / 1440) * 10) / 10);
}
function hours(minutes: number) {
  return String(Math.round((minutes / 60) * 10) / 10);
}

export function DeliverySettingsForm({ initial }: { initial: TimelineSettings }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    standardProcessingDays: days(initial.standard.processingMinutes),
    standardShipDay: String(initial.standard.shipDay),
    standardShipHour: String(initial.standard.shipHourPkt),
    standardOutDays: days(initial.standard.outMinutes),
    standardExpectedDays: days(initial.standard.expectedMinutes),
    expressProcessingHours: hours(initial.express.processingMinutes),
    expressShipHours: hours(initial.express.shipMinutes),
    expressOutHours: hours(initial.express.outMinutes),
    expressExpectedHours: hours(initial.express.expectedMinutes),
    notificationMinutes: String(initial.notificationDelayMinutes),
    popupEnabled: initial.popupEnabled,
    centerEnabled: initial.centerEnabled,
    emailsEnabled: initial.emailsEnabled,
  });
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Card title="Delivery automation">
      <p className="mb-4 text-[0.8rem] text-muted">These times apply when an order is confirmed. Standard shipped uses the calendar evening in Pakistan. Changing this does not rewrite orders that already have a schedule. Delivered is never automatic.</p>
      {msg && <p className="mb-3 text-[0.82rem]" role="status">{msg}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Standard processing (days after confirmation)"><input className="field" value={form.standardProcessingDays} onChange={(e) => set('standardProcessingDays', e.target.value)} /></Field>
        <Field label="Standard shipped on day"><input className="field" value={form.standardShipDay} onChange={(e) => set('standardShipDay', e.target.value)} /></Field>
        <Field label="Standard shipped hour (Pakistan, 0–23)"><input className="field" value={form.standardShipHour} onChange={(e) => set('standardShipHour', e.target.value)} /></Field>
        <Field label="Standard out for delivery (days)"><input className="field" value={form.standardOutDays} onChange={(e) => set('standardOutDays', e.target.value)} /></Field>
        <Field label="Standard expected (days)"><input className="field" value={form.standardExpectedDays} onChange={(e) => set('standardExpectedDays', e.target.value)} /></Field>
        <Field label="Express processing (hours)"><input className="field" value={form.expressProcessingHours} onChange={(e) => set('expressProcessingHours', e.target.value)} /></Field>
        <Field label="Express shipped (hours)"><input className="field" value={form.expressShipHours} onChange={(e) => set('expressShipHours', e.target.value)} /></Field>
        <Field label="Express out for delivery (hours)"><input className="field" value={form.expressOutHours} onChange={(e) => set('expressOutHours', e.target.value)} /></Field>
        <Field label="Express expected (hours)"><input className="field" value={form.expressExpectedHours} onChange={(e) => set('expressExpectedHours', e.target.value)} /></Field>
        <Field label="Ask the customer after out for delivery (minutes)"><input className="field" value={form.notificationMinutes} onChange={(e) => set('notificationMinutes', e.target.value)} /></Field>
      </div>
      <div className="mt-3 space-y-2 text-[0.82rem]">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.popupEnabled} onChange={(e) => set('popupEnabled', e.target.checked)} /> Website popup</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.centerEnabled} onChange={(e) => set('centerEnabled', e.target.checked)} /> Account notification center</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.emailsEnabled} onChange={(e) => set('emailsEnabled', e.target.checked)} /> Delivery emails</label>
      </div>
      <button
        type="button"
        className="btn btn-primary mt-4"
        disabled={pending}
        onClick={() => start(async () => {
          const day = (v: string) => Math.round(Number(v) * 1440);
          const hour = (v: string) => Math.round(Number(v) * 60);
          const res = await saveDeliveryAutomation({
            standard: {
              processingMinutes: day(form.standardProcessingDays),
              shipDay: Math.round(Number(form.standardShipDay)),
              shipHourPkt: Math.round(Number(form.standardShipHour)),
              outMinutes: day(form.standardOutDays),
              expectedMinutes: day(form.standardExpectedDays),
            },
            express: {
              processingMinutes: hour(form.expressProcessingHours),
              shipMinutes: hour(form.expressShipHours),
              outMinutes: hour(form.expressOutHours),
              expectedMinutes: hour(form.expressExpectedHours),
            },
            notificationDelayMinutes: Math.round(Number(form.notificationMinutes)),
            popupEnabled: form.popupEnabled,
            centerEnabled: form.centerEnabled,
            emailsEnabled: form.emailsEnabled,
          });
          setMsg(res.message);
          if (res.ok) router.refresh();
        })}
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : null} Save automation
      </button>
    </Card>
  );
}
