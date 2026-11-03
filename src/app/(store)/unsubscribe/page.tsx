'use client';

import { useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { unsubscribeByToken } from '@/app/actions/unsubscribe';

function Form() {
  const token = useSearchParams().get('token') || '';
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  return (
    <div className="container-x section-y">
      <div className="mx-auto max-w-lg text-center">
        <p className="eyebrow mb-3">Evermoon Circle</p>
        <h1 className="t-2">Unsubscribe</h1>
        <p className="mt-4 text-muted">Promotional letters will stop. Messages about an order you place — confirmation, shipping, delivery — will still be sent.</p>
        {message && <p className="mt-6 text-[0.95rem]">{message}</p>}
        <button
          type="button"
          disabled={pending || !token}
          className="btn btn-primary mt-8"
          onClick={() => start(async () => setMessage((await unsubscribeByToken(token)).message))}
        >
          {pending ? 'Updating…' : 'Unsubscribe'}
        </button>
        {!token && <p className="mt-4 text-[0.85rem] text-sale">This link is missing its token. Use the link from the email.</p>}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="container-x section-y text-center text-muted">Loading…</div>}>
      <Form />
    </Suspense>
  );
}
