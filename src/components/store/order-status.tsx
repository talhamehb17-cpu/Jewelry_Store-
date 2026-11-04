import { Check, X } from 'lucide-react';
import { cn, titleCase } from '@/lib/utils';
import { paymentStatusLabel } from '@/lib/payments';

const STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'] as const;

export function StatusBadge({ status, kind = 'order' }: { status: string; kind?: 'order' | 'payment' }) {
  const tone: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    awaiting: 'bg-amber-50 text-amber-800 border-amber-200',
    unpaid: 'bg-stone-100 text-stone-700 border-stone-200',
    confirmed: 'bg-sky-50 text-sky-800 border-sky-200',
    processing: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    shipped: 'bg-violet-50 text-violet-800 border-violet-200',
    out_for_delivery: 'bg-violet-50 text-violet-900 border-violet-200',
    awaiting_confirm: 'bg-amber-50 text-amber-900 border-amber-200',
    delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    cancelled: 'bg-rose-50 text-rose-800 border-rose-200',
    failed: 'bg-rose-50 text-rose-800 border-rose-200',
    refunded: 'bg-stone-100 text-stone-700 border-stone-200',
    partially_refunded: 'bg-stone-100 text-stone-700 border-stone-200',
  };
  const label = kind === 'payment' ? paymentStatusLabel(status) : status === 'awaiting_confirm' ? 'Awaiting confirmation' : titleCase(status);
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.72rem] font-medium', tone[status] ?? 'bg-stone-100 text-stone-700 border-stone-200')}>{label}</span>;
}

export function OrderTracker({ status }: { status: string }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 rounded-theme-sm bg-rose-50 px-4 py-3 text-[0.88rem] text-rose-800">
        <X size={18} /> This order was cancelled.
      </div>
    );
  }
  const idx = STEPS.indexOf(status as (typeof STEPS)[number]);
  return (
    <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Order progress">
      {STEPS.map((s, i) => {
        const done = i <= idx;
        return (
          <li key={s} className="flex flex-col items-center text-center">
            <div className="flex w-full items-center">
              <span className={cn('h-px flex-1', i === 0 ? 'opacity-0' : done ? 'bg-accent' : 'bg-line')} />
              <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[0.75rem]', done ? 'border-accent bg-accent text-white' : 'border-line bg-bg text-muted')}>
                {done ? <Check size={14} strokeWidth={2} /> : i + 1}
              </span>
              <span className={cn('h-px flex-1', i === STEPS.length - 1 ? 'opacity-0' : i < idx ? 'bg-accent' : 'bg-line')} />
            </div>
            <span className={cn('mt-2 text-[0.7rem] sm:text-[0.78rem]', done ? 'text-ink' : 'text-muted')}>{titleCase(s)}</span>
          </li>
        );
      })}
    </ol>
  );
}
