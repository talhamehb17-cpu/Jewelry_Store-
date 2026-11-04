'use client';

import { useActionState, useState, useTransition } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { lookupSubscriberOffers, subscribeNewsletter } from '@/app/actions/store';
import { SubscriberOffers } from './subscriber-offers';
import type { SubscriberOffer } from '@/lib/subscriber-offers';
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
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookup, setLookup] = useState<{ message: string; offers: SubscriberOffer[] } | null>(null);
  const [looking, startLookup] = useTransition();
  if (state?.ok) {
    return (
      <div className={className}>
        <p role="status" className="flex items-start gap-2 text-[0.9rem]">
          <Check size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent" /> {state.message}
        </p>
        <SubscriberOffers offers={state.offers ?? []} />
        <p className="mt-2 text-[0.75rem] text-muted">No email was sent with these codes. They stay available in the store while you are subscribed.</p>
      </div>
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
      <div className="mt-3">
        <label className="text-[0.75rem] text-muted" htmlFor={`offers-${source}`}>Already subscribed? See current offers</label>
        <div className="mt-1 flex gap-2">
          <input id={`offers-${source}`} type="email" value={lookupEmail} onChange={(e) => setLookupEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} placeholder="Your subscribed email" className="field min-w-0 flex-1" />
          <button
            type="button"
            disabled={looking}
            className="btn btn-secondary shrink-0"
            onClick={() => startLookup(async () => {
              const result = await lookupSubscriberOffers(lookupEmail);
              setLookup({ message: result.message, offers: result.offers ?? [] });
            })}
          >
            {looking ? 'Checking…' : 'Show offers'}
          </button>
        </div>
        {lookup && <p className="mt-2 text-[0.78rem] text-muted" role="status">{lookup.message}</p>}
        {lookup && <SubscriberOffers offers={lookup.offers} title="Current offers" />}
      </div>
    </form>
  );
}
