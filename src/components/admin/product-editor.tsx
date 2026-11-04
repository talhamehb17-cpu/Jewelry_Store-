'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ExternalLink, Wand2, Save, Loader2, Plus, Check, AlertCircle } from 'lucide-react';
import { saveProduct, type ProductPayload } from '@/app/actions/admin/products';
import { ImageInput, uploadFile } from './image-input';
import { Card, Field } from './ui';
import { Img } from '@/components/ui/img';
import { cn, slugify } from '@/lib/utils';

export type EditorVariant = { id?: number; size: string | null; color: string | null; sku: string; barcode: string; price: string; compareAtPrice: string; stock: number; lowStockThreshold: number };
export type EditorProduct = Omit<ProductPayload, 'variants' | 'price' | 'compareAtPrice' | 'costPrice'> & { price: string; compareAtPrice: string; costPrice: string; variants: EditorVariant[] };

const BADGES = [
  { id: 'new', label: 'New' },
  { id: 'bestseller', label: 'Best seller' },
  { id: 'limited', label: 'Limited' },
  { id: 'gift', label: 'Gift idea' },
] as const;

function SortableImage({ id, url, alt, onAlt, onRemove, first }: { id: string; url: string; alt: string; onAlt: (v: string) => void; onRemove: () => void; first: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn('group relative rounded-lg border border-line bg-white p-1.5', isDragging && 'z-10 shadow-xl', first && 'col-span-2 row-span-2')}>
      <div className="relative aspect-square overflow-hidden rounded-md bg-secondary">
        <Img src={url} alt={alt} sizes="200px" />
        <button type="button" {...attributes} {...listeners} className="absolute left-1.5 top-1.5 cursor-grab rounded bg-white/90 p-1 text-muted active:cursor-grabbing" aria-label="Drag to reorder"><GripVertical size={14} /></button>
        <button type="button" onClick={onRemove} className="absolute right-1.5 top-1.5 rounded bg-white/90 p-1 text-rose-600 opacity-0 transition group-hover:opacity-100" aria-label="Remove image"><Trash2 size={14} /></button>
        {first && <span className="absolute bottom-1.5 left-1.5 rounded bg-ink px-1.5 py-0.5 text-[0.62rem] text-white">Main image</span>}
      </div>
      <input value={alt} onChange={(e) => onAlt(e.target.value)} placeholder="Alt text" className="mt-1.5 w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-[0.72rem] outline-none focus:border-line" />
    </div>
  );
}

