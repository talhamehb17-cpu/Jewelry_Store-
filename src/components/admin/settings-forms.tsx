'use client';

import { useState, useTransition } from 'react';
import { Save, Loader2, CheckCircle2, XCircle, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { saveSettingsSection } from '@/app/actions/admin/content';
import { defaultSchedule, scheduleError, scheduleSummary, type HoursSchedule } from '@/lib/store-hours';
import { HoursEditor } from './hours-editor';
import { Card, Field } from './ui';
import type { StoreSettings } from '@/lib/settings';
import { cn } from '@/lib/utils';

type System = { db: string; dbHost: string; claimUrl: string | null; expiresAt: string | null; stripe: boolean; stripeWebhook: string; email: boolean; env: string; siteUrl: string };

function useSaver() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const save = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => start(async () => setMsg(await saveSettingsSection(key as never, value as never)));
  const bar = (
    <div className="flex items-center gap-3">
      {msg && <span className={cn('text-[0.75rem]', msg.ok ? 'text-emerald-700' : 'text-rose-700')}>{msg.message}</span>}
      {pending && <Loader2 size={14} className="animate-spin text-muted" />}
    </div>
  );
  return { save, pending, bar };
}

function SaveBtn({ onClick, pending }: { onClick: () => void; pending: boolean }) {
  return <button onClick={onClick} disabled={pending} className="btn btn-primary btn-sm"><Save size={13} /> Save</button>;
}

const rupees = (minor: number) => String(Math.round(minor / 100));
const minor = (r: string) => Math.round((Number(r) || 0) * 100);

function linesToLinks(text: string) {
  return text.split('\n').map((l) => l.split('|').map((s) => s.trim())).filter(([a, b]) => a && b).map(([label, href]) => ({ label: label!, href: href! }));
}
const linksToLines = (links: { label: string; href: string }[]) => links.map((l) => `${l.label} | ${l.href}`).join('\n');

