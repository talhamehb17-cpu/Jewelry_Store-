'use client';

import { useTransition } from 'react';
import { Check } from 'lucide-react';
import { setVisitorTheme } from '@/app/actions/store';
import { cn } from '@/lib/utils';

type ThemeChip = { id: string; name: string; tagline: string; swatch: string[] };

export function AppearancePicker({ themes, current, storeDefault }: { themes: ThemeChip[]; current: string; storeDefault: string }) {
  const [pending, start] = useTransition();
  const choose = (id: string | null) => {
    if (id) localStorage.setItem('aurelle_theme', id);
    else localStorage.removeItem('aurelle_theme');
    start(() => setVisitorTheme(id));
  };
  return (
    <div>
      <p className="max-w-xl text-[0.95rem] leading-relaxed text-muted">This look is saved to your account and does not change the store for anyone else. Choose the store default to follow the look set by the maison.</p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        <li>
          <button type="button" disabled={pending} onClick={() => choose(null)} className={cn('flex w-full items-center gap-3 rounded-theme border p-3 text-left', current === storeDefault ? 'border-ink' : 'border-line hover:border-muted')}>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.92rem]">Store default</span>
              <span className="block text-[0.75rem] text-muted">Follow the maison’s current theme</span>
            </span>
            {current === storeDefault && <Check size={16} />}
          </button>
        </li>
        {themes.map((t) => (
          <li key={t.id}>
            <button type="button" disabled={pending} onClick={() => choose(t.id)} className={cn('flex w-full items-center gap-3 rounded-theme border p-3 text-left', current === t.id ? 'border-ink' : 'border-line hover:border-muted')}>
              <span className="flex shrink-0 overflow-hidden rounded-full border border-line">
                {t.swatch.map((c) => <span key={c} className="h-8 w-3" style={{ background: c }} />)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.92rem]">{t.name}</span>
                <span className="block truncate text-[0.75rem] text-muted">{t.tagline}</span>
              </span>
              {current === t.id && <Check size={16} />}
            </button>
          </li>
        ))}
      </ul>
      {pending && <p className="mt-4 text-[0.8rem] text-muted">Saving your look…</p>}
    </div>
  );
}
