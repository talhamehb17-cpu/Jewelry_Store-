'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Link2, Loader2, X } from 'lucide-react';
import { Img } from '@/components/ui/img';
import { cn } from '@/lib/utils';

/** Resizes images in the browser (max 1600px) and re-encodes to WebP before upload. */
async function compress(file: File): Promise<{ blob: Blob; width: number; height: number; name: string }> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return { blob: file, width: 0, height: 0, name: file.name };
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/webp', 0.86));
  return { blob, width: w, height: h, name: file.name.replace(/\.[^.]+$/, '') + '.webp' };
}

export async function uploadFile(file: File): Promise<string> {
  const { blob, width, height, name } = await compress(file);
  const fd = new FormData();
  fd.append('file', new File([blob], name, { type: blob.type || file.type }));
  fd.append('width', String(width));
  fd.append('height', String(height));
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.url as string;
}

export function ImageInput({ value, onChange, label, compact, accept = 'image/*' }: { value: string; onChange: (v: string) => void; label?: string; compact?: boolean; accept?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [urlMode, setUrlMode] = useState(false);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setErr('');
    setBusy(true);
    try {
      onChange(await uploadFile(f));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      {label && <p className="label">{label}</p>}
      <div className={cn('flex items-center gap-3', compact && 'gap-2')}>
        <div
          className={cn('relative shrink-0 overflow-hidden rounded-lg border border-dashed border-line bg-secondary', compact ? 'h-14 w-14' : 'h-20 w-20')}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files[0]);
          }}
        >
          {value ? (
            accept.startsWith('video') || /\.(mp4|webm)$/.test(value) ? <video src={value} className="h-full w-full object-cover" muted /> : <Img src={value} alt="" sizes="80px" />
          ) : (
            <button type="button" onClick={() => ref.current?.click()} className="grid h-full w-full place-items-center text-muted" aria-label="Upload image"><ImagePlus size={18} strokeWidth={1.5} /></button>
          )}
          {busy && <span className="absolute inset-0 grid place-items-center bg-white/70"><Loader2 size={18} className="animate-spin" /></span>}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          {urlMode ? (
            <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… or /images/…" className="field" autoFocus />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => ref.current?.click()} className="btn btn-secondary btn-sm">{value ? 'Replace' : 'Upload'}</button>
              <button type="button" onClick={() => setUrlMode(true)} className="btn btn-secondary btn-sm"><Link2 size={12} /> URL</button>
              {value && <button type="button" onClick={() => onChange('')} className="btn btn-secondary btn-sm" aria-label="Remove image"><X size={12} /></button>}
            </div>
          )}
          {urlMode && <button type="button" onClick={() => setUrlMode(false)} className="text-[0.72rem] text-muted underline">Done</button>}
          {!urlMode && value && <p className="truncate text-[0.7rem] text-muted">{value}</p>}
          {err && <p className="text-[0.75rem] text-rose-600">{err}</p>}
        </div>
      </div>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
