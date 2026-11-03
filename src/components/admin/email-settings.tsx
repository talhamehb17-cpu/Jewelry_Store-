'use client';

import { useState, useTransition } from 'react';
import { Loader2, Mail, Send } from 'lucide-react';
import { saveEmailSettingsAction, sendTestEmailAction } from '@/app/actions/admin/email-settings';
import { Card, Field } from './ui';
import type { EmailPublic } from '@/lib/mailer';

export function EmailSettingsForm({ initial }: { initial: EmailPublic }) {
  const [form, setForm] = useState({
    address: initial.address,
    senderName: initial.senderName || 'Evermoon Jewels',
    host: initial.host,
    port: String(initial.port || 587),
    username: initial.username,
    password: '',
    security: initial.security || 'starttls',
  });
  const [testTo, setTestTo] = useState(initial.address);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card title="Email settings" actions={pending ? <Loader2 size={14} className="animate-spin" /> : null}>
      <p className="mb-4 text-[0.8rem] text-muted">This account sends order updates and promotional letters. For Gmail, use an App Password — never the normal account password. The password is encrypted in the database and is not returned to this page.</p>
      {msg && <p className={`mb-4 rounded-md px-3 py-2 text-[0.82rem] ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{msg.message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sender email"><input value={form.address} onChange={(e) => set('address', e.target.value)} className="field" placeholder="care@maisonaurelle.pk" autoComplete="off" /></Field>
        <Field label="Sender name"><input value={form.senderName} onChange={(e) => set('senderName', e.target.value)} className="field" /></Field>
        <Field label="SMTP host"><input value={form.host} onChange={(e) => set('host', e.target.value)} className="field" placeholder="smtp.gmail.com" autoComplete="off" /></Field>
        <Field label="SMTP port"><input value={form.port} onChange={(e) => set('port', e.target.value.replace(/\D/g, ''))} className="field" inputMode="numeric" /></Field>
        <Field label="SMTP username"><input value={form.username} onChange={(e) => set('username', e.target.value)} className="field" autoComplete="off" /></Field>
        <Field label={initial.hasPassword ? 'App password (leave blank to keep the saved one)' : 'App password'}>
          <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className="field" autoComplete="new-password" placeholder={initial.hasPassword ? '••••••••••••' : ''} />
        </Field>
        <Field label="Security">
          <select value={form.security} onChange={(e) => set('security', e.target.value)} className="field">
            <option value="starttls">STARTTLS (port 587)</option>
            <option value="ssl">SSL / TLS (port 465)</option>
            <option value="none">None</option>
          </select>
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setForm((f) => ({ ...f, host: 'smtp.gmail.com', port: '587', security: 'starttls', username: f.username || f.address }))}
        >
          Use Gmail defaults
        </button>
        <button
          type="button"
          disabled={pending}
          className="btn btn-primary btn-sm"
          onClick={() => start(async () => setMsg(await saveEmailSettingsAction({ ...form, port: Number(form.port) || 587, security: form.security as 'starttls' | 'ssl' | 'none' })))}
        >
          <Mail size={14} /> Save email settings
        </button>
      </div>
      <div className="mt-6 border-t border-line pt-5">
        <p className="label">Send test email</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input value={testTo} onChange={(e) => setTestTo(e.target.value)} className="field" placeholder="you@example.com" />
          <button type="button" disabled={pending} className="btn btn-secondary shrink-0" onClick={() => start(async () => setMsg(await sendTestEmailAction(testTo)))}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send test email
          </button>
        </div>
        <p className="mt-2 text-[0.75rem] text-muted">{initial.configured ? 'A mailbox is saved. The test is a real send — success is shown only if the server accepts it.' : 'Save the mailbox before sending a test.'}</p>
      </div>
    </Card>
  );
}
