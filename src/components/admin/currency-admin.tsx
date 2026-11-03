'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { clearRateAction, refreshRatesAction, saveRateAction } from '@/app/actions/admin/operations';
import { CURRENCIES } from '@/lib/currency-format';

export function CurrencyAdmin({ rates, fetchedAt }: { rates: { code: string; perPkr: number; source: string; fetchedAt: string }[]; fetchedAt: string | null }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [code, setCode] = useState('USD');
  const [value, setValue] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="space-y-4">
      <p className="text-[0.85rem] text-muted">Display rates only. Checkout still collects Pakistani rupees. A currency without a saved rate is hidden. If the public source fails, previous rates stay and nothing is invented.</p>
      {fetchedAt && <p className="text-[0.8rem]">Last saved rate: {new Date(fetchedAt).toLocaleString('en-GB', { timeZone: 'Asia/Karachi' })} PKT</p>}
      {msg && <p className="text-[0.85rem]">{msg}</p>}
      <button type="button" className="btn btn-primary" disabled={pending} onClick={() => start(async () => { setMsg((await refreshRatesAction()).message); router.refresh(); })}>{pending ? 'Fetching…' : 'Fetch public rates'}</button>
      <div className="mt-4 grid gap-2">
        {rates.map((r) => (
          <p key={r.code} className="text-[0.85rem]">{r.code}: {r.perPkr} per Rs 1 · {r.source}</p>
        ))}
        {!rates.length && <p className="text-[0.85rem] text-muted">No rates saved yet. PKR remains available.</p>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <select className="field max-w-[8rem]" value={code} onChange={(e) => setCode(e.target.value)}>
          {CURRENCIES.filter((c) => c.code !== 'PKR').map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
        </select>
        <input className="field max-w-[12rem]" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Units per 1 PKR" />
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => start(async () => { setMsg((await saveRateAction(code, Number(value))).message); router.refresh(); })}>Save admin rate</button>
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => start(async () => { setMsg((await clearRateAction(code)).message); router.refresh(); })}>Clear</button>
      </div>
    </div>
  );
}
