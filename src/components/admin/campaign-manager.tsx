'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Loader2, Pause, Pencil, Play, Plus, Send, Trash2 } from 'lucide-react';
import { deleteCampaign, duplicateCampaign, previewCampaignEmail, saveCampaign, sendCampaignEmail, setCampaignStatus, type CampaignInput } from '@/app/actions/admin/marketing';
import { ImageInput } from './image-input';
import { Card, Empty, Field, Pill } from './ui';
import { formatDateTime, toPkInput } from '@/lib/utils';

type Row = {
  id: number;
  name: string;
  description: string;
  percent: number;
  image: string | null;
  appliesTo: string;
  productIds: number[];
  categoryIds: number[];
  startsAt: string;
  endsAt: string;
  status: string;
  allowStacking: boolean;
  emailSentAt: string | null;
  emailRecipientCount: number;
  ctaLabel: string;
  ctaHref: string;
};

const blank = (): CampaignInput => ({
  name: '',
  description: '',
  percent: 15,
  image: '',
  appliesTo: 'all',
  productIds: [],
  categoryIds: [],
  startsAt: toPkInput(new Date()),
  endsAt: toPkInput(new Date(Date.now() + 3 * 86_400_000)),
  status: 'draft',
  allowStacking: false,
  ctaLabel: 'Shop the sale',
  ctaHref: '/shop',
});

function fromRow(r: Row): CampaignInput {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    percent: r.percent,
    image: r.image ?? '',
    appliesTo: r.appliesTo as CampaignInput['appliesTo'],
    productIds: r.productIds,
    categoryIds: r.categoryIds,
    startsAt: toPkInput(r.startsAt),
    endsAt: toPkInput(r.endsAt),
    status: (r.status === 'expired' ? 'draft' : r.status) as CampaignInput['status'],
    allowStacking: r.allowStacking,
    ctaLabel: r.ctaLabel,
    ctaHref: r.ctaHref,
  };
}

function tone(status: string) {
  if (status === 'active') return 'green' as const;
  if (status === 'scheduled') return 'sky' as const;
  if (status === 'expired') return 'rose' as const;
  if (status === 'paused') return 'amber' as const;
  return 'stone' as const;
}

