'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { Plus, Pencil, Trash2, Star } from 'lucide-react';
import { deleteAddressAction, saveAddressAction, setDefaultAddressAction } from '@/app/actions/auth';
import { FormMessage, Input } from './auth-forms';
import type { Address } from '@/db/schema';

function AddressForm({ address, provinces, onDone }: { address?: Address; provinces: readonly string[]; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveAddressAction, null);
  const fe = state?.fieldErrors ?? {};
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form action={action} className="slide-up space-y-4 rounded-theme border border-line p-6" noValidate>
      {address && <input type="hidden" name="id" value={address.id} />}
      <FormMessage state={state?.ok ? null : state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Label (e.g. Home, Office)" name="label" defaultValue={address?.label ?? ''} />
        <Input label="Phone" name="phone" type="tel" defaultValue={address?.phone ?? ''} error={fe.phone} required />
        <Input label="First name" name="firstName" defaultValue={address?.firstName ?? ''} error={fe.firstName} required />
        <Input label="Last name" name="lastName" defaultValue={address?.lastName ?? ''} error={fe.lastName} required />
        <div className="sm:col-span-2"><Input label="Address" name="line1" defaultValue={address?.line1 ?? ''} error={fe.line1} required /></div>
        <div className="sm:col-span-2"><Input label="Apartment, landmark (optional)" name="line2" defaultValue={address?.line2 ?? ''} /></div>
        <Input label="City" name="city" defaultValue={address?.city ?? ''} error={fe.city} required />
        <div>
          <label className="label" htmlFor="f-province">Province</label>
          <select id="f-province" name="province" defaultValue={address?.province ?? ''} className="field" required>
            <option value="">Select province</option>
            {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {fe.province && <p className="mt-1 text-[0.78rem] text-sale">{fe.province}</p>}
        </div>
        <Input label="Postal code" name="postalCode" defaultValue={address?.postalCode ?? ''} />
      </div>
      <label className="flex items-center gap-3 text-[0.88rem]"><input type="checkbox" name="isDefault" className="checkbox" defaultChecked={address?.isDefault} /> Set as default address</label>
      <div className="flex gap-3">
        <button disabled={pending} className="btn btn-primary">{pending ? 'Saving…' : 'Save address'}</button>
        <button type="button" onClick={onDone} className="btn btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

export function AddressBook({ addresses, provinces }: { addresses: Address[]; provinces: readonly string[] }) {
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="t-3">Addresses</h2>
        {editing === null && <button onClick={() => setEditing('new')} className="btn btn-secondary btn-sm"><Plus size={14} /> Add address</button>}
      </div>
      {editing === 'new' && <div className="mb-6"><AddressForm provinces={provinces} onDone={() => setEditing(null)} /></div>}
      {addresses.length === 0 && editing === null ? (
        <div className="rounded-theme border border-dashed border-line p-10 text-center text-muted">No saved addresses yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((a) =>
            editing === a.id ? (
              <div key={a.id} className="md:col-span-2"><AddressForm address={a} provinces={provinces} onDone={() => setEditing(null)} /></div>
            ) : (
              <div key={a.id} className={`rounded-theme border p-5 ${a.isDefault ? 'border-ink' : 'border-line'} ${pending ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <p className="font-medium">{a.label || 'Address'} {a.isDefault && <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-[0.7rem] font-normal">Default</span>}</p>
                </div>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-muted">{a.firstName} {a.lastName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.province} {a.postalCode}<br />{a.phone}</p>
                <div className="mt-4 flex flex-wrap gap-4 text-[0.8rem]">
                  <button onClick={() => setEditing(a.id)} className="inline-flex items-center gap-1.5 hover:text-accent"><Pencil size={13} /> Edit</button>
                  {!a.isDefault && <button onClick={() => start(() => setDefaultAddressAction(a.id))} className="inline-flex items-center gap-1.5 hover:text-accent"><Star size={13} /> Make default</button>}
                  <button onClick={() => confirm('Delete this address?') && start(() => deleteAddressAction(a.id))} className="inline-flex items-center gap-1.5 text-muted hover:text-sale"><Trash2 size={13} /> Delete</button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
