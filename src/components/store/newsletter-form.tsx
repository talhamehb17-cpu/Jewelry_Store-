'use client';

import { useActionState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { subscribeNewsletter } from '@/app/actions/store';
import { cn } from '@/lib/utils';

export function NewsletterForm({
  source = 'footer',
  buttonLabel = 'Subscribe',
  variant = 'line',
  className,
  dark,
}: {
  source?: string;
  buttonLabel?: string;
  variant?: 'line' | 'boxed' | 'pill' | 'arrow';
  className?: string;
  dark?: boolean;
}) {
  const [state, action, pending] = useActionState(subscribeNewsletter, null);
  if (state?.ok) {
    return (
      <p role="status" className={cn('flex items-start gap-2 text-[0.9rem]', className)}>
        <Check size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent" /> {state.message}
      </p>
    );
  }
  return (
    <form action={action} className={cn('w-full', className)} noValidate>
      <input type="hidden" name="source" value={source} />
      <div
        className={cn(
          'flex w-full items-stretch gap-2',
          variant === 'line' && 'border-b border-current pb-1',
          variant === 'pill' && 'rounded-full border border-line bg-bg p-1 pl-5',
          variant === 'arrow' && 'border-b border-current',
        )}
      >
        <label htmlFor={`nl-${source}`} className="sr-only">Email address</label>
        <input
          id={`nl-${source}`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Your email address"
          className={cn(
            'min-w-0 flex-1 bg-transparent py-3 text-[0.92rem] outline-none placeholder:opacity-60',
            variant === 'boxed' && 'field',
            dark && 'placeholder:text-white/60',
          )}
        />
        {variant === 'arrow' || variant === 'line' ? (
          <button type="submit" disabled={pending} className="inline-flex items-center gap-2 px-1 text-[0.75rem] uppercase tracking-[0.18em] transition hover:opacity-60 disabled:opacity-50" aria-label={buttonLabel}>
            {variant === 'line' && <span>{pending ? '…' : buttonLabel}</span>}
            <ArrowRight size={16} strokeWidth={1.25} />
          </button>
        ) : (
          <button type="submit" disabled={pending} className={cn('btn btn-primary shrink-0', variant === 'pill' && '!rounded-full')}>
            {pending ? 'Joining…' : buttonLabel}
          </button>
        )}
      </div>
      {state && !state.ok && <p className="mt-2 text-[0.8rem] text-sale" role="alert">{state.message}</p>}
    </form>
  );
}
