'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { MoreHorizontal, Copy, Archive, Trash2, ExternalLink, Pencil, Eye } from 'lucide-react';
import { deleteProduct, duplicateProduct, setProductStatus } from '@/app/actions/admin/products';

export function ProductRowActions({ id, slug, status }: { id: number; slug: string; status: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); setOpen(false); router.refresh(); });
  return (
    <div className="relative inline-block text-left">
      <button onClick={() => setOpen((o) => !o)} className="rounded-md p-1.5 hover:bg-secondary" aria-label="Product actions" disabled={pending}><MoreHorizontal size={16} /></button>
      {open && (
        <>
          <button className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-line bg-white py-1 text-[0.82rem] shadow-xl">
            <Link href={`/admin/products/${id}`} className="flex items-center gap-2 px-3 py-2 hover:bg-secondary"><Pencil size={14} /> Edit</Link>
            <a href={`/products/${slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 hover:bg-secondary"><ExternalLink size={14} /> View in store</a>
            <button onClick={() => run(async () => { const r = await duplicateProduct(id); if (r.ok) router.push(`/admin/products/${r.id}`); })} className="flex w-full items-center gap-2 px-3 py-2 hover:bg-secondary"><Copy size={14} /> Duplicate</button>
            {status !== 'active' && <button onClick={() => run(() => setProductStatus(id, 'active'))} className="flex w-full items-center gap-2 px-3 py-2 hover:bg-secondary"><Eye size={14} /> Publish</button>}
            {status !== 'archived' && <button onClick={() => run(() => setProductStatus(id, 'archived'))} className="flex w-full items-center gap-2 px-3 py-2 hover:bg-secondary"><Archive size={14} /> Archive</button>}
            <button onClick={() => confirm('Permanently delete this product? Order history keeps a snapshot of it.') && run(() => deleteProduct(id))} className="flex w-full items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50"><Trash2 size={14} /> Delete</button>
          </div>
        </>
      )}
    </div>
  );
}
