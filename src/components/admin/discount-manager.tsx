'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { deleteDiscount, saveDiscount, toggleDiscount, type DiscountInput } from '@/app/actions/admin/commerce';
import { Card, Empty, Field, Pill } from './ui';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/utils';

type D = { id: number; code: string; description: string | null; type: string; value: number; minOrderAmount: number; appliesTo: string; productIds: number[]; collectionIds: number[]; startsAt: string | null; endsAt: string | null; usageLimit: number | null; usageCount: number; oncePerCustomer: boolean; active: boolean };

function status(d: D) {
  const now = Date.now();
  if (!d.active) return { label: 'Inactive', tone: 'stone' as const };
  if (d.endsAt && +new Date(d.endsAt) < now) return { label: 'Expired', tone: 'rose' as const };
  if (d.startsAt && +new Date(d.startsAt) > now) return { label: 'Scheduled', tone: 'sky' as const };
  if (d.usageLimit != null && d.usageCount >= d.usageLimit) return { label: 'Limit reached', tone: 'amber' as const };
  return { label: 'Active', tone: 'green' as const };
}

const toInput = (d?: D): DiscountInput => ({
  id: d?.id,
  code: d?.code ?? '',
  description: d?.description ?? '',
  type: (d?.type as DiscountInput['type']) ?? 'percentage',
  value: d ? (d.type === 'fixed' ? d.value / 100 : d.value) : 10,
  minOrder: d ? d.minOrderAmount / 100 : 0,
  appliesTo: (d?.appliesTo as DiscountInput['appliesTo']) ?? 'all',
  productIds: d?.productIds ?? [],
  collectionIds: d?.collectionIds ?? [],
  startsAt: d?.startsAt ? d.startsAt.slice(0, 10) : '',
  endsAt: d?.endsAt ? d.endsAt.slice(0, 10) : '',
  usageLimit: d?.usageLimit ?? '',
  oncePerCustomer: d?.oncePerCustomer ?? false,
  active: d?.active ?? true,
});