export function CampaignManager({
  campaigns,
  products,
  categories,
  subscribers,
}: {
  campaigns: Row[];
  products: { id: number; name: string }[];
  categories: { id: number; name: string }[];
  subscribers: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState<CampaignInput | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<{ id: number; html: string; recipients: number } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof CampaignInput>(k: K, v: CampaignInput[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const run = (work: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await work();
      setNotice(r.message);
      setError(r.ok ? '' : r.message);
      if (r.ok) {
        setForm(null);
        setPreview(null);
        router.refresh();
      }
    });

  const groups = {
    active: campaigns.filter((c) => c.status === 'active'),
    scheduled: campaigns.filter((c) => c.status === 'scheduled'),
    other: campaigns.filter((c) => c.status !== 'active' && c.status !== 'scheduled'),
  };

  return (
    <div className="space-y-6">
      {notice && !form && <p className="rounded-md bg-[#f6efe2] px-3 py-2 text-[0.82rem]">{notice}</p>}
      {form ? (
        <Card title={form.id ? `Edit ${form.name || 'campaign'}` : 'New event'}>
          {error && <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-[0.82rem] text-rose-800">{error}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Campaign name"><input value={form.name} onChange={(e) => set('name', e.target.value)} className="field" placeholder="Eid Luxury Sale" /></Field>
            <Field label="Discount percentage"><input type="number" min={1} max={90} value={String(form.percent)} onChange={(e) => set('percent', Number(e.target.value))} className="field" /></Field>
            <Field label="Starts (Pakistan time)"><input type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} className="field" /></Field>
            <Field label="Ends (Pakistan time)"><input type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} className="field" /></Field>
            <Field label="Applies to">
              <select value={form.appliesTo} onChange={(e) => set('appliesTo', e.target.value as CampaignInput['appliesTo'])} className="field">
                <option value="all">All products</option>
                <option value="products">Selected products</option>
                <option value="categories">Selected categories</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => set('status', e.target.value as CampaignInput['status'])} className="field">
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </Field>
            <Field label="Button label"><input value={form.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} className="field" /></Field>
            <Field label="Button link"><input value={form.ctaHref} onChange={(e) => set('ctaHref', e.target.value)} className="field" placeholder="/shop" /></Field>
            <Field label="Description" className="md:col-span-2"><textarea value={form.description} onChange={(e) => set('description', e.target.value)} className="field min-h-24" placeholder="Celebrate Eid with our exclusive luxury collection." /></Field>
          </div>
          <div className="mt-4 max-w-sm">
            <ImageInput label="Campaign image (optional)" folder="campaigns" value={form.image || ''} onChange={(v) => set('image', v)} />
          </div>
          {form.appliesTo === 'products' && (
            <div className="mt-4"><p className="label">Products</p><div className="grid max-h-52 grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-line p-3 md:grid-cols-3">{products.map((p) => <label key={p.id} className="flex items-center gap-2 text-[0.8rem]"><input type="checkbox" className="checkbox" checked={(form.productIds ?? []).includes(p.id)} onChange={(e) => set('productIds', e.target.checked ? [...(form.productIds ?? []), p.id] : (form.productIds ?? []).filter((x) => x !== p.id))} />{p.name}</label>)}</div></div>
          )}
          {form.appliesTo === 'categories' && (
            <div className="mt-4"><p className="label">Categories</p><div className="grid grid-cols-2 gap-1.5 rounded-lg border border-line p-3 md:grid-cols-3">{categories.map((c) => <label key={c.id} className="flex items-center gap-2 text-[0.8rem]"><input type="checkbox" className="checkbox" checked={(form.categoryIds ?? []).includes(c.id)} onChange={(e) => set('categoryIds', e.target.checked ? [...(form.categoryIds ?? []), c.id] : (form.categoryIds ?? []).filter((x) => x !== c.id))} />{c.name}</label>)}</div></div>
          )}
          <label className="mt-4 flex items-start gap-2 text-[0.84rem]"><input type="checkbox" className="checkbox mt-1" checked={!!form.allowStacking} onChange={(e) => set('allowStacking', e.target.checked)} /><span>Allow a discount code to stack on top of this event. Off by default — a product gets either the event price or a code, not both, unless the code is also marked stackable.</span></label>
          <p className="mt-3 text-[0.75rem] text-muted">Saving does not email anyone. Use Send campaign email after the campaign exists. {subscribers} subscribed customer{subscribers === 1 ? '' : 's'} would receive it.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button disabled={pending} onClick={() => run(async () => saveCampaign(form))} className="btn btn-primary">{pending && <Loader2 size={14} className="animate-spin" />} Save campaign</button>
            <button onClick={() => { setForm(null); setError(''); }} className="btn btn-secondary">Cancel</button>
          </div>
        </Card>
      ) : (
        <div className="flex justify-end"><button onClick={() => { setForm(blank()); setError(''); }} className="btn btn-primary"><Plus size={15} /> Create campaign</button></div>
      )}

      {(['active', 'scheduled', 'other'] as const).map((key) => (
        <Card key={key} title={key === 'other' ? 'Draft, paused and expired' : key === 'active' ? 'Active campaigns' : 'Scheduled campaigns'} pad={false}>
          {groups[key].length === 0 ? <Empty title={key === 'active' ? 'No live event' : 'None'} /> : (
            <div className="admin-scroll admin-cards">
              <table className="admin-table w-full text-[0.84rem]">
                <thead><tr><th>Campaign</th><th>Discount</th><th>Window</th><th>Scope</th><th>Email</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {groups[key].map((c) => (
                    <tr key={c.id}>
                      <td className="is-primary max-w-[220px]" data-label="Campaign"><span className="font-medium">{c.name}</span>{c.description && <span className="block text-[0.72rem] text-muted">{c.description}</span>}</td>
                      <td data-label="Discount">{c.percent}% off</td>
                      <td data-label="Window" className="text-[0.75rem] text-muted">{formatDateTime(c.startsAt)}<br />→ {formatDateTime(c.endsAt)}</td>
                      <td data-label="Scope" className="text-[0.78rem] text-muted">{c.appliesTo === 'all' ? 'All products' : c.appliesTo === 'products' ? `${c.productIds.length} products` : `${c.categoryIds.length} categories`}</td>
                      <td data-label="Email" className="text-[0.75rem] text-muted">{c.emailSentAt ? `Sent to ${c.emailRecipientCount}` : 'Not sent'}</td>
                      <td data-label="Status"><Pill tone={tone(c.status)}>{c.status}</Pill></td>
                      <td data-label="" className="text-right">
                        {c.status !== 'active' && c.status !== 'expired' && <button className="mr-2 text-muted hover:text-ink" aria-label="Activate" onClick={() => run(() => setCampaignStatus(c.id, 'active'))}><Play size={14} /></button>}
                        {c.status === 'active' && <button className="mr-2 text-muted hover:text-ink" aria-label="Pause" onClick={() => run(() => setCampaignStatus(c.id, 'paused'))}><Pause size={14} /></button>}
                        <button className="mr-2 text-muted hover:text-ink" aria-label="Edit" onClick={() => { setForm(fromRow(c)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil size={14} /></button>
                        <button className="mr-2 text-muted hover:text-ink" aria-label="Duplicate" onClick={() => run(() => duplicateCampaign(c.id))}><Copy size={14} /></button>
                        <button className="mr-2 text-muted hover:text-ink" aria-label="Preview email" onClick={() => start(async () => { const r = await previewCampaignEmail(c.id); if (r.ok) setPreview({ id: c.id, html: r.html, recipients: r.recipients }); else setNotice(r.message); })}><Send size={14} /></button>
                        <button className="text-muted hover:text-rose-600" aria-label="Delete" onClick={() => confirm(`Delete ${c.name}?`) && run(() => deleteCampaign(c.id))}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ))}

      {preview && (
        <Card title="Send campaign email">
          <p className="text-[0.86rem]">This will email <strong>{preview.recipients}</strong> subscribed customer{preview.recipients === 1 ? '' : 's'}. It is not sent again when the page loads. Order emails are separate and are not affected by unsubscribe.</p>
          <iframe title="Email preview" sandbox="" srcDoc={preview.html} className="mt-4 h-80 w-full rounded-lg border border-line bg-white" />
          <div className="mt-4 flex flex-wrap gap-2">
            <button disabled={pending || preview.recipients === 0} className="btn btn-primary" onClick={() => confirm(`Send this campaign to ${preview.recipients} subscribers?`) && run(async () => sendCampaignEmail(preview.id, true))}>{pending && <Loader2 size={14} className="animate-spin" />} Send campaign email</button>
            <button className="btn btn-secondary" onClick={() => setPreview(null)}>Close</button>
          </div>
        </Card>
      )}
    </div>
  );
}