export function SettingsForms({ settings, system }: { settings: StoreSettings; system: System }) {
  const [store, setStore] = useState(settings.store);
  const [publishHours, setPublishHours] = useState(settings.store.hoursSchedule?.published === true);
  const [schedule, setSchedule] = useState<HoursSchedule>(settings.store.hoursSchedule ?? defaultSchedule());
  const [hoursError, setHoursError] = useState<string | null>(null);
  const [shipping, setShipping] = useState({ ...settings.shipping, threshold: rupees(settings.shipping.freeThreshold) });
  const [payments, setPayments] = useState(settings.payments);
  const [tax, setTax] = useState(settings.tax);
  const [social, setSocial] = useState(settings.social);
  const [seo, setSeo] = useState(settings.seo);
  const [popular, setPopular] = useState(settings.search.popular.join(', '));
  const [reviews, setReviews] = useState(settings.reviews);
  const [main, setMain] = useState(settings.navigation.main.map((m) => ({ ...m, childrenText: linksToLines(m.children ?? []) })));
  const [footer, setFooter] = useState(settings.navigation.footer.map((c) => ({ title: c.title, text: linksToLines(c.links) })));
  const s1 = useSaver();
  const s2 = useSaver();
  const s3 = useSaver();
  const s4 = useSaver();
  const s5 = useSaver();
  const s6 = useSaver();
  const expires = system.expiresAt ? new Date(system.expiresAt) : null;
  const hoursLeft = expires ? Math.round((+expires - Date.now()) / 3_600_000) : null;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card title="Store details" actions={<div className="flex items-center gap-3">{s1.bar}<SaveBtn pending={s1.pending} onClick={() => {
        const nextSchedule = { ...schedule, published: publishHours };
        const error = scheduleError(nextSchedule);
        if (error) { setHoursError(error); return; }
        setHoursError(null);
        const hours = publishHours ? scheduleSummary(nextSchedule) : '';
        s1.save('store', { ...store, hours, hoursSchedule: nextSchedule });
      }} /></div>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Store name"><input value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} className="field" /></Field>
          <Field label="Tagline"><input value={store.tagline} onChange={(e) => setStore({ ...store, tagline: e.target.value })} className="field" /></Field>
          <Field label="Support email"><input value={store.email} onChange={(e) => setStore({ ...store, email: e.target.value })} className="field" /></Field>
          <Field label="Phone"><input value={store.phone} onChange={(e) => setStore({ ...store, phone: e.target.value })} className="field" /></Field>
          <Field label="WhatsApp (digits, with country code)"><input value={store.whatsapp} onChange={(e) => setStore({ ...store, whatsapp: e.target.value.replace(/\D/g, '') })} className="field" /></Field>
          <div className="sm:col-span-2">
            <p className="text-[0.75rem] text-muted">Click Opening time or Closing time and choose the hour and minute on the clock. Apply keeps that time in the field. Save stores it. The storefront uses this timezone, not the visitor’s clock.</p>
            <label className="mt-3 flex items-center gap-2 text-[0.82rem]"><input type="checkbox" checked={publishHours} onChange={(e) => setPublishHours(e.target.checked)} /> Show these hours on the storefront</label>
            {hoursError && <p className="mt-2 text-[0.78rem] text-rose-700">{hoursError}</p>}
            <div className="mt-4"><HoursEditor value={schedule} onChange={setSchedule} /></div>
          </div>
          <Field label="Address" className="sm:col-span-2"><input value={store.address} onChange={(e) => setStore({ ...store, address: e.target.value })} className="field" /></Field>
        </div>
        <p className="mt-4 text-[0.75rem] text-muted">Currency: Pakistani Rupee (PKR, shown as “Rs”). Timezone: Asia/Karachi.</p>
      </Card>

      <Card title="Shipping" actions={<div className="flex items-center gap-3">{s2.bar}<SaveBtn pending={s2.pending} onClick={() => s2.save('shipping', { freeThreshold: minor(shipping.threshold), methods: shipping.methods })} /></div>}>
        <Field label="Free standard shipping over (Rs) — 0 to disable"><input value={shipping.threshold} onChange={(e) => setShipping({ ...shipping, threshold: e.target.value.replace(/\D/g, '') })} className="field" /></Field>
        <div className="mt-4 space-y-3">
          {shipping.methods.map((m, i) => (
            <div key={m.id} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_7rem_auto] lg:items-end">
              <Field label="Name"><input value={m.name} onChange={(e) => setShipping({ ...shipping, methods: shipping.methods.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} className="field" /></Field>
              <Field label="Description"><input value={m.description} onChange={(e) => setShipping({ ...shipping, methods: shipping.methods.map((x, k) => (k === i ? { ...x, description: e.target.value } : x)) })} className="field" /></Field>
              <Field label="Price (Rs)"><input value={rupees(m.price)} onChange={(e) => setShipping({ ...shipping, methods: shipping.methods.map((x, k) => (k === i ? { ...x, price: minor(e.target.value) } : x)) })} className="field" /></Field>
              <label className="mb-2 flex items-center gap-2 text-[0.8rem]"><input type="checkbox" className="checkbox" checked={m.enabled} onChange={(e) => setShipping({ ...shipping, methods: shipping.methods.map((x, k) => (k === i ? { ...x, enabled: e.target.checked } : x)) })} /> On</label>
            </div>
          ))}
        </div>
      </Card>

        <Card title="Payments" className="xl:col-span-2" actions={<div className="flex items-center gap-3">{s3.bar}<SaveBtn pending={s3.pending} onClick={() => s3.save('payments', { ...payments, card: { enabled: false } })} /></div>}>
        <p className="mb-4 text-[0.8rem] text-muted">Customers can pay by Cash on Delivery, EasyPaisa, JazzCash or bank transfer. Wallet and bank payments require a receipt, and uploading it does not mark the payment as verified. Card checkout is not offered.</p>
        <div className="mb-6 space-y-3 rounded-lg border border-line p-4">
          <label className="flex items-center gap-2 font-medium"><input type="checkbox" className="checkbox" checked={payments.cod.enabled} onChange={(e) => setPayments({ ...payments, cod: { ...payments.cod, enabled: e.target.checked } })} /> Cash on Delivery</label>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Instructions" className="sm:col-span-3"><textarea value={payments.cod.instructions} onChange={(e) => setPayments({ ...payments, cod: { ...payments.cod, instructions: e.target.value } })} rows={2} className="field" /></Field>
            <Field label="COD fee (Rs)"><input value={rupees(payments.cod.fee)} onChange={(e) => setPayments({ ...payments, cod: { ...payments.cod, fee: minor(e.target.value) } })} className="field" /></Field>
            <Field label="Max COD order (Rs)"><input value={rupees(payments.cod.maxOrder)} onChange={(e) => setPayments({ ...payments, cod: { ...payments.cod, maxOrder: minor(e.target.value) } })} className="field" /></Field>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-medium"><input type="checkbox" className="checkbox" checked={payments.easypaisa.enabled} onChange={(e) => setPayments({ ...payments, easypaisa: { ...payments.easypaisa, enabled: e.target.checked } })} /> EasyPaisa</label>
            <Field label="Account name"><input value={payments.easypaisa.accountName} onChange={(e) => setPayments({ ...payments, easypaisa: { ...payments.easypaisa, accountName: e.target.value } })} className="field" /></Field>
            <Field label="Account number"><input value={payments.easypaisa.accountNumber} onChange={(e) => setPayments({ ...payments, easypaisa: { ...payments.easypaisa, accountNumber: e.target.value } })} className="field" /></Field>
            <Field label="Instructions"><textarea value={payments.easypaisa.instructions} onChange={(e) => setPayments({ ...payments, easypaisa: { ...payments.easypaisa, instructions: e.target.value } })} rows={3} className="field" /></Field>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-medium"><input type="checkbox" className="checkbox" checked={payments.jazzcash.enabled} onChange={(e) => setPayments({ ...payments, jazzcash: { ...payments.jazzcash, enabled: e.target.checked } })} /> JazzCash</label>
            <Field label="Account name"><input value={payments.jazzcash.accountName} onChange={(e) => setPayments({ ...payments, jazzcash: { ...payments.jazzcash, accountName: e.target.value } })} className="field" /></Field>
            <Field label="Account number"><input value={payments.jazzcash.accountNumber} onChange={(e) => setPayments({ ...payments, jazzcash: { ...payments.jazzcash, accountNumber: e.target.value } })} className="field" /></Field>
            <Field label="Instructions"><textarea value={payments.jazzcash.instructions} onChange={(e) => setPayments({ ...payments, jazzcash: { ...payments.jazzcash, instructions: e.target.value } })} rows={3} className="field" /></Field>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-medium"><input type="checkbox" className="checkbox" checked={payments.bank.enabled} onChange={(e) => setPayments({ ...payments, bank: { ...payments.bank, enabled: e.target.checked } })} /> Bank transfer</label>
            <Field label="Bank"><input value={payments.bank.bankName} onChange={(e) => setPayments({ ...payments, bank: { ...payments.bank, bankName: e.target.value } })} className="field" /></Field>
            <Field label="Account title"><input value={payments.bank.accountTitle} onChange={(e) => setPayments({ ...payments, bank: { ...payments.bank, accountTitle: e.target.value } })} className="field" /></Field>
            <Field label="Account number"><input value={payments.bank.accountNumber} onChange={(e) => setPayments({ ...payments, bank: { ...payments.bank, accountNumber: e.target.value } })} className="field" /></Field>
            <Field label="IBAN"><input value={payments.bank.iban} onChange={(e) => setPayments({ ...payments, bank: { ...payments.bank, iban: e.target.value } })} className="field" /></Field>
            <Field label="Instructions"><textarea value={payments.bank.instructions} onChange={(e) => setPayments({ ...payments, bank: { ...payments.bank, instructions: e.target.value } })} rows={2} className="field" /></Field>
          </div>
        </div>
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900">Replace the placeholder account numbers with your real business accounts before accepting orders. Receipts are stored privately and are not shown on the storefront. Debit and credit cards are not offered at checkout.</p>
      </Card>

      <Card title="Main menu" actions={<div className="flex items-center gap-3">{s4.bar}<SaveBtn pending={s4.pending} onClick={() => s4.save('navigation', { main: main.map((m) => ({ label: m.label, href: m.href, ...(m.childrenText.trim() ? { children: linesToLinks(m.childrenText) } : {}) })), footer: footer.map((c) => ({ title: c.title, links: linesToLinks(c.text) })) })} /></div>}>
        <div className="space-y-3">
          {main.map((m, i) => (
            <div key={i} className="rounded-lg border border-line p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input value={m.label} onChange={(e) => setMain(main.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} className="field" placeholder="Label" />
                <input value={m.href} onChange={(e) => setMain(main.map((x, k) => (k === i ? { ...x, href: e.target.value } : x)))} className="field" placeholder="/link" />
                <button onClick={() => setMain(main.filter((_, k) => k !== i))} className="px-2 text-muted hover:text-rose-600" aria-label="Remove menu item"><Trash2 size={15} /></button>
              </div>
              <textarea value={m.childrenText} onChange={(e) => setMain(main.map((x, k) => (k === i ? { ...x, childrenText: e.target.value } : x)))} rows={2} className="field mt-2 font-mono !text-[0.75rem]" placeholder="Dropdown links — one per line: Label | /link" />
            </div>
          ))}
          <button onClick={() => setMain([...main, { label: '', href: '/', childrenText: '' }])} className="btn btn-secondary btn-sm"><Plus size={13} /> Add menu item</button>
        </div>
      </Card>

      <Card title="Footer menus" actions={<div className="flex items-center gap-3">{s4.bar}</div>}>
        <div className="space-y-3">
          {footer.map((c, i) => (
            <div key={i} className="rounded-lg border border-line p-3">
              <input value={c.title} onChange={(e) => setFooter(footer.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))} className="field" placeholder="Column title" />
              <textarea value={c.text} onChange={(e) => setFooter(footer.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)))} rows={5} className="field mt-2 font-mono !text-[0.75rem]" />
            </div>
          ))}
          <p className="text-[0.75rem] text-muted">One link per line: <code>Label | /link</code>. Saved together with the main menu.</p>
        </div>
      </Card>

      <Card title="Taxes, SEO & search" actions={<div className="flex items-center gap-3">{s5.bar}<SaveBtn pending={s5.pending} onClick={() => { s5.save('tax', { ...tax, rate: Number(tax.rate) || 0 }); s5.save('seo', seo); s5.save('search', { popular: popular.split(',').map((x) => x.trim()).filter(Boolean) }); s5.save('reviews', reviews); }} /></div>}>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-[0.85rem] sm:col-span-3"><input type="checkbox" className="checkbox" checked={tax.enabled} onChange={(e) => setTax({ ...tax, enabled: e.target.checked })} /> Charge sales tax</label>
          <Field label="Tax label"><input value={tax.label} onChange={(e) => setTax({ ...tax, label: e.target.value })} className="field" /></Field>
          <Field label="Rate (%)"><input value={String(tax.rate)} onChange={(e) => setTax({ ...tax, rate: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} className="field" /></Field>
          <label className="mt-6 flex items-center gap-2 text-[0.8rem]"><input type="checkbox" className="checkbox" checked={tax.inclusive} onChange={(e) => setTax({ ...tax, inclusive: e.target.checked })} /> Prices include tax</label>
          <Field label="Homepage SEO title" className="sm:col-span-3"><input value={seo.title} onChange={(e) => setSeo({ ...seo, title: e.target.value })} className="field" /></Field>
          <Field label="Homepage meta description" className="sm:col-span-3"><textarea value={seo.description} onChange={(e) => setSeo({ ...seo, description: e.target.value })} rows={2} className="field" /></Field>
          <Field label="Popular searches (comma separated)" className="sm:col-span-3"><input value={popular} onChange={(e) => setPopular(e.target.value)} className="field" /></Field>
          <label className="flex items-center gap-2 text-[0.85rem] sm:col-span-3"><input type="checkbox" className="checkbox" checked={reviews.autoPublishVerified} onChange={(e) => setReviews({ autoPublishVerified: e.target.checked })} /> Auto-publish reviews from verified buyers (others wait for moderation)</label>
        </div>
      </Card>

      <Card title="Social links" actions={<div className="flex items-center gap-3">{s6.bar}<SaveBtn pending={s6.pending} onClick={() => s6.save('social', social)} /></div>}>
        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(social) as (keyof typeof social)[]).map((k) => (
            <Field key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}><input value={social[k]} onChange={(e) => setSocial({ ...social, [k]: e.target.value })} className="field" placeholder="https://" /></Field>
          ))}
        </div>
      </Card>

      <div id="system" className="xl:col-span-2">
        <Card title="System & database">
          <div className="grid gap-4 text-[0.85rem] md:grid-cols-4">
            <div><p className="label">Database</p><p className="font-medium">{system.db === 'postgres' ? 'Neon Postgres (serverless)' : 'Embedded PGlite (local / fallback)'}</p><p className="text-[0.75rem] text-muted">{system.dbHost || '—'}</p></div>
            <div className="min-w-0"><p className="label">Environment</p><p className="font-medium capitalize">{system.env}</p><p className="break-all text-[0.75rem] text-muted">{system.siteUrl}</p></div>
            <div><p className="label">Card payments</p><p className="font-medium">{system.stripe ? 'Stripe connected' : 'Not configured'}</p></div>
            <div><p className="label">Transactional email</p><p className="font-medium">{system.email ? 'Configured' : 'Not configured'}</p><p className="text-[0.75rem] text-muted">Use Email settings above. A Gmail app password stays on the server.</p></div>
          </div>
          {system.claimUrl && (
            <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-[0.85rem] text-amber-950">
              <p className="font-semibold">Claim your database to keep your data</p>
              <p className="mt-1">This store is using a temporary Neon Postgres database{hoursLeft != null ? (hoursLeft > 0 ? ` whose provider window ends in about ${hoursLeft} hours` : ' whose provider window has ended') : ''}. The application will not delete your data on a timer. Claim the database, or test and activate another PostgreSQL connection below. Also set <code>DATABASE_URL</code> in your host before that window ends.</p>
              <a href={system.claimUrl} target="_blank" rel="noreferrer" className="btn btn-primary mt-3"><ExternalLink size={14} /> Claim database on Neon</a>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
