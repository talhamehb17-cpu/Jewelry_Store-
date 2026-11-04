'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { Eye, EyeOff, Check } from 'lucide-react';
import { loginAction, registerAction, requestResetAction, resetPasswordAction, type FormState } from '@/app/actions/auth';
import { cn } from '@/lib/utils';

export function FormMessage({ state }: { state: FormState }) {
  if (!state?.message) return null;
  return (
    <div role={state.ok ? 'status' : 'alert'} className={cn('flex items-start gap-2 rounded-theme-sm px-4 py-3 text-[0.86rem]', state.ok ? 'bg-surface text-ink' : 'border border-sale/30 bg-sale/5 text-sale')}>
      {state.ok && <Check size={16} className="mt-0.5 shrink-0 text-accent" />}
      {state.message}
    </div>
  );
}

export function Input({ label, name, error, type = 'text', idPrefix = '', ...rest }: { label: string; name: string; error?: string; idPrefix?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  const id = `${idPrefix}f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input id={id} name={name} type={isPw && show ? 'text' : type} className={cn('field', isPw && 'pr-11', error && '!border-sale')} aria-invalid={!!error} {...rest} />
        {isPw && (
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff size={16} strokeWidth={1.25} /> : <Eye size={16} strokeWidth={1.25} />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-[0.78rem] text-sale">{error}</p>}
    </div>
  );
}

export function LoginForm({ next, area = 'store', idPrefix = '' }: { next?: string; area?: 'store' | 'admin'; idPrefix?: string }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ''} />
      <input type="hidden" name="area" value={area} />
      <FormMessage state={state} />
      <Input idPrefix={idPrefix} label="Email" name="email" type="email" autoComplete="email" required error={fe.email} />
      <Input idPrefix={idPrefix} label="Password" name="password" type="password" autoComplete="current-password" required error={fe.password} />
      {area === 'store' && (
        <div className="flex justify-end text-[0.82rem]"><Link href="/account/forgot-password" className="text-muted underline underline-offset-4 hover:text-ink">Forgot your password?</Link></div>
      )}
      <button disabled={pending} className="btn btn-primary btn-block">{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}

export function RegisterForm({ next, idPrefix = '' }: { next?: string; idPrefix?: string }) {
  const [state, action, pending] = useActionState(registerAction, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ''} />
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input idPrefix={idPrefix} label="First name" name="firstName" autoComplete="given-name" required error={fe.firstName} />
        <Input idPrefix={idPrefix} label="Last name" name="lastName" autoComplete="family-name" required error={fe.lastName} />
      </div>
      <Input idPrefix={idPrefix} label="Email" name="email" type="email" autoComplete="email" required error={fe.email} />
      <Input idPrefix={idPrefix} label="Password" name="password" type="password" autoComplete="new-password" required minLength={8} error={fe.password} />
      <p className="-mt-3 text-[0.75rem] text-muted">At least 8 characters, including a letter and a number.</p>
      <label className="flex items-start gap-3 text-[0.85rem]"><input type="checkbox" name="marketing" className="checkbox mt-0.5" defaultChecked /> Email me about new collections and private sales.</label>
      <button disabled={pending} className="btn btn-primary btn-block">{pending ? 'Creating account…' : 'Create account'}</button>
      <p className="text-center text-[0.75rem] text-muted">By creating an account you agree to our <Link href="/policies/terms-of-service" className="underline">Terms</Link> and <Link href="/policies/privacy-policy" className="underline">Privacy Policy</Link>.</p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestResetAction, null);
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      {!state?.ok && (
        <>
          <Input label="Email" name="email" type="email" autoComplete="email" required />
          <button disabled={pending} className="btn btn-primary btn-block">{pending ? 'Sending…' : 'Send reset link'}</button>
        </>
      )}
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <Input label="New password" name="password" type="password" autoComplete="new-password" required error={fe.password} />
      <Input label="Confirm password" name="confirm" type="password" autoComplete="new-password" required error={fe.confirm} />
      <button disabled={pending} className="btn btn-primary btn-block">{pending ? 'Saving…' : 'Set new password'}</button>
    </form>
  );
}
