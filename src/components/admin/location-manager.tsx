'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { deleteLocation, saveLocation } from '@/app/actions/admin/operations';
import { defaultSchedule, type HoursSchedule } from '@/lib/store-hours';
import { HoursEditor } from './hours-editor';
import { ImageInput } from './image-input';
import { Card, Field } from './ui';

type Row = {
  id: number;
  name: string;
  city: string;
  country: string;
  address: string;
  phone: string | null;
  hours: string | null;
  timezone: string;
  schedule: HoursSchedule | null;
  image: string | null;
  mapUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
  showOnHome: boolean;
  position: number;
};

const blank = { name: '', city: '', country: 'Pakistan', address: '', phone: '', hours: '', image: '', mapUrl: '', latitude: '', longitude: '', active: true, showOnHome: true, position: 0 };

export function LocationManager({ rows }: { rows: Row[] }) {
  const [form, setForm] = useState(blank);
  const [schedule, setSchedule] = useState<HoursSchedule>(defaultSchedule());
  const [publishHours, setPublishHours] = useState(false);
  const [editId, setEditId] = useState<number | undefined>();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (k: string, v: string | boolean | number) => setForm((f) => ({ ...f, [k]: v }));
  const save = () =>
    start(async () => {
      const res = await saveLocation({
        id: editId,
        ...form,
        latitude: form.latitude,
        longitude: form.longitude,
        position: Number(form.position) || 0,
        schedule: { ...schedule, published: publishHours },
        timezone: schedule.timezone,
      });
      setMsg(res.message);
      if (res.ok) {
        setForm(blank);
        setSchedule(defaultSchedule());
        setPublishHours(false);
        setEditId(undefined);
        router.refresh();
      }
    });
  return (
    <div className="space-y-6">
      <Card title={editId ? 'Edit location' : 'Add a location'}>
        <p className="mb-4 text-[0.8rem] text-muted">Enter only a real address. Leave coordinates blank if you do not have them — the map will not invent a pin.</p>
        {msg && <p className="mb-3 text-[0.82rem]">{msg}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Store name"><input className="field" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="City"><input className="field" value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="Country"><input className="field" value={form.country} onChange={(e) => set('country', e.target.value)} /></Field>
          <Field label="Phone"><input className="field" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Address"><textarea className="field sm:col-span-2" rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
          <div className="sm:col-span-2 rounded-lg border border-line p-3">
            <p className="text-[0.75rem] text-muted">Click Opening time or Closing time and pick the hour and minute on the clock, then Apply. Saving keeps the times even if they are not shown yet. Showing hours does not make a lookbook card a verified branch.</p>
            <label className="mt-3 flex items-center gap-2 text-[0.82rem]"><input type="checkbox" checked={publishHours} onChange={(e) => setPublishHours(e.target.checked)} /> Show these hours on the storefront</label>
            <div className="mt-4"><HoursEditor value={schedule} onChange={setSchedule} /></div>
          </div>
          <Field label="Map URL (optional)"><input className="field" value={form.mapUrl} onChange={(e) => set('mapUrl', e.target.value)} placeholder="https://" /></Field>
          <Field label="Latitude"><input className="field" value={form.latitude} onChange={(e) => set('latitude', e.target.value)} inputMode="decimal" /></Field>
          <Field label="Longitude"><input className="field" value={form.longitude} onChange={(e) => set('longitude', e.target.value)} inputMode="decimal" /></Field>
          <Field label="Order"><input className="field" value={String(form.position)} onChange={(e) => set('position', Number(e.target.value) || 0)} /></Field>
        </div>
        <div className="mt-3"><ImageInput label="Location image" folder="locations" value={form.image} onChange={(v) => set('image', v)} /></div>
        <label className="mt-3 flex items-center gap-2 text-[0.82rem]"><input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Active</label>
        <label className="mt-2 flex items-center gap-2 text-[0.82rem]"><input type="checkbox" checked={form.showOnHome} onChange={(e) => set('showOnHome', e.target.checked)} /> Show on homepage</label>
        <button type="button" disabled={pending} className="btn btn-primary mt-4" onClick={save}>{pending ? <Loader2 className="animate-spin" size={14} /> : null} Save location</button>
      </Card>
      <div className="grid gap-3">
        {rows.map((r) => (
          <article key={r.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line p-4">
            <div>
              <p className="font-medium">{r.name} · {r.city}</p>
              <p className="text-[0.82rem] text-muted">{r.address}</p>
              <p className="text-[0.75rem] text-muted">{r.active ? 'Active' : 'Hidden'} · {r.showOnHome ? 'On homepage' : 'Not on homepage'} · {r.latitude == null ? 'No pin' : `${r.latitude}, ${r.longitude}`}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setEditId(r.id); setPublishHours(r.schedule?.published === true); setSchedule(r.schedule ?? defaultSchedule(r.timezone || 'Asia/Karachi')); setForm({ name: r.name, city: r.city, country: r.country, address: r.address, phone: r.phone ?? '', hours: r.hours ?? '', image: r.image ?? '', mapUrl: r.mapUrl ?? '', latitude: r.latitude == null ? '' : String(r.latitude), longitude: r.longitude == null ? '' : String(r.longitude), active: r.active, showOnHome: r.showOnHome, position: r.position }); }}>Edit</button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => confirm('Delete this location?') && start(async () => { setMsg((await deleteLocation(r.id)).message); router.refresh(); })}>Delete</button>
            </div>
          </article>
        ))}
        {!rows.length && <p className="text-[0.85rem] text-muted">No locations yet. The homepage stays without a store grid until you add one.</p>}
      </div>
    </div>
  );
}
