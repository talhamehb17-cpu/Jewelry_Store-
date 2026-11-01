'use client';

import { forwardRef, useState } from 'react';
import { Monitor, Tablet, Smartphone, ExternalLink, RotateCw, Plus, Trash2, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import { ImageInput } from './image-input';
import { cn } from '@/lib/utils';
import type { Field } from '@/themes/registry';

export type StudioData = {
  collections: { slug: string; name: string }[];
  categories: { slug: string; name: string }[];
  products: { slug: string; name: string }[];
};

const DEVICES = { desktop: { w: '100%', icon: Monitor, label: 'Desktop' }, tablet: { w: '820px', icon: Tablet, label: 'Tablet' }, mobile: { w: '390px', icon: Smartphone, label: 'Mobile' } } as const;
export type Device = keyof typeof DEVICES;

export function DeviceToggle({ device, setDevice }: { device: Device; setDevice: (d: Device) => void }) {
  return (
    <div className="flex rounded-lg border border-line bg-white p-0.5">
      {(Object.keys(DEVICES) as Device[]).map((d) => {
        const I = DEVICES[d].icon;
        return (
          <button key={d} onClick={() => setDevice(d)} className={cn('rounded-md p-1.5', device === d ? 'bg-ink text-white' : 'text-muted hover:text-ink')} aria-label={`${DEVICES[d].label} preview`} title={DEVICES[d].label}>
            <I size={15} />
          </button>
        );
      })}
    </div>
  );
}

export const PreviewFrame = forwardRef<HTMLIFrameElement, { src: string; device: Device; onReload: () => void; openHref: string; status?: string }>(function PreviewFrame({ src, device, onReload, openHref, status }, ref) {
  return (
    <div className="flex h-full flex-col bg-[#ebe7e0]">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-white px-4 py-2 text-[0.75rem] text-muted">
        <span>{status ?? 'Live preview'}</span>
        <span className="flex items-center gap-3">
          <button onClick={onReload} className="inline-flex items-center gap-1 hover:text-ink"><RotateCw size={13} /> Refresh</button>
          <a href={openHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink"><ExternalLink size={13} /> Open in new tab</a>
        </span>
      </div>
      <div className="flex flex-1 justify-center overflow-hidden p-3">
        <iframe ref={ref} src={src} title="Storefront preview" className="h-full rounded-lg border border-line bg-white shadow-xl transition-[width] duration-500" style={{ width: DEVICES[device].w, maxWidth: '100%' }} />
      </div>
    </div>
  );
});

/* ----------------------- schema-driven field editor ----------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Val = any;

export function FieldControl({ field, value, onChange, data, all }: { field: Field; value: Val; onChange: (v: Val) => void; data: StudioData; all?: Record<string, Val> }) {
  if (field.showIf && all && !field.showIf.equals.includes(String(all[field.showIf.key] ?? ''))) return null;
  const label = <label className="label">{field.label}</label>;
  switch (field.type) {
    case 'textarea':
      return <div>{label}<textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={3} className="field" /></div>;
    case 'number':
      return <div>{label}<input type="number" min={field.min} max={field.max} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} className="field" /></div>;
    case 'range':
      return (
        <div>
          <div className="flex justify-between">{label}<span className="text-[0.72rem] text-muted">{value ?? 0}</span></div>
          <input type="range" min={field.min ?? 0} max={field.max ?? 100} step={field.step ?? 1} value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#a8844a]" />
        </div>
      );
    case 'select':
      return <div>{label}<select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="field">{field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>;
    case 'toggle':
      return <label className="flex items-center gap-2 text-[0.84rem]"><input type="checkbox" className="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {field.label}</label>;
    case 'image':
      return <ImageInput label={field.label} value={value ?? ''} onChange={onChange} compact />;
    case 'images': {
      const list: string[] = Array.isArray(value) ? value : [];
      return (
        <div>
          {label}
          <div className="space-y-2">
            {list.map((img, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1"><ImageInput value={img} onChange={(v) => onChange(list.map((x, k) => (k === i ? v : x)))} compact /></div>
                <button type="button" onClick={() => onChange(list.filter((_, k) => k !== i))} className="mt-4 text-muted hover:text-rose-600" aria-label="Remove image"><Trash2 size={14} /></button>
              </div>
            ))}
            <button type="button" onClick={() => onChange([...list, ''])} className="btn btn-secondary btn-sm"><Plus size={12} /> Add image</button>
          </div>
        </div>
      );
    }
    case 'collection':
      return <div>{label}<select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="field"><option value="">Select…</option>{data.collections.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>;
    case 'category':
      return <div>{label}<select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="field"><option value="">Select…</option>{data.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>;
    case 'product':
      return <div>{label}<select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="field"><option value="">Select…</option>{data.products.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>;
    case 'collections':
    case 'products': {
      const opts = field.type === 'collections' ? data.collections : data.products;
      const list: string[] = Array.isArray(value) ? value : [];
      return (
        <div>
          {label}
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
            {opts.map((o) => (
              <label key={o.slug} className="flex items-center gap-2 text-[0.8rem]">
                <input type="checkbox" className="checkbox" checked={list.includes(o.slug)} onChange={(e) => onChange(e.target.checked ? [...list, o.slug] : list.filter((x) => x !== o.slug))} />
                {o.name}
              </label>
            ))}
          </div>
          {list.length > 0 && <p className="mt-1 text-[0.7rem] text-muted">Order: {list.map((s) => opts.find((o) => o.slug === s)?.name ?? s).join(' → ')}</p>}
        </div>
      );
    }
    case 'list':
      return <ListEditor field={field} value={value} onChange={onChange} data={data} />;
    case 'url':
    case 'text':
    default:
      return <div>{label}<input value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="field" placeholder={field.type === 'url' ? '/collections/… or https://' : ''} /></div>;
  }
}

function ListEditor({ field, value, onChange, data }: { field: Field; value: Val; onChange: (v: Val) => void; data: StudioData }) {
  const list: Record<string, Val>[] = Array.isArray(value) ? value : [];
  const [open, setOpen] = useState<number | null>(list.length === 1 ? 0 : null);
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  return (
    <div>
      <p className="label">{field.label}</p>
      <div className="space-y-2">
        {list.map((item, i) => (
          <div key={i} className="rounded-lg border border-line">
            <div className="flex items-center gap-1 px-3 py-2">
              <button type="button" onClick={() => setOpen(open === i ? null : i)} className="flex flex-1 items-center gap-2 text-left text-[0.8rem] font-medium">
                <ChevronDown size={14} className={cn('transition', open === i && 'rotate-180')} />
                <span className="truncate">{item.heading || item.title || item.name || item.q || item.text || `${field.itemLabel ?? 'Item'} ${i + 1}`}</span>
              </button>
              <button type="button" onClick={() => move(i, -1)} className="p-1 text-muted hover:text-ink" aria-label="Move up"><ArrowUp size={13} /></button>
              <button type="button" onClick={() => move(i, 1)} className="p-1 text-muted hover:text-ink" aria-label="Move down"><ArrowDown size={13} /></button>
              <button type="button" onClick={() => onChange(list.filter((_, k) => k !== i))} className="p-1 text-muted hover:text-rose-600" aria-label="Remove"><Trash2 size={13} /></button>
            </div>
            {open === i && (
              <div className="space-y-3 border-t border-line p-3">
                {field.fields?.map((f) => (
                  <FieldControl key={f.key} field={f} value={item[f.key]} all={item} data={data} onChange={(v) => onChange(list.map((x, k) => (k === i ? { ...x, [f.key]: v } : x)))} />
                ))}
              </div>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            const blank = Object.fromEntries((field.fields ?? []).map((f) => [f.key, f.type === 'toggle' ? false : f.type === 'range' || f.type === 'number' ? 0 : f.type === 'select' ? f.options?.[0]?.value ?? '' : '']));
            onChange([...list, blank]);
            setOpen(list.length);
          }}
          className="btn btn-secondary btn-sm"
        >
          <Plus size={12} /> Add {(field.itemLabel ?? 'item').toLowerCase()}
        </button>
      </div>
    </div>
  );
}