export function DiscountManager({ discounts, products, collections }: { discounts: D[]; products: { id: number; name: string }[]; collections: { id: number; name: string }[] }) {
  const router = useRouter();
  const [form, setForm] = useState<DiscountInput | null>(null);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const set = <K extends keyof DiscountInput>(k: K, v: DiscountInput[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const save = () =>
    start(async () => {
      if (!form) return;
      const r = await saveDiscount(form);
      if (!r.ok) return setError(r.message);
      setForm(null);
      setError('');
      router.refresh();
    });

  return (
    <div className="space-y-6">
      {form ? (
        <Card title={form.id ? `Edit ${form.code}` : 'New discount'}>
          {error && <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-[0.82rem] text-rose-800">{error}</p>}
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Code"><input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} className="field font-mono" placeholder="e.g. EID2026" /></Field>
            <Field label="Type">
              <select value={form.type} onChange={(e) => set('type', e.target.value as DiscountInput['type'])} className="field">
                <option value="percentage">Percentage off</option>
                <option value="fixed">Fixed amount off</option>
                <option value="free_shipping">Free shipping</option>
              </select>
            </Field>
            {form.type !== 'free_shipping' && <Field label={form.type === 'percentage' ? 'Percent off' : 'Amount off (Rs)'}><input type="number" min={0} value={String(form.value)} onChange={(e) => set('value', Number(e.target.value))} className="field" /></Field>}
            <Field label="Description (internal)" className="md:col-span-2"><input value={form.description} onChange={(e) => set('description', e.target.value)} className="field" /></Field>
            <Field label="Minimum order (Rs)"><input type="number" min={0} value={String(form.minOrder)} onChange={(e) => set('minOrder', Number(e.target.value))} className="field" /></Field>
            <Field label="Applies to">
              <select value={form.appliesTo} onChange={(e) => set('appliesTo', e.target.value as DiscountInput['appliesTo'])} className="field">
                <option value="all">Entire order</option>
                <option value="products">Specific products</option>
                <option value="collections">Specific collections</option>
              </select>
            </Field>
            <Field label="Starts (optional)"><input type="date" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} className="field" /></Field>
            <Field label="Ends (optional)"><input type="date" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} className="field" /></Field>
            <Field label="Total usage limit (optional)"><input type="number" min={1} value={String(form.usageLimit ?? '')} onChange={(e) => set('usageLimit', e.target.value === '' ? '' : Number(e.target.value))} className="field" /></Field>
          </div>
          {form.appliesTo === 'products' && (
            <div className="mt-4"><p className="label">Products</p><div className="grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-line p-3 md:grid-cols-3">{products.map((p) => <label key={p.id} className="flex items-center gap-2 text-[0.8rem]"><input type="checkbox" className="checkbox" checked={(form.productIds ?? []).includes(p.id)} onChange={(e) => set('productIds', e.target.checked ? [...(form.productIds ?? []), p.id] : (form.productIds ?? []).filter((x) => x !== p.id))} />{p.name}</label>)}</div></div>
          )}
          {form.appliesTo === 'collections' && (
            <div className="mt-4"><p className="label">Collections</p><div className="grid grid-cols-2 gap-1.5 rounded-lg border border-line p-3 md:grid-cols-4">{collections.map((c) => <label key={c.id} className="flex items-center gap-2 text-[0.8rem]"><input type="checkbox" className="checkbox" checked={(form.collectionIds ?? []).includes(c.id)} onChange={(e) => set('collectionIds', e.target.checked ? [...(form.collectionIds ?? []), c.id] : (form.collectionIds ?? []).filter((x) => x !== c.id))} />{c.name}</label>)}</div></div>
          )}
          <div className="mt-4 flex flex-wrap gap-6 text-[0.85rem]">
            <label className="flex items-center gap-2"><input type="checkbox" className="checkbox" checked={!!form.oncePerCustomer} onChange={(e) => set('oncePerCustomer', e.target.checked)} /> Limit to one use per customer</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="checkbox" checked={!!form.active} onChange={(e) => set('active', e.target.checked)} /> Active</label>
          </div>
          <div className="mt-6 flex gap-2">
            <button onClick={save} disabled={pending} className="btn btn-primary">{pending && <Loader2 size={14} className="animate-spin" />} Save discount</button>
            <button onClick={() => { setForm(null); setError(''); }} className="btn btn-secondary">Cancel</button>
          </div>
        </Card>
      ) : (
        <div className="flex justify-end"><button onClick={() => setForm(toInput())} className="btn btn-primary"><Plus size={15} /> Create discount</button></div>
      )}
      <Card pad={false}>
        {discounts.length === 0 ? <Empty title="No discounts yet" /> : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-[0.84rem]">
              <thead><tr><th>Code</th><th>Offer</th><th>Conditions</th><th>Usage</th><th>Schedule</th><th>Status</th><th /></tr></thead>
              <tbody>
                {discounts.map((d) => {
                  const s = status(d);
                  return (
                    <tr key={d.id}>
                      <td><span className="font-mono font-semibold">{d.code}</span>{d.description && <span className="block text-[0.72rem] text-muted">{d.description}</span>}</td>
                      <td>{d.type === 'percentage' ? `${d.value}% off` : d.type === 'fixed' ? `${formatMoney(d.value)} off` : 'Free shipping'}</td>
                      <td className="text-[0.78rem] text-muted">{d.minOrderAmount ? `Min ${formatMoney(d.minOrderAmount)}` : 'No minimum'}<br />{d.appliesTo === 'all' ? 'Entire order' : d.appliesTo === 'products' ? `${d.productIds.length} products` : `${d.collectionIds.length} collections`}{d.oncePerCustomer ? ' · once per customer' : ''}</td>
                      <td>{d.usageCount}{d.usageLimit != null ? ` / ${d.usageLimit}` : ''}</td>
                      <td className="text-[0.78rem] text-muted">{d.startsAt ? formatDate(d.startsAt) : 'Now'} → {d.endsAt ? formatDate(d.endsAt) : 'No end'}</td>
                      <td><Pill tone={s.tone}>{s.label}</Pill></td>
                      <td className="whitespace-nowrap text-right">
                        <button onClick={() => start(async () => { await toggleDiscount(d.id, !d.active); router.refresh(); })} className="mr-3 text-[0.75rem] text-muted underline hover:text-ink">{d.active ? 'Deactivate' : 'Activate'}</button>
                        <button onClick={() => { setForm(toInput(d)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="mr-2 text-muted hover:text-ink" aria-label="Edit"><Pencil size={14} /></button>
                        <button onClick={() => confirm(`Delete ${d.code}?`) && start(async () => { await deleteDiscount(d.id); router.refresh(); })} className="text-muted hover:text-rose-600" aria-label="Delete"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
