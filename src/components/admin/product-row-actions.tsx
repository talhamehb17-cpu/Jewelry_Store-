'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Copy, Archive, Trash2, ExternalLink, Pencil, Eye } from 'lucide-react';
import { deleteProduct, duplicateProduct, setProductStatus } from '@/app/actions/admin/products';

export function ProductRowActions({ id, slug, status }: { id: number; slug: string; status: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [pending, start] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const place = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 208;
    const height = 248;
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    const below = rect.bottom + 6;
    const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 6) : below;
    setPos({ top, left });
  };
  useEffect(() => {
    if (!open) return;
    place();
    const close = () => setOpen(false);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); setOpen(false); router.refresh(); });
  return (
    <div className="relative inline-block text-left">
      <button ref={buttonRef} onClick={() => setOpen((o) => !o)} className="grid h-11 w-11 place-items-center rounded-md hover:bg-secondary" aria-label="Product actions" aria-expanded={open} disabled={pending}><MoreHorizontal size={16} /></button>
      {open && pos && createPortal(
        <>
          <button className="fixed inset-0 z-[70] cursor-default" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="fixed z-[80] w-52 overflow-hidden rounded-lg border border-line bg-white py-1 text-[0.82rem] shadow-xl" style={{ top: pos.top, left: pos.left }}>
            <Link href={`/admin/products/${id}`} className="flex items-center gap-2 px-3 py-2.5 hover:bg-secondary"><Pencil size={14} /> Edit</Link>
            <a href={`/products/${slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2.5 hover:bg-secondary"><ExternalLink size={14} /> View in store</a>
            <button onClick={() => run(async () => { const r = await duplicateProduct(id); if (r.ok) router.push(`/admin/products/${r.id}`); })} className="flex w-full items-center gap-2 px-3 py-2.5 hover:bg-secondary"><Copy size={14} /> Duplicate</button>
            {status !== 'active' && <button onClick={() => run(() => setProductStatus(id, 'active'))} className="flex w-full items-center gap-2 px-3 py-2.5 hover:bg-secondary"><Eye size={14} /> Publish</button>}
            {status !== 'archived' && <button onClick={() => run(() => setProductStatus(id, 'archived'))} className="flex w-full items-center gap-2 px-3 py-2.5 hover:bg-secondary"><Archive size={14} /> Archive</button>}
            <button onClick={() => confirm('Permanently delete this product? Order history keeps a snapshot of it.') && run(() => deleteProduct(id))} className="flex w-full items-center gap-2 px-3 py-2.5 text-rose-600 hover:bg-rose-50"><Trash2 size={14} /> Delete</button>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
