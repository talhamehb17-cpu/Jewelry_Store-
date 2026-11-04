'use client';

import { useState, useTransition } from 'react';
import { activateDatabaseAction, createDatabaseAdminAction, deactivateDatabaseAction, forgetDatabaseAction, initializeDatabaseAction, testDatabaseAction } from '@/app/actions/admin/database';
import type { ConnectionPublic } from '@/lib/db-connection';
import { Card } from './ui';

export function DatabaseConnection({ status }: { status: ConnectionPublic }) {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) => {
    if (!url.trim() && fn !== deactivateDatabaseAction && fn !== forgetDatabaseAction) {
      setMsg({ ok: false, message: 'Paste the new connection string. It is sent only to the server and is not stored in this browser.' });
      return;
    }
    start(async () => {
      const res = await fn();
      setMsg(res);
      if (res.ok) {
        setPassword('');
      }
    });
  };

  return (
    <Card title="Database connection">
      <p className="text-[0.84rem] leading-relaxed text-muted">
        Test a PostgreSQL database, initialize its schema if needed, and switch only after the test succeeds. Credentials stay on the server, encrypted. A failed test never changes the database this store is using, and nothing here deletes the current database.
      </p>
      <dl className="mt-4 grid gap-3 text-[0.82rem] sm:grid-cols-3">
        <div><dt className="label">Saved host</dt><dd className="font-medium">{status.host || 'None'}</dd></div>
        <div><dt className="label">Database</dt><dd className="font-medium">{status.database || '—'}</dd></div>
        <div><dt className="label">Status</dt><dd className="font-medium">{status.active ? 'Active override' : status.saved ? 'Saved, not active' : 'Using environment variable'}</dd></div>
      </dl>
      {status.lastTest && <p className={`mt-3 text-[0.78rem] ${status.lastTest.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{status.lastTest.message}</p>}
      <label className="mt-5 block">
        <span className="label">Connection string</span>
        <input
          type="password"
          value={url}
          autoComplete="new-password"
          spellCheck={false}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={status.hasPassword ? 'Saved on the server — paste again to test or activate' : 'postgres://user:password@host/database'}
          className="field font-mono"
        />
      </label>
      <p className="mt-2 text-[0.75rem] text-muted">The password is not written to the page, local storage, or logs. Leave this blank and it is forgotten when you leave the page.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => run(() => testDatabaseAction(url))} className="btn btn-primary btn-sm">Test connection</button>
        <button type="button" disabled={pending} onClick={() => run(() => initializeDatabaseAction(url))} className="btn btn-secondary btn-sm">Initialize schema</button>
        <button type="button" disabled={pending} onClick={() => confirm('Switch the store to this database? Current data is not copied and is not deleted.') && run(() => activateDatabaseAction(url))} className="btn btn-secondary btn-sm">Activate</button>
        {status.active && <button type="button" disabled={pending} onClick={() => run(deactivateDatabaseAction)} className="btn btn-secondary btn-sm">Use original database</button>}
        {status.saved && <button type="button" disabled={pending} onClick={() => confirm('Remove the saved credentials? The current database is not changed.') && run(forgetDatabaseAction)} className="btn btn-secondary btn-sm">Forget saved credentials</button>}
      </div>
      <div className="mt-6 grid gap-3 border-t border-line pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <label><span className="label">New administrator email</span><input value={email} onChange={(e) => setEmail(e.target.value)} className="field" autoComplete="off" /></label>
        <label><span className="label">New administrator password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" autoComplete="new-password" /></label>
        <button type="button" disabled={pending} onClick={() => run(() => createDatabaseAdminAction(url, email, password))} className="btn btn-secondary btn-sm self-end">Create admin on new database</button>
      </div>
      <p className="mt-3 text-[0.75rem] text-muted">Creating an administrator writes only to the database in the connection string. Activation is refused if that database has no administrator, so you cannot lock yourself out. Before a temporary database expires, also set <code>DATABASE_URL</code> in your host and redeploy — this screen does not delete data on a timer.</p>
      {msg && <p className={`mt-4 text-[0.82rem] ${msg.ok ? 'text-emerald-700' : 'text-rose-700'}`} role="status">{msg.message}</p>}
    </Card>
  );
}
