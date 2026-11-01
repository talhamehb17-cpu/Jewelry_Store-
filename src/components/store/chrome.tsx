'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Check, Palette, X, Eye } from 'lucide-react';
import { useStore } from './providers';
import { setVisitorTheme } from '@/app/actions/store';
import { cn } from '@/lib/utils';

export function Toaster() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cn('slide-up pointer-events-auto flex w-full max-w-sm items-start gap-3 border px-4 py-3 shadow-xl rounded-theme-sm', t.tone === 'error' ? 'border-sale bg-bg text-sale' : 'border-line bg-bg text-ink')}>
          <Check size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-[0.85rem] font-medium">{t.title}</p>
            {t.body && <p className="truncate text-[0.78rem] text-muted">{t.body}</p>}
          </div>
          <button onClick={() => dismissToast(t.id)} className="text-muted hover:text-ink" aria-label="Dismiss">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Adds .in-view to .reveal elements as they enter the viewport (re-scans after client navigation). */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in-view');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    const scan = () => document.querySelectorAll('.reveal:not(.in-view)').forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);
  return null;
}

type ThemeChip = { id: string; name: string; tagline: string; swatch: string[] };

export function ThemeSwitcher({ themes, current, activeId }: { themes: ThemeChip[]; current: string; activeId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [inFrame, setInFrame] = useState(false);
  useEffect(() => setInFrame(window.self !== window.top && document.referrer.includes('/admin')), []);
  if (inFrame) return null;
  return (
    <div className="fixed bottom-4 left-4 z-[60] md:bottom-6 md:left-6">
      {open && (
        <div className="slide-up mb-3 w-[300px] overflow-hidden rounded-xl border border-black/10 bg-white text-[#23201d] shadow-2xl">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
            <div>
              <p className="text-[0.85rem] font-semibold">Preview a theme</p>
              <p className="text-[0.7rem] text-[#7c756d]">Demo mode · your data stays the same</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close theme switcher" className="text-[#7c756d] hover:text-black"><X size={16} /></button>
          </div>
          <ul className="max-h-[55vh] overflow-y-auto p-2">
            {themes.map((t) => (
              <li key={t.id}>
                <button
                  disabled={pending}
                  onClick={() => start(() => setVisitorTheme(t.id === activeId ? null : t.id))}
                  className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-black/[.04]', current === t.id && 'bg-black/[.05]')}
                >
                  <span className="flex shrink-0 overflow-hidden rounded-full border border-black/10">
                    {t.swatch.map((c, i) => <span key={i} className="h-6 w-3" style={{ background: c }} />)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.82rem] font-medium">{t.name}{t.id === activeId && <span className="ml-1.5 text-[0.65rem] font-normal text-[#a8844a]">· live</span>}</span>
                    <span className="block truncate text-[0.7rem] text-[#7c756d]">{t.tagline}</span>
                  </span>
                  {current === t.id && <Check size={15} className="text-[#a8844a]" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full bg-[#23201d] px-4 py-2.5 text-[0.78rem] font-medium text-white shadow-xl transition hover:scale-[1.03]" aria-expanded={open}>
        <Palette size={15} strokeWidth={1.5} /> {pending ? 'Switching…' : 'Themes'}
      </button>
    </div>
  );
}

export function PreviewBanner({ themeName, mode }: { themeName: string; mode: string }) {
  const [inFrame, setInFrame] = useState(true);
  useEffect(() => setInFrame(window.self !== window.top), []);
  if (inFrame) return null;
  return (
    <div className="relative z-[52] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-[#23201d] px-4 py-2 text-center text-[0.78rem] text-white">
      <span className="inline-flex items-center gap-2"><Eye size={14} /> Previewing <strong>{themeName}</strong> ({mode === 'draft' ? 'unpublished draft' : 'published'}) — only you can see this</span>
      <a href="?__exit_preview=1" className="underline underline-offset-2">Exit preview</a>
      <Link href="/admin/themes" className="underline underline-offset-2">Back to themes</Link>
    </div>
  );
}

/** Receives live CSS variable updates from the admin theme customizer (same-origin postMessage only). */
export function LivePreviewBridge() {
  useEffect(() => {
    if (window.self === window.top) return;
    let last: { desktop: Record<string, string>; mobile: Record<string, string> } | null = null;
    const ok = (k: string, v: unknown) => /^--[a-z0-9-]+$/.test(k) && typeof v === 'string' && !/[<>{};]/.test(v);
    const apply = () => {
      if (!last) return;
      const root = document.documentElement.style;
      for (const [k, v] of Object.entries(last.desktop)) if (ok(k, v)) root.setProperty(k, v);
      if (window.innerWidth < 768) for (const [k, v] of Object.entries(last.mobile)) if (ok(k, v)) root.setProperty(k, v);
    };
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || !e.data || e.data.type !== 'aurelle:vars') return;
      last = { desktop: e.data.desktop ?? {}, mobile: e.data.mobile ?? {} };
      apply();
    };
    window.addEventListener('message', onMsg);
    window.addEventListener('resize', apply);
    return () => {
      window.removeEventListener('message', onMsg);
      window.removeEventListener('resize', apply);
    };
  }, []);
  return null;
}
