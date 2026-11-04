'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Plus, Pencil, Trash2, ExternalLink, ArrowUp, ArrowDown, X, Loader2 } from 'lucide-react';
import { deleteCategory, deleteCollection, saveCategory, saveCollection } from '@/app/actions/admin/content';
import { ImageInput } from './image-input';
import { Card, Field, Pill } from './ui';
import { Img } from '@/components/ui/img';

type Col = { id: number; slug: string; name: string; description: string | null; image: string | null; rule: string; ruleValue: string | null; featured: boolean; status: string; seoTitle: string | null; seoDescription: string | null; productIds: number[] };
type Cat = { id: number; slug: string; name: string; description: string | null; image: string | null; position: number; count: number };
type Prod = { id: number; name: string; image: string | null };

const RULES: Record<string, string> = { manual: 'Manual selection', new: 'Automatic · newest products', bestsellers: 'Automatic · best sellers', sale: 'Automatic · on sale', category: 'Automatic · by category' };

export function CollectionsManager({ collections, categories, products }: { collections: Col[]; categories: Cat[]; products: Prod[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Partial<Col> | null>(null);
  const [cat, setCat] = useState<Partial<Cat> | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [q, setQ] = useState('');
  const [pending, start] = useTransition();
  const done = (r: { ok: boolean; message: string }, close: () => void) => {
    setMsg(r);
    if (r.ok) {
      close();
      router.refresh();
    }
  };
  const ids = edit?.productIds ?? [];
  const move = (i: number, dir: -1 | 1) => {
    const next = [...ids];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j]!, next[i]!];
    setEdit((e) => ({ ...e, productIds: next }));
  };

  return (
    <div className="space-y-6">
      {msg && <p className={`rounded-md px-3 py-2 text-[0.82rem] ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{msg.message}</p>}
      {edit ? (
        <Card title={edit.id ? `Edit ${edit.name}` : 'New collection'}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name"><input value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="field" /></Field>
            <Field label="URL handle"><input value={edit.slug ?? ''} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} className="field" placeholder="auto from name" /></Field>
            <Field label="Description" className="md:col-span-2"><textarea value={edit.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} rows={2} className="field" /></Field>
            <ImageInput label="Banner image" folder="collections" value={edit.image ?? ''} onChange={(v) => setEdit({ ...edit, image: v })} />
            <div className="space-y-3">
              <Field label="Products in this collection">
                <select value={edit.rule ?? 'manual'} onChange={(e) => setEdit({ ...edit, rule: e.target.value })} className="field">{Object.entries(RULES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              </Field>
              {edit.rule === 'category' && <Field label="Category"><select value={edit.ruleValue ?? ''} onChange={(e) => setEdit({ ...edit, ruleValue: e.target.value })} className="field"><option value="">Select…</option>{categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></Field>}
              <div className="flex gap-6 text-[0.85rem]">
                <label className="flex items-center gap-2"><input type="checkbox" className="checkbox" checked={!!edit.featured} onChange={(e) => setEdit({ ...edit, featured: e.target.checked })} /> Featured in menus</label>
                <label className="flex items-center gap-2"><input type="checkbox" className="checkbox" checked={edit.status !== 'hidden'} onChange={(e) => setEdit({ ...edit, status: e.target.checked ? 'active' : 'hidden' })} /> Visible</label>
              </div>
            </div>
          </div>
          {(edit.rule ?? 'manual') === 'manual' && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <p className="label">Add products</p>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="field mb-2" />
                <ul className="max-h-64 divide-y divide-line overflow-y-auto rounded-lg border border-line">
                  {products.filter((p) => !ids.includes(p.id) && p.name.toLowerCase().includes(q.toLowerCase())).map((p) => (
                    <li key={p.id}><button type="button" onClick={() => setEdit({ ...edit, productIds: [...ids, p.id] })} className="flex w-full items-center gap-3 px-3 py-2 text-left text-[0.82rem] hover:bg-secondary"><span className="relative h-8 w-8 overflow-hidden rounded bg-secondary"><Img src={p.image} alt="" sizes="32px" /></span>{p.name}<Plus size={14} className="ml-auto text-muted" /></button></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="label">Selected ({ids.length}) — order shown in store</p>
                <ul className="max-h-[19rem] divide-y divide-line overflow-y-auto rounded-lg border border-line">
                  {ids.map((id, i) => {
                    const p = products.find((x) => x.id === id);
                    return (
                      <li key={id} className="flex items-center gap-2 px-3 py-2 text-[0.82rem]">
                        <span className="relative h-8 w-8 overflow-hidden rounded bg-secondary"><Img src={p?.image} alt="" sizes="32px" /></span>
                        <span className="flex-1 truncate">{p?.name ?? `#${id}`}</span>
                        <button type="button" onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp size={13} /></button>
                        <button type="button" onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown size={13} /></button>
                        <button type="button" onClick={() => setEdit({ ...edit, productIds: ids.filter((x) => x !== id) })} aria-label="Remove"><X size={13} /></button>
                      </li>
                    );
                  })}
                  {!ids.length && <li className="p-4 text-center text-[0.8rem] text-muted">No products selected yet.</li>}
                </ul>
              </div>
            </div>
          )}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="SEO title"><input value={edit.seoTitle ?? ''} onChange={(e) => setEdit({ ...edit, seoTitle: e.target.value })} className="field" /></Field>
            <Field label="SEO description"><input value={edit.seoDescription ?? ''} onChange={(e) => setEdit({ ...edit, seoDescription: e.target.value })} className="field" /></Field>
          </div>
          <div className="mt-6 flex gap-2">
            <button disabled={pending} onClick={() => start(async () => done(await saveCollection({ id: edit.id, name: edit.name ?? '', slug: edit.slug ?? '', description: edit.description ?? '', image: edit.image ?? '', rule: (edit.rule ?? 'manual') as 'manual', ruleValue: edit.ruleValue ?? '', featured: !!edit.featured, status: (edit.status ?? 'active') as 'active', seoTitle: edit.seoTitle ?? '', seoDescription: edit.seoDescription ?? '', productIds: ids }), () => setEdit(null)))} className="btn btn-primary">{pending && <Loader2 size={14} className="animate-spin" />} Save collection</button>
            <button onClick={() => setEdit(null)} className="btn btn-secondary">Cancel</button>
          </div>
        </Card>
      ) : null}

      <Card title={`Collections (${collections.length})`} actions={!edit && <button onClick={() => setEdit({ rule: 'manual', status: 'active', productIds: [] })} className="btn btn-primary btn-sm"><Plus size={13} /> New collection</button>} pad={false}>
        <div className="admin-scroll admin-cards">
        <table className="admin-table w-full text-[0.84rem]">
          <thead><tr><th>Collection</th><th>Type</th><th>Products</th><th>Status</th><th /></tr></thead>
          <tbody>
            {collections.map((c) => (
              <tr key={c.id}>
                <td className="is-primary" data-label="Collection"><span className="flex items-center gap-3"><span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-secondary"><Img src={c.image} alt="" sizes="40px" /></span><span className="min-w-0"><span className="block font-medium">{c.name}</span><span className="font-mono text-[0.7rem] text-muted">/collections/{c.slug}</span></span></span></td>
                <td data-label="Type" className="text-muted">{RULES[c.rule]}{c.rule === 'category' && c.ruleValue ? ` (${c.ruleValue})` : ''}</td>
                <td data-label="Products">{c.rule === 'manual' ? c.productIds.length : 'Auto'}</td>
                <td data-label="Status"><Pill tone={c.status === 'active' ? 'green' : 'stone'}>{c.status}</Pill>{c.featured && <span className="ml-1"><Pill tone="gold">featured</Pill></span>}</td>
                <td data-label="" className="text-right">
                  <a href={`/collections/${c.slug}`} target="_blank" rel="noreferrer" className="mr-3 inline-block text-muted hover:text-ink" aria-label="View"><ExternalLink size={14} /></a>
                  <button onClick={() => { setEdit(c); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="mr-3 text-muted hover:text-ink" aria-label="Edit"><Pencil size={14} /></button>
                  <button onClick={() => confirm(`Delete “${c.name}”?`) && start(async () => done(await deleteCollection(c.id), () => {}))} className="text-muted hover:text-rose-600" aria-label="Delete"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      <Card title={`Categories (${categories.length})`} actions={<button onClick={() => setCat({ position: categories.length })} className="btn btn-secondary btn-sm"><Plus size={13} /> New category</button>}>
        {cat && (
          <div className="mb-6 grid gap-4 rounded-lg border border-line p-4 md:grid-cols-2">
            <Field label="Name"><input value={cat.name ?? ''} onChange={(e) => setCat({ ...cat, name: e.target.value })} className="field" /></Field>
            <Field label="URL handle"><input value={cat.slug ?? ''} onChange={(e) => setCat({ ...cat, slug: e.target.value })} className="field" placeholder="auto" /></Field>
            <Field label="Description" className="md:col-span-2"><input value={cat.description ?? ''} onChange={(e) => setCat({ ...cat, description: e.target.value })} className="field" /></Field>
            <ImageInput label="Image" folder="collections" value={cat.image ?? ''} onChange={(v) => setCat({ ...cat, image: v })} compact />
            <Field label="Sort position"><input type="number" value={cat.position ?? 0} onChange={(e) => setCat({ ...cat, position: Number(e.target.value) })} className="field" /></Field>
            <div className="flex gap-2 md:col-span-2">
              <button disabled={pending} onClick={() => start(async () => done(await saveCategory({ id: cat.id, name: cat.name ?? '', slug: cat.slug ?? '', description: cat.description ?? '', image: cat.image ?? '', position: cat.position ?? 0 }), () => setCat(null)))} className="btn btn-primary">Save category</button>
              <button onClick={() => setCat(null)} className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((c) => (
            <div key={c.id} className="overflow-hidden rounded-lg border border-line">
              <div className="relative aspect-[4/3] bg-secondary"><Img src={c.image} alt="" sizes="200px" /></div>
              <div className="flex items-center justify-between p-3">
                <span><span className="block text-[0.85rem] font-medium">{c.name}</span><span className="text-[0.72rem] text-muted">{c.count} products</span></span>
                <span className="flex gap-2">
                  <button onClick={() => setCat(c)} className="text-muted hover:text-ink" aria-label="Edit"><Pencil size={14} /></button>
                  <button onClick={() => confirm(`Delete category “${c.name}”? Products stay but become uncategorised.`) && start(async () => done(await deleteCategory(c.id), () => {}))} className="text-muted hover:text-rose-600" aria-label="Delete"><Trash2 size={14} /></button>
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
