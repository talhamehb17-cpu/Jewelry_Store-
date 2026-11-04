'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { saveShoppingRules } from '@/app/actions/admin/shopping';
import { Card, Field } from './ui';
import { formatMoney, toRupees } from '@/lib/money';
import { ADVANCE_METHODS, type ShoppingSettings } from '@/lib/shopping-rules';

const METHOD_LABEL = { easypaisa: 'EasyPaisa', jazzcash: 'JazzCash', bank: 'Bank transfer' } as const;

export function ShoppingRulesForm({
  shopping,
  freeShipping,
  enabledMethods,
}: {
  shopping: ShoppingSettings;
  freeShipping: number;
  enabledMethods: { easypaisa: boolean; jazzcash: boolean; bank: boolean; cod: boolean; card: boolean };
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(shopping.highValue.enabled);
  const [threshold, setThreshold] = useState(toRupees(shopping.highValue.threshold));
  const [advance, setAdvance] = useState(String(shopping.highValue.advancePercent));
  const [remaining, setRemaining] = useState(String(shopping.highValue.remainingPercent));
  const [basis, setBasis] = useState(shopping.highValue.basis);
  const [slip, setSlip] = useState(shopping.highValue.requireSlip);
  const [verify, setVerify] = useState(shopping.highValue.requireVerification);
  const [methods, setMethods] = useState(shopping.highValue.advanceMethods);
  const [minOn, setMinOn] = useState(shopping.minOrderEnabled);
  const [minAmount, setMinAmount] = useState(toRupees(shopping.minOrderAmount));
  const [free, setFree] = useState(toRupees(freeShipping));

  const save = () =>
    start(async () => {
      setError('');
      const result = await saveShoppingRules({
        minOrderEnabled: minOn,
        minOrderAmount: Number(minAmount) || 0,
        freeShippingRupees: Number(free) || 0,
        highValue: {
          enabled,
          threshold: Number(threshold) || 0,
          advancePercent: Number(advance) || 0,
          remainingPercent: Number(remaining) || 0,
          requireSlip: slip,
          requireVerification: verify,
          allowRemainingCod: true,
          advanceMethods: methods,
          basis,
        },
      });
      if (!result.ok) setError(result.message);
      else setMsg(result.message);
    });

  return (
    <div className="space-y-6">
      {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-[0.82rem] text-rose-800" role="alert">{error}</p>}
      {msg && <p className="rounded-md bg-emerald-50 px-3 py-2 text-[0.82rem] text-emerald-800" role="status">{msg}</p>}
      <Card title="High-value payment rule">
        <p className="mb-4 text-[0.82rem] text-muted">These values are saved in the store settings. Checkout reads them on each order and stores a copy on that order. Later edits do not recalculate old orders. Card payments stay off.</p>
        <label className="mb-4 flex items-center gap-2 text-[0.9rem]"><input type="checkbox" className="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Require an advance on qualifying orders</label>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Threshold (Rs)"><input type="number" min={1} value={threshold} onChange={(e) => setThreshold(e.target.value)} className="field" /></Field>
          <Field label="Calculate from">
            <select value={basis} onChange={(e) => setBasis(e.target.value as 'payable' | 'subtotal')} className="field">
              <option value="payable">Final payable amount, after discounts and charges</option>
              <option value="subtotal">Item subtotal before shipping and fees</option>
            </select>
          </Field>
          <Field label="Advance percent"><input type="number" min={1} max={99} value={advance} onChange={(e) => { setAdvance(e.target.value); const n = Number(e.target.value); if (Number.isFinite(n)) setRemaining(String(100 - Math.round(n))); }} className="field" /></Field>
          <Field label="Remaining percent"><input type="number" min={1} max={99} value={remaining} onChange={(e) => setRemaining(e.target.value)} className="field" /></Field>
        </div>
        <div className="mt-4 space-y-2">
          <p className="label">Advance methods</p>
          {ADVANCE_METHODS.map((method) => (
            <label key={method} className="flex items-center gap-2 text-[0.85rem]">
              <input
                type="checkbox"
                className="checkbox"
                checked={methods.includes(method)}
                disabled={!enabledMethods[method]}
                onChange={(e) => setMethods((current) => e.target.checked ? [...current, method] : current.filter((item) => item !== method))}
              />
              {METHOD_LABEL[method]}{enabledMethods[method] ? '' : ' — turned off in payment settings'}
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-5 text-[0.85rem]">
          <label className="flex items-center gap-2"><input type="checkbox" className="checkbox" checked={slip} onChange={(e) => setSlip(e.target.checked)} /> Receipt required for the advance</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="checkbox" checked={verify} onChange={(e) => setVerify(e.target.checked)} /> Admin must verify the receipt</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="checkbox" checked disabled /> Remaining balance stays Cash on Delivery</label>
        </div>
        <p className="mt-4 text-[0.78rem] text-muted">Ordinary orders below the threshold keep the normal payment list, including Cash on Delivery. A receipt is never treated as verified by itself.</p>
      </Card>
      <Card title="Other checkout amounts">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 flex items-center gap-2 text-[0.85rem]"><input type="checkbox" className="checkbox" checked={minOn} onChange={(e) => setMinOn(e.target.checked)} /> Minimum order</label>
            <Field label="Minimum (Rs)"><input type="number" min={0} value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="field" disabled={!minOn} /></Field>
          </div>
          <Field label="Free standard delivery from (Rs)"><input type="number" min={0} value={free} onChange={(e) => setFree(e.target.value)} className="field" /></Field>
        </div>
        <p className="mt-3 text-[0.78rem] text-muted">Current free-delivery threshold: {formatMoney(freeShipping)}. Delivery charges themselves stay in Delivery settings. Payment account numbers stay in Settings. Cash on Delivery, EasyPaisa, JazzCash and bank transfer remain available there. Cards stay disabled.</p>
        <p className="mt-2 text-[0.78rem] text-muted">COD {enabledMethods.cod ? 'on' : 'off'} · EasyPaisa {enabledMethods.easypaisa ? 'on' : 'off'} · JazzCash {enabledMethods.jazzcash ? 'on' : 'off'} · Bank {enabledMethods.bank ? 'on' : 'off'} · Card off</p>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={pending} className="btn btn-primary">{pending && <Loader2 size={14} className="animate-spin" />} Save shopping conditions</button>
        {shopping.audit && <p className="text-[0.78rem] text-muted">Last change: {shopping.audit.by} · {shopping.audit.at}</p>}
      </div>
    </div>
  );
}
