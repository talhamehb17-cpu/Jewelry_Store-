'use client';

import { useActionState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { submitContact } from '@/app/actions/store';
import { Input } from './auth-forms';

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, null);
  if (state?.ok) {
    return (
      <div className="flex flex-col items-center justify-center rounded-theme border border-line p-12 text-center">
        <CheckCircle2 size={40} strokeWidth={1} className="text-accent" />
        <p className="font-heading mt-5 text-2xl">Message sent</p>
        <p className="mt-2 max-w-sm text-muted">{state.message}</p>
      </div>
    );
  }
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5 rounded-theme border border-line p-7 md:p-9" noValidate>
      {state && !state.ok && <p className="text-[0.86rem] text-sale" role="alert">{state.message}</p>}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Name" name="name" autoComplete="name" required error={fe.name} />
        <Input label="Email" name="email" type="email" autoComplete="email" required error={fe.email} />
        <Input label="Phone (optional)" name="phone" type="tel" autoComplete="tel" />
        <div>
          <label htmlFor="f-subject" className="label">Subject</label>
          <select id="f-subject" name="subject" className="field">
            <option>Order enquiry</option>
            <option>Sizing & styling</option>
            <option>Bridal appointment</option>
            <option>Engraving & custom orders</option>
            <option>Returns & exchanges</option>
            <option>Something else</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="f-message" className="label">Message</label>
        <textarea id="f-message" name="message" rows={6} className="field" required />
        {fe.message && <p className="mt-1 text-[0.78rem] text-sale">{fe.message}</p>}
      </div>
      <button disabled={pending} className="btn btn-primary">{pending ? 'Sending…' : 'Send message'}</button>
    </form>
  );
}
