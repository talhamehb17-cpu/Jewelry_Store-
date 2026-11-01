'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveCustomerNote, setCustomerRole } from '@/app/actions/admin/commerce';

export function CustomerNote({ userId, initial }: { userId: number; initial: string }) {
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();
  return (
    <div>
      <textarea value={v} onChange={(e) => setV(e.target.value)} rows={4} className="field" placeholder="Preferences, ring size, special dates…" />
      <div className="mt-2 flex items-center gap-3">
        <button disabled={pending} onClick={() => start(async () => setMsg((await saveCustomerNote(userId, v)).message))} className="btn btn-secondary">Save note</button>
        {msg && <span className="text-[0.75rem] text-emerald-700">{msg}</span>}
      </div>
    </div>
  );
}

export function RoleSelect({ userId, role }: { userId: number; role: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  return (
    <div className="mt-2">
      <label className="label">Role</label>
      <select
        defaultValue={role}
        disabled={pending}
        onChange={(e) => {
          const r = e.target.value as 'customer' | 'staff' | 'admin';
          if (!confirm(`Change role to ${r}?`)) return;
          start(async () => {
            setMsg((await setCustomerRole(userId, r)).message);
            router.refresh();
          });
        }}
        className="field"
      >
        <option value="customer">Customer</option>
        <option value="staff">Staff (catalogue & orders)</option>
        <option value="admin">Administrator</option>
      </select>
      {msg && <p className="mt-1 text-[0.75rem] text-muted">{msg}</p>}
    </div>
  );
}
