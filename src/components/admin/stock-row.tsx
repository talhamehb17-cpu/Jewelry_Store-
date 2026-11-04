'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { History } from 'lucide-react';
import { adjustStock, updateVariantMeta } from '@/app/actions/admin/commerce';
import { cn } from '@/lib/utils';

export function StockRow({ variant, product }: { variant: { id: number; title: string; sku: string; stock: number; threshold: number }; product: { id: number; name: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'add' | 'set'>('add');
  const [reason, setReason] = useState('restock');
  const [sku, setSku] = useState(variant.sku);
  const [threshold, setThreshold] = useState(variant.threshold);
  const [msg, setMsg] = useState('');
  const out = variant.stock <= 0;
  const low = !out && variant.stock <= variant.threshold;
  const apply = () =>
    start(async () => {
      const n = Number(amount);
      if (!amount || !Number.isFinite(n)) return setMsg('Enter a number');
      const r = await adjustStock(variant.id, mode, Math.trunc(n), reason, '');
      setMsg(r.message);
      setAmount('');
      router.refresh();
    });
  return (
    <tr className={pending ? 'opacity-60' : ''}>
      <td className="is-primary" data-label="Product"><Link href={`/admin/products/${product.id}`} className="font-medium hover:underline">{product.name}</Link><span className="block text-[0.72rem] text-muted">{variant.title}</span></td>
      <td data-label="SKU"><input value={sku} onChange={(e) => setSku(e.target.value)} onBlur={() => sku !== variant.sku && start(async () => { await updateVariantMeta(variant.id, sku, threshold); })} className="field !w-36 !py-1 !text-[0.78rem]" aria-label="SKU" /></td>
      <td data-label="Low at"><input type="number" min={0} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} onBlur={() => threshold !== variant.threshold && start(async () => { await updateVariantMeta(variant.id, sku, threshold); })} className="field !w-16 !py-1 !text-[0.78rem]" aria-label="Low stock threshold" /></td>
      <td data-label="In stock"><span className={cn('rounded-full px-2 py-0.5 text-[0.75rem] font-semibold', out ? 'bg-rose-50 text-rose-700' : low ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700')}>{variant.stock}</span></td>
      <td className="stack" data-label="Adjust">
        <div className="flex items-center gap-1.5">
          <select value={mode} onChange={(e) => setMode(e.target.value as 'add' | 'set')} className="field !w-auto !py-1 !text-[0.75rem]" aria-label="Adjustment mode"><option value="add">Add / remove</option><option value="set">Set to</option></select>
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d-]/g, ''))} onKeyDown={(e) => e.key === 'Enter' && apply()} placeholder={mode === 'add' ? '+5 / -2' : '0'} className="field !w-20 !py-1 !text-[0.78rem]" aria-label="Quantity" />
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="field !w-auto !py-1 !text-[0.75rem]" aria-label="Reason"><option value="restock">Restock</option><option value="count">Stock count</option><option value="adjustment">Correction</option><option value="damage">Damaged</option><option value="return">Customer return</option></select>
          <button onClick={apply} disabled={pending || !amount} className="btn btn-secondary btn-sm">Save</button>
        </div>
        {msg && <p className="mt-1 text-[0.7rem] text-muted">{msg}</p>}
      </td>
      <td data-label="History"><Link href={`/admin/inventory?variant=${variant.id}`} className="inline-flex h-10 w-10 items-center justify-center text-muted hover:text-ink" aria-label="Stock history"><History size={15} /></Link></td>
    </tr>
  );
}