export function ProductEditor({ initial, categories, collections, productId }: { initial: EditorProduct; categories: { id: number; name: string }[]; collections: { id: number; name: string; rule: string }[]; productId?: number }) {
  const router = useRouter();
  const [p, setP] = useState<EditorProduct>(initial);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [notify, setNotify] = useState(false);
  const [pending, start] = useTransition();
  const [sizesText, setSizesText] = useState([...new Set(initial.variants.map((v) => v.size).filter(Boolean))].join(', '));
  const [colorsText, setColorsText] = useState([...new Set(initial.variants.map((v) => v.color).filter(Boolean))].join(', '));
  const [uploading, setUploading] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const imgIds = useMemo(() => (p.images ?? []).map((im, i) => `${i}-${im.url}`), [p.images]);

  const set = <K extends keyof EditorProduct>(k: K, v: EditorProduct[K]) => {
    setP((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
    setSaved(false);
  };
  const setVariant = (i: number, patch: Partial<EditorVariant>) => set('variants', p.variants.map((v, k) => (k === i ? { ...v, ...patch } : v)));

  const generate = () => {
    const sizes = sizesText.split(',').map((s) => s.trim()).filter(Boolean);
    const colors = colorsText.split(',').map((s) => s.trim()).filter(Boolean);
    const combos: { size: string | null; color: string | null }[] = [];
    for (const c of colors.length ? colors : [null]) for (const s of sizes.length ? sizes : [null]) combos.push({ size: s, color: c });
    set(
      'variants',
      combos.map((c) => {
        const match = p.variants.find((v) => (v.size ?? null) === c.size && (v.color ?? null) === c.color);
        return match ?? { size: c.size, color: c.color, sku: [p.sku, c.color?.slice(0, 3).toUpperCase(), c.size?.replace(/\s/g, '')].filter(Boolean).join('-'), barcode: '', price: '', compareAtPrice: '', stock: 0, lowStockThreshold: 3 };
      }),
    );
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = imgIds.indexOf(String(e.active.id));
    const to = imgIds.indexOf(String(e.over.id));
    set('images', arrayMove(p.images ?? [], from, to));
  };

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, 10)) urls.push(await uploadFile(f, 'products'));
      set('images', [...(p.images ?? []), ...urls.map((url) => ({ url, alt: p.name }))]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    setError('');
    start(async () => {
      const res = await saveProduct({
        ...p,
        notifySubscribers: notify && (p.badges ?? []).includes('new') && p.status === 'active',
        id: productId,
        price: Number(p.price || 0),
        compareAtPrice: p.compareAtPrice === '' ? null : Number(p.compareAtPrice),
        costPrice: p.costPrice === '' ? null : Number(p.costPrice),
        variants: p.variants.map((v) => ({ ...v, price: v.price === '' ? null : Number(v.price), compareAtPrice: v.compareAtPrice === '' ? null : Number(v.compareAtPrice) })),
      });
      if (!res.ok) {
        setError(res.error);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setDirty(false);
      setSaved(true);
      setNotify(false);
      if (!productId) router.replace(`/admin/products/${res.id}`);
      else router.refresh();
    });
  };

  const totalStock = p.variants.reduce((a, v) => a + (Number(v.stock) || 0), 0);
  const margin = p.costPrice && p.price ? Math.round(((Number(p.price) - Number(p.costPrice)) / Number(p.price)) * 100) : null;
  const slugPreview = slugify(p.slug || p.name);

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-20 -mx-4 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-[#f7f5f1]/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="min-w-0">
          <Link href="/admin/products" className="text-[0.78rem] text-muted hover:text-ink">← Products</Link>
          <h1 className="truncate font-heading text-[1.7rem] leading-tight">{p.name || 'New product'}</h1>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-[0.75rem] text-amber-700">Unsaved changes</span>}
          {saved && !dirty && <span className="inline-flex items-center gap-1 text-[0.75rem] text-emerald-700"><Check size={14} /> Saved</span>}
          {productId && <a href={`/products/${initial.slug}`} target="_blank" rel="noreferrer" className="btn btn-secondary"><ExternalLink size={14} /> View</a>}
          <label className="flex items-center gap-2 text-[0.75rem] text-muted"><input type="checkbox" className="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Notify subscribers</label>
          <button onClick={submit} disabled={pending} className="btn btn-primary">{pending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {productId ? 'Save' : 'Create product'}</button>
        </div>
      </div>
      {error && <p className="mb-5 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[0.85rem] text-rose-800"><AlertCircle size={16} /> {error}</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card title="Product details">
            <div className="space-y-4">
              <Field label="Name"><input value={p.name} onChange={(e) => set('name', e.target.value)} className="field" placeholder="e.g. Aurelia Gold Necklace" /></Field>
              <Field label="Subtitle"><input value={p.subtitle ?? ''} onChange={(e) => set('subtitle', e.target.value)} className="field" placeholder="Short descriptor shown under the name" /></Field>
              <Field label="Description"><textarea value={p.description ?? ''} onChange={(e) => set('description', e.target.value)} rows={5} className="field" /></Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Details (one per line)"><textarea value={(p.details ?? []).join('\n')} onChange={(e) => set('details', e.target.value.split('\n'))} rows={5} className="field" /></Field>
                <Field label="Care instructions"><textarea value={p.care ?? ''} onChange={(e) => set('care', e.target.value)} rows={5} className="field" /></Field>
              </div>
            </div>
          </Card>

          <Card title="Media" actions={<label className="btn btn-secondary btn-sm cursor-pointer">{uploading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add images<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} /></label>}>
            {(p.images ?? []).length ? (
              <DndContext id="media-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={imgIds} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
                    {(p.images ?? []).map((im, i) => (
                      <SortableImage key={imgIds[i]} id={imgIds[i]!} url={im.url} alt={im.alt ?? ''} first={i === 0} onAlt={(v) => set('images', (p.images ?? []).map((x, k) => (k === i ? { ...x, alt: v } : x)))} onRemove={() => set('images', (p.images ?? []).filter((_, k) => k !== i))} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-line py-10 text-center text-[0.85rem] text-muted hover:border-ink">
                <Plus size={20} /> <span className="mt-2">Upload images (compressed to WebP automatically)</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
              </label>
            )}
            <div className="mt-4 grid gap-4 border-t border-line pt-4 md:grid-cols-2">
              <AddImageUrl onAdd={(url) => set('images', [...(p.images ?? []), { url, alt: p.name }])} />
              <ImageInput label="Product video (MP4 upload or URL)" folder="video" value={p.videoUrl ?? ''} onChange={(v) => set('videoUrl', v)} accept="video/mp4,video/webm" compact />
            </div>
          </Card>

          <Card title="Pricing">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Price (Rs)"><input inputMode="decimal" value={p.price} onChange={(e) => set('price', e.target.value.replace(/[^\d.]/g, ''))} className="field" /></Field>
              <Field label="Compare-at price (Rs)" hint="Shows as a sale when higher than price"><input inputMode="decimal" value={p.compareAtPrice} onChange={(e) => set('compareAtPrice', e.target.value.replace(/[^\d.]/g, ''))} className="field" /></Field>
              <Field label="Cost per item (Rs)" hint={margin != null ? `Margin ${margin}%` : 'Private — used for margin'}><input inputMode="decimal" value={p.costPrice} onChange={(e) => set('costPrice', e.target.value.replace(/[^\d.]/g, ''))} className="field" /></Field>
            </div>
          </Card>

          <Card title="Variants & inventory" actions={<span className="text-[0.78rem] text-muted">{totalStock} units in stock</span>}>
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <Field label="Sizes / lengths (comma separated)"><input value={sizesText} onChange={(e) => setSizesText(e.target.value)} placeholder="5, 6, 7, 8, 9" className="field" /></Field>
              <Field label="Metal colours (comma separated)"><input value={colorsText} onChange={(e) => setColorsText(e.target.value)} placeholder="Gold, Silver" className="field" /></Field>
              <button type="button" onClick={generate} className="btn btn-secondary"><Wand2 size={14} /> Generate</button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="admin-table w-full text-[0.8rem]">
                <thead><tr><th>Variant</th><th>SKU</th><th>Barcode</th><th>Price override</th><th>Stock</th><th>Low at</th><th /></tr></thead>
                <tbody>
                  {p.variants.map((v, i) => (
                    <tr key={`${v.id ?? 'n'}-${i}`}>
                      <td className="whitespace-nowrap font-medium">{[v.color, v.size].filter(Boolean).join(' / ') || 'Default'}</td>
                      <td><input value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} className="field !py-1.5 !text-[0.78rem]" /></td>
                      <td><input value={v.barcode} onChange={(e) => setVariant(i, { barcode: e.target.value })} className="field !py-1.5 !text-[0.78rem]" /></td>
                      <td><input value={v.price} onChange={(e) => setVariant(i, { price: e.target.value.replace(/[^\d.]/g, '') })} placeholder={p.price} className="field !w-24 !py-1.5 !text-[0.78rem]" /></td>
                      <td><input type="number" min={0} value={v.stock} onChange={(e) => setVariant(i, { stock: Math.max(0, Number(e.target.value) || 0) })} className={cn('field !w-20 !py-1.5 !text-[0.78rem]', v.stock <= v.lowStockThreshold && '!border-amber-400')} /></td>
                      <td><input type="number" min={0} value={v.lowStockThreshold} onChange={(e) => setVariant(i, { lowStockThreshold: Math.max(0, Number(e.target.value) || 0) })} className="field !w-16 !py-1.5 !text-[0.78rem]" /></td>
                      <td>{p.variants.length > 1 && <button type="button" onClick={() => set('variants', p.variants.filter((_, k) => k !== i))} className="text-muted hover:text-rose-600" aria-label="Remove variant"><Trash2 size={14} /></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[0.75rem] text-muted">Stock changes are recorded in the inventory history automatically.</p>
          </Card>

          <Card title="Search engine listing">
            <div className="mb-4 rounded-lg bg-secondary/60 p-4">
              <p className="text-[0.75rem] text-emerald-800">EVERMOON › products › {slugPreview || 'handle'}</p>
              <p className="mt-0.5 text-[1.05rem] text-[#1a0dab]">{p.seoTitle || p.name || 'Product title'} · EVERMOON</p>
              <p className="mt-0.5 line-clamp-2 text-[0.8rem] text-muted">{p.seoDescription || p.description || 'Add a description to see how this product might appear in search results.'}</p>
            </div>
            <div className="space-y-4">
              <Field label="URL handle" hint={`/products/${slugPreview}`}><input value={p.slug ?? ''} onChange={(e) => set('slug', e.target.value)} placeholder={slugify(p.name)} className="field" /></Field>
              <Field label={`SEO title (${(p.seoTitle ?? '').length}/70)`}><input value={p.seoTitle ?? ''} onChange={(e) => set('seoTitle', e.target.value)} className="field" /></Field>
              <Field label={`SEO description (${(p.seoDescription ?? '').length}/160)`}><textarea value={p.seoDescription ?? ''} onChange={(e) => set('seoDescription', e.target.value)} rows={3} className="field" /></Field>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Status">
            <select value={p.status} onChange={(e) => set('status', e.target.value as EditorProduct['status'])} className="field">
              <option value="active">Active — visible in store</option>
              <option value="draft">Draft — hidden</option>
              <option value="archived">Archived</option>
            </select>
            <label className="mt-4 flex items-center gap-3 text-[0.85rem]"><input type="checkbox" className="checkbox" checked={!!p.featured} onChange={(e) => set('featured', e.target.checked)} /> Featured product</label>
            <p className="label mt-5">Badges</p>
            <div className="flex flex-wrap gap-2">
              {BADGES.map((b) => {
                const on = (p.badges ?? []).includes(b.id);
                return <button type="button" key={b.id} onClick={() => set('badges', on ? (p.badges ?? []).filter((x) => x !== b.id) : [...(p.badges ?? []), b.id])} className={cn('rounded-full border px-3 py-1 text-[0.75rem]', on ? 'border-ink bg-ink text-white' : 'border-line')}>{b.label}</button>;
              })}
            </div>
          </Card>
          <Card title="Organisation">
            <div className="space-y-4">
              <Field label="Category">
                <select value={p.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value ? Number(e.target.value) : null)} className="field">
                  <option value="">Uncategorised</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <div>
                <p className="label">Collections</p>
                <div className="max-h-56 space-y-1.5 overflow-y-auto">
                  {collections.map((c) =>
                    c.rule === 'manual' ? (
                      <label key={c.id} className="flex items-center gap-2.5 text-[0.84rem]"><input type="checkbox" className="checkbox" checked={(p.collectionIds ?? []).includes(c.id)} onChange={(e) => set('collectionIds', e.target.checked ? [...(p.collectionIds ?? []), c.id] : (p.collectionIds ?? []).filter((x) => x !== c.id))} /> {c.name}</label>
                    ) : (
                      <p key={c.id} className="flex items-center gap-2.5 text-[0.8rem] text-muted"><span className="h-3.5 w-3.5 rounded-sm border border-dashed border-line" /> {c.name} <span className="text-[0.68rem]">(automatic)</span></p>
                    ),
                  )}
                </div>
              </div>
              <Field label="Materials (comma separated)" hint="Used by the storefront material filter"><input value={(p.materials ?? []).join(', ')} onChange={(e) => set('materials', e.target.value.split(',').map((s) => s.trim()))} className="field" /></Field>
              <Field label="Tags (comma separated)"><input value={(p.tags ?? []).join(', ')} onChange={(e) => set('tags', e.target.value.split(',').map((s) => s.trim()))} className="field" /></Field>
            </div>
          </Card>
          <Card title="Identifiers">
            <div className="space-y-4">
              <Field label="Product SKU"><input value={p.sku ?? ''} onChange={(e) => set('sku', e.target.value)} className="field" /></Field>
              <Field label="Barcode (EAN / UPC)"><input value={p.barcode ?? ''} onChange={(e) => set('barcode', e.target.value)} className="field" /></Field>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AddImageUrl({ onAdd }: { onAdd: (url: string) => void }) {
  const [v, setV] = useState('');
  return (
    <div>
      <p className="label">Add image by URL</p>
      <div className="flex gap-2">
        <input value={v} onChange={(e) => setV(e.target.value)} placeholder="https://images.unsplash.com/…" className="field" />
        <button type="button" onClick={() => { if (/^(https?:\/\/|\/)/.test(v.trim())) { onAdd(v.trim()); setV(''); } }} className="btn btn-secondary">Add</button>
      </div>
    </div>
  );
}
