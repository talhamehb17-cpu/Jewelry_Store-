'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, Eye, Paintbrush, LayoutTemplate, Zap } from 'lucide-react';
import { activateTheme, setVisitorSwitcher } from '@/app/actions/admin/themes';
import { FONT_LIST } from '@/themes/font-list';
import { cn } from '@/lib/utils';
import type { ThemeSettings } from '@/themes/types';

type T = { id: string; name: string; tagline: string; description: string; mood: string[]; settings: ThemeSettings; hasDraft: boolean; customized: boolean };

const RADIUS = { square: 0, soft: 4, rounded: 10, pill: 999 } as const;

/** Miniature, token-driven rendering of a theme (fonts, palette, radius, button shape, card style). */
export function ThemeMock({ s }: { s: ThemeSettings }) {
  const c = s.colors;
  const hf = FONT_LIST[s.typography.headingFont].css;
  const bf = FONT_LIST[s.typography.bodyFont].css;
  const r = Math.min(s.layout.radius, 14);
  const ratio = s.layout.imageRatio === 'square' ? '1/1' : s.layout.imageRatio === 'tall' ? '3/4' : '4/5';
  const dark = s.layout.cardVariant === 'noir';
  const centered = ['centered', 'boutique', 'masthead', 'heritage', 'luxe', 'split', 'parisian'].includes(s.header.variant);
  return (
    <div className="aspect-[4/3] overflow-hidden" style={{ background: c.background, color: c.text, fontFamily: bf }}>
      <div style={{ background: c.announcementBg, color: c.announcementText }} className="py-[3px] text-center text-[6px] tracking-[0.2em]">COMPLIMENTARY SHIPPING</div>
      <div className={cn('flex items-center px-3 py-2', centered ? 'justify-center' : 'justify-between')} style={{ background: c.headerBg, borderBottom: s.header.borderBottom ? `1px solid ${c.border}` : undefined, ...(s.header.variant === 'floating' ? { margin: 6, borderRadius: 999, boxShadow: '0 2px 8px rgba(0,0,0,.08)' } : {}) }}>
        <span style={{ fontFamily: hf, letterSpacing: s.header.variant === 'luxe' || s.header.variant === 'centered' ? '0.25em' : undefined, fontStyle: ['boutique', 'parisian'].includes(s.header.variant) ? 'italic' : undefined, fontSize: s.header.variant === 'masthead' ? 18 : 11 }}>{s.header.logoText}</span>
        {!centered && <span className="flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="h-[3px] w-4 rounded" style={{ background: c.muted, opacity: 0.5 }} />)}</span>}
      </div>
      <div className="grid grid-cols-[1.25fr_1fr] gap-2 px-3 pt-2">
        <div className="flex flex-col justify-center">
          <p style={{ fontFamily: hf, fontWeight: s.typography.headingWeight, textTransform: s.typography.headingCase, letterSpacing: `${s.typography.headingTracking}em`, fontSize: 13, lineHeight: 1.05 }}>Jewelry Made for Your Moments</p>
          <span className="mt-2 inline-block w-fit px-2 py-[3px] text-[6px] uppercase tracking-widest" style={{ background: s.buttons.style === 'outline' ? 'transparent' : c.primary, color: s.buttons.style === 'outline' ? c.text : c.primaryText, border: `1px solid ${s.buttons.style === 'outline' ? c.text : c.primary}`, borderRadius: RADIUS[s.buttons.shape] }}>Shop now</span>
        </div>
        <div className="overflow-hidden" style={{ borderRadius: s.header.variant === 'boutique' || s.layout.cardVariant === 'arch' ? '999px 999px 0 0' : r, background: `linear-gradient(160deg, ${c.secondary}, ${c.surface})`, aspectRatio: '4/5' }} />
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5 px-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div style={{ aspectRatio: ratio, borderRadius: s.layout.cardVariant === 'arch' ? '999px 999px 0 0' : r, background: dark ? c.surface : c.secondary, border: s.layout.cardVariant === 'luxe' ? `1px solid ${c.accent}` : undefined }} />
            <div className="mx-auto mt-1 h-[3px] w-3/4 rounded" style={{ background: c.text, opacity: 0.6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ThemeGallery({ themes, active, visitorSwitcher }: { themes: T[]; active: string; visitorSwitcher: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const activate = (id: string) => {
    setBusy(id);
    start(async () => {
      const r = await activateTheme(id);
      setMsg(r.message);
      setBusy(null);
      router.refresh();
    });
  };
  const current = themes.find((t) => t.id === active) ?? themes[0]!;
  return (
    <div className="space-y-8">
      <section className="admin-card overflow-hidden">
        <div className="grid md:grid-cols-[1.1fr_1fr]">
          <div className="border-b border-line md:border-b-0 md:border-r"><ThemeMock s={current.settings} /></div>
          <div className="flex flex-col justify-center p-7">
            <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[0.7rem] font-medium text-emerald-700"><Zap size={12} /> Live theme</p>
            <h2 className="mt-3 font-heading text-[2rem] leading-tight">{current.name}</h2>
            <p className="mt-1 text-[0.85rem] text-muted">{current.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/admin/themes/${current.id}`} className="btn btn-primary"><Paintbrush size={14} /> Customize</Link>
              <Link href={`/admin/builder?theme=${current.id}`} className="btn btn-secondary"><LayoutTemplate size={14} /> Edit homepage</Link>
              <a href="/" target="_blank" rel="noreferrer" className="btn btn-secondary"><Eye size={14} /> View store</a>
            </div>
            <label className="mt-6 flex items-start gap-3 rounded-lg bg-secondary/70 p-3 text-[0.8rem]">
              <input type="checkbox" className="checkbox mt-0.5" checked={visitorSwitcher} disabled={pending} onChange={(e) => start(async () => { setMsg((await setVisitorSwitcher(e.target.checked)).message); router.refresh(); })} />
              <span><span className="font-medium">Let visitors choose a personal look</span><br /><span className="text-muted">Shows a Themes button. A visitor’s choice is saved to their account, or to this browser if they are not signed in. It never changes the store default or another customer’s view.</span></span>
            </label>
            {msg && <p className="mt-3 text-[0.8rem] text-emerald-700">{msg}</p>}
          </div>
        </div>
      </section>

      <div>
        <h2 className="mb-4 text-[0.95rem] font-semibold">Theme library</h2>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {themes.map((t) => {
            const isActive = t.id === active;
            return (
              <article key={t.id} className={cn('admin-card group overflow-hidden transition hover:shadow-[0_20px_40px_-30px_rgba(0,0,0,.4)]', isActive && 'ring-2 ring-[#a8844a]')}>
                <div className="relative border-b border-line">
                  <ThemeMock s={t.settings} />
                  {isActive && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#23201d] px-2 py-0.5 text-[0.65rem] text-white"><Check size={11} /> Live</span>}
                  {t.hasDraft && <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] text-amber-900">Unpublished changes</span>}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-heading text-[1.25rem] leading-tight">{t.name}</h3>
                      <p className="text-[0.75rem] text-muted">{t.tagline}</p>
                    </div>
                    <div className="flex shrink-0 overflow-hidden rounded-full border border-line">
                      {[t.settings.colors.background, t.settings.colors.surface, t.settings.colors.primary, t.settings.colors.accent].map((c, i) => <span key={i} className="h-5 w-3" style={{ background: c }} />)}
                    </div>
                  </div>
                  <p className="mt-2 text-[0.72rem] text-muted">{FONT_LIST[t.settings.typography.headingFont].label} + {FONT_LIST[t.settings.typography.bodyFont].label} · {t.settings.header.variant} header · {t.settings.layout.cardVariant} cards</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {isActive ? (
                      <span className="btn btn-sm cursor-default !bg-emerald-50 !text-emerald-800">Active</span>
                    ) : (
                      <button onClick={() => activate(t.id)} disabled={pending} className="btn btn-primary btn-sm">{busy === t.id ? 'Activating…' : 'Activate'}</button>
                    )}
                    <a href={`/?__preview=${t.id}&__mode=published`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm"><Eye size={12} /> Preview</a>
                    <Link href={`/admin/themes/${t.id}`} className="btn btn-secondary btn-sm"><Paintbrush size={12} /> Customize</Link>
                    <Link href={`/admin/builder?theme=${t.id}`} className="btn btn-secondary btn-sm"><LayoutTemplate size={12} /> Homepage</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
