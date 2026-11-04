'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Generic button that runs a server action, optionally confirming first and showing the result. */
export function ActionButton({
  action,
  children,
  confirmText,
  className,
  showResult = true,
}: {
  action: () => Promise<{ ok: boolean; message: string; data?: string } | void>;
  children: React.ReactNode;
  confirmText?: string;
  className?: string;
  showResult?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [res, setRes] = useState<{ ok: boolean; message: string; data?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  return (
    <div className="inline-flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirmText && !confirm(confirmText)) return;
          start(async () => {
            const r = await action();
            if (r) setRes(r);
            router.refresh();
          });
        }}
        className={cn('btn btn-secondary', className)}
      >
        {pending ? 'Working…' : children}
      </button>
      {showResult && res && (
        <div className={cn('max-w-full rounded-md px-3 py-2 text-[0.78rem] sm:max-w-md', res.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800')}>
          {res.message}
          {res.data && (
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 text-[0.72rem] text-ink">{res.data}</code>
              <button type="button" onClick={() => { navigator.clipboard.writeText(res.data!); setCopied(true); }} className="shrink-0" aria-label="Copy">{copied ? <Check size={14} /> : <Copy size={14} />}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
