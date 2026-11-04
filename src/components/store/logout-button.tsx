'use client';

import { useRef, useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';
import { cn } from '@/lib/utils';

function isRedirect(error: unknown) {
  return typeof error === 'object' && error !== null && 'digest' in error && String((error as { digest?: unknown }).digest).startsWith('NEXT_REDIRECT');
}

export function LogoutButton({ area, className, label = 'Sign out' }: { area: 'admin' | 'store'; className?: string; label?: string }) {
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  return (
    <form
      action={async (form) => {
        try {
          const result = await logoutAction(form);
          if (result && result.ok === false) {
            busy.current = false;
            setLocked(false);
            setError(result.message);
          }
        } catch (error) {
          if (isRedirect(error)) throw error;
          busy.current = false;
          setLocked(false);
          setError('Could not sign out. Your session is still active. Please try again.');
        }
      }}
      onSubmit={(event) => {
        if (busy.current) {
          event.preventDefault();
          return;
        }
        busy.current = true;
        setError(null);
        setLocked(true);
      }}
    >
      <input type="hidden" name="area" value={area} />
      <button type="submit" disabled={locked} aria-busy={locked} className={cn(className, locked && 'cursor-wait opacity-80')}>
        {locked ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} strokeWidth={1.5} />}
        {locked ? 'Logging out...' : label}
      </button>
      {error && <p role="alert" className="px-3 pt-1 text-[0.75rem] text-sale">{error}</p>}
    </form>
  );
}
