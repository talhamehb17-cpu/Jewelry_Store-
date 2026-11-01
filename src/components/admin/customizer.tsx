'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Palette, Type, LayoutGrid, MousePointerClick, PanelTop, PanelBottom, Megaphone, Smartphone, Sparkles, Loader2, Check, Upload, RotateCcw, Undo2, LayoutTemplate } from 'lucide-react';
import { discardThemeDraft, publishTheme, resetThemeDefaults, saveThemeDraft, activateTheme } from '@/app/actions/admin/themes';
import { DeviceToggle, PreviewFrame, type Device } from './studio';
import { ImageInput } from './image-input';
import { FONT_LIST, FONT_KEYS } from '@/themes/font-list';
import { themeCssVars } from '@/themes/engine';
import { cn, titleCase } from '@/lib/utils';
import type { ThemeSettings } from '@/themes/types';

type Tab = 'colors' | 'typography' | 'layout' | 'buttons' | 'header' | 'footer' | 'announcement' | 'mobile' | 'motion';
const TABS: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: 'colors', label: 'Colours', icon: Palette },
  { id: 'typography', label: 'Typography', icon: Type },
  { id: 'layout', label: 'Layout', icon: LayoutGrid },
  { id: 'buttons', label: 'Buttons', icon: MousePointerClick },
  { id: 'header', label: 'Header', icon: PanelTop },
  { id: 'footer', label: 'Footer', icon: PanelBottom },
  { id: 'announcement', label: 'Announcement', icon: Megaphone },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
  { id: 'motion', label: 'Motion', icon: Sparkles },
];

// Changes to these paths alter markup (not just CSS variables), so the preview reloads after saving.
const STRUCTURAL = ['header.', 'footer.', 'announcement.', 'layout.cardVariant', 'layout.pdpVariant', 'layout.pdpStyle', 'layout.collectionVariant', 'buttons.style', 'buttons.hover', 'animation.style', 'mobile.headerVariant', 'mobile.stickyAtc', 'mobile.showAnnouncement', 'mobile.heroHeight'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setIn(obj: any, path: string, value: unknown) {
  const keys = path.split('.');
  const clone = structuredClone(obj);
  let cur = clone;
  for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]!];
  cur[keys[keys.length - 1]!] = value;
  return clone;
}

const opts = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: titleCase(x) }));

export function Customizer({ themeId, name, initial, hasDraft, isActive }: { themeId: string; name: string; initial: ThemeSettings; hasDraft: boolean; isActive: boolean }) {
  const [s, setS] = useState<ThemeSettings>(initial);
  const [tab, setTab] = useState<Tab>('colors');
  const [device, setDevice] = useState<Device>('desktop');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(hasDraft ? 'saved' : 'idle');
  const [draft, setDraft] = useState(hasDraft);
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();
  const frame = useRef<HTMLIFrameElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const structural = useRef(false);
  const latest = useRef(s);
  latest.current = s;

  const pushVars = useCallback((settings: ThemeSettings) => {
    const { desktop, mobile } = themeCssVars(settings);
    frame.current?.contentWindow?.postMessage({ type: 'aurelle:vars', desktop, mobile }, window.location.origin);
  }, []);
  const reload = () => frame.current?.contentWindow?.location.reload();

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setStatus('saving');
    const r = await saveThemeDraft(themeId, { settings: latest.current });
    setStatus(r.ok ? 'saved' : 'error');
    if (r.ok) setDraft(true);
    if (!r.ok) setMsg(r.message);
    if (structural.current) {
      structural.current = false;
      reload();
    }
    return r.ok;
  }, [themeId]);

  const set = (path: string, value: unknown) => {
    const next = setIn(latest.current, path, value) as ThemeSettings;
    setS(next);
    pushVars(next);
    if (STRUCTURAL.some((p) => path.startsWith(p))) structural.current = true;
    setStatus('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const color = (key: keyof ThemeSettings['colors'], label: string) => (
    <label key={key} className="flex items-center justify-between gap-3 py-1.5 text-[0.8rem]">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <input value={s.colors[key]} onChange={(e) => set(`colors.${key}`, e.target.value)} className="field !w-24 !px-2 !py-1 font-mono !text-[0.72rem]" aria-label={`${label} hex`} />
        <input type="color" value={s.colors[key].slice(0, 7)} onChange={(e) => set(`colors.${key}`, e.target.value)} className="h-7 w-7 cursor-pointer rounded border border-line bg-transparent p-0" aria-label={label} />
      </span>
    </label>
  );
  const range = (path: string, label: string, min: number, max: number, step = 1, unit = '') => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = path.split('.').reduce((o: any, k) => o[k], s) as number;
    return (
      <div key={path}>
        <div className="flex justify-between text-[0.78rem]"><span>{label}</span><span className="text-muted">{v}{unit}</span></div>
        <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(path, Number(e.target.value))} className="w-full accent-[#a8844a]" />
      </div>
    );
  };
  const select = (path: string, label: string, options: { value: string | number; label: string }[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = path.split('.').reduce((o: any, k) => o[k], s);
    return (
      <div key={path}>
        <label className="label">{label}</label>
        <select value={String(v)} onChange={(e) => set(path, typeof options[0]?.value === 'number' ? Number(e.target.value) : e.target.value)} className="field">{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      </div>
    );
  };
  const toggle = (path: string, label: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = path.split('.').reduce((o: any, k) => o[k], s) as boolean;
    return <label key={path} className="flex items-center gap-2 text-[0.82rem]"><input type="checkbox" className="checkbox" checked={v} onChange={(e) => set(path, e.target.checked)} /> {label}</label>;
  };
  const text = (path: string, label: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = path.split('.').reduce((o: any, k) => o[k], s) as string;
    return <div key={path}><label className="label">{label}</label><input value={v} onChange={(e) => set(path, e.target.value)} className="field" /></div>;
  };
  const fontSelect = (path: 'headingFont' | 'bodyFont' | 'navFont' | 'accentFont', label: string) => (
    <div key={path}>
      <label className="label">{label}</label>
      <select value={s.typography[path]} onChange={(e) => set(`typography.${path}`, e.target.value)} className="field">
        <optgroup label="Serif">{FONT_KEYS.filter((k) => FONT_LIST[k].kind === 'serif').map((k) => <option key={k} value={k}>{FONT_LIST[k].label}</option>)}</optgroup>
        <optgroup label="Sans-serif">{FONT_KEYS.filter((k) => FONT_LIST[k].kind === 'sans').map((k) => <option key={k} value={k}>{FONT_LIST[k].label}</option>)}</optgroup>
      </select>
      <p className="mt-1 truncate text-[1.05rem]" style={{ fontFamily: FONT_LIST[s.typography[path]].css }}>Aurelia Gold Necklace</p>
    </div>
  );

  const panels: Record<Tab, React.ReactNode> = {
    colors: (
      <div className="divide-y divide-line">
        <div className="pb-3"><p className="label">Base</p>{color('background', 'Background')}{color('surface', 'Surface / cards')}{color('text', 'Text')}{color('muted', 'Muted text')}{color('border', 'Borders')}</div>
        <div className="py-3"><p className="label">Brand</p>{color('primary', 'Primary (buttons)')}{color('primaryText', 'Text on primary')}{color('secondary', 'Secondary')}{color('accent', 'Accent / gold')}{color('sale', 'Sale price')}</div>
        <div className="py-3"><p className="label">Header & footer</p>{color('headerBg', 'Header background')}{color('headerText', 'Header text')}{color('footerBg', 'Footer background')}{color('footerText', 'Footer text')}</div>
        <div className="pt-3"><p className="label">Announcement bar</p>{color('announcementBg', 'Background')}{color('announcementText', 'Text')}</div>
      </div>
    ),
    typography: (
      <div className="space-y-4">
        {fontSelect('headingFont', 'Heading font')}
        {fontSelect('bodyFont', 'Body font')}
        {fontSelect('navFont', 'Navigation & labels')}
        {fontSelect('accentFont', 'Accent (italic) font')}
        {range('typography.baseSize', 'Base size', 12, 20, 1, 'px')}
        {range('typography.headingScale', 'Heading scale', 0.7, 1.6, 0.05, '×')}
        {range('typography.headingWeight', 'Heading weight', 100, 900, 100)}
        {range('typography.bodyWeight', 'Body weight', 200, 700, 100)}
        {range('typography.headingTracking', 'Heading letter-spacing', -0.08, 0.3, 0.01, 'em')}
        {select('typography.headingCase', 'Heading case', opts(['none', 'uppercase']))}
        {range('typography.navSize', 'Navigation size', 10, 20, 1, 'px')}
        {range('typography.navTracking', 'Navigation letter-spacing', -0.05, 0.4, 0.01, 'em')}
        {select('typography.navCase', 'Navigation case', opts(['none', 'uppercase']))}
        {range('typography.lineHeight', 'Line height', 1.2, 2.2, 0.05)}
      </div>
    ),
    layout: (
      <div className="space-y-4">
        {range('layout.containerWidth', 'Content width', 960, 1800, 20, 'px')}
        {range('layout.sectionSpacing', 'Section spacing (desktop)', 32, 220, 4, 'px')}
        {select('layout.gridColumns', 'Product columns (desktop)', [3, 4, 5].map((n) => ({ value: n, label: `${n} columns` })))}
        {range('layout.gridGap', 'Grid gap', 0, 64, 2, 'px')}
        {range('layout.radius', 'Corner radius', 0, 40, 1, 'px')}
        {select('layout.imageRatio', 'Product image ratio', [{ value: 'square', label: 'Square 1:1' }, { value: 'portrait', label: 'Portrait 4:5' }, { value: 'tall', label: 'Tall 3:4' }])}
        {select('layout.cardVariant', 'Product card style', opts(['classic', 'minimal', 'rounded', 'noir', 'editorial', 'framed', 'nordic', 'arch', 'luxe', 'overlay']))}
        {select('layout.pdpVariant', 'Product page gallery', opts(['thumbs-left', 'grid', 'carousel', 'stacked', 'asymmetric']))}
        {select('layout.pdpStyle', 'Product page styling', opts(['soft', 'minimal', 'boutique', 'noir', 'editorial', 'heritage', 'nordic', 'romantic', 'luxe', 'bold']))}
        {select('layout.collectionVariant', 'Collection page layout', [{ value: 'sidebar', label: 'Sidebar filters' }, { value: 'topbar', label: 'Top filter bar' }, { value: 'drawer', label: 'Editorial with filter drawer' }, { value: 'banner', label: 'Image banner + sidebar' }])}
      </div>
    ),
    buttons: (
      <div className="space-y-4">
        {select('buttons.shape', 'Shape', opts(['square', 'soft', 'rounded', 'pill']))}
        {select('buttons.style', 'Primary style', opts(['solid', 'outline']))}
        {select('buttons.hover', 'Hover effect', [{ value: 'darken', label: 'Darken' }, { value: 'lift', label: 'Lift' }, { value: 'fill', label: 'Fill / invert' }, { value: 'invert', label: 'Invert' }, { value: 'shine', label: 'Gold shine' }, { value: 'arrow', label: 'Arrow slide' }])}
        {select('buttons.size', 'Size', opts(['sm', 'md', 'lg']))}
        {toggle('buttons.uppercase', 'Uppercase labels')}
        {range('buttons.tracking', 'Letter-spacing', 0, 0.4, 0.01, 'em')}
        {range('buttons.weight', 'Weight', 300, 800, 100)}
        <div className="rounded-lg border border-line p-4" style={{ background: s.colors.background }}>
          <span className="inline-block px-5 py-2.5 text-[0.75rem]" style={{ background: s.buttons.style === 'solid' ? s.colors.primary : 'transparent', color: s.buttons.style === 'solid' ? s.colors.primaryText : s.colors.text, border: `1px solid ${s.buttons.style === 'solid' ? s.colors.primary : s.colors.text}`, borderRadius: { square: 0, soft: 4, rounded: 10, pill: 999 }[s.buttons.shape], textTransform: s.buttons.uppercase ? 'uppercase' : 'none', letterSpacing: `${s.buttons.tracking}em`, fontWeight: s.buttons.weight }}>Add to bag</span>
        </div>
      </div>
    ),
    header: (
      <div className="space-y-4">
        {select('header.variant', 'Header layout', [
          { value: 'centered', label: 'Centred two-tier' }, { value: 'inline', label: 'Inline minimal' }, { value: 'boutique', label: 'Boutique' }, { value: 'split', label: 'Split navigation' }, { value: 'masthead', label: 'Magazine masthead' },
          { value: 'heritage', label: 'Heritage with crest' }, { value: 'menu', label: 'Menu overlay' }, { value: 'parisian', label: 'Parisian text links' }, { value: 'luxe', label: 'Luxe mega menu' }, { value: 'floating', label: 'Floating pill' },
        ])}
        {text('header.logoText', 'Logo text')}
        {text('header.logoTagline', 'Tagline under logo')}
        <ImageInput label="Logo image (optional — replaces text)" value={s.header.logoImage} onChange={(v) => set('header.logoImage', v)} compact />
        {range('header.logoSize', 'Logo size', 14, 96, 1, 'px')}
        {toggle('header.sticky', 'Sticky header')}
        {toggle('header.transparentOnHome', 'Transparent over homepage hero')}
        {toggle('header.borderBottom', 'Bottom border')}
      </div>
    ),
    footer: (
      <div className="space-y-4">
        {select('footer.variant', 'Footer layout', [
          { value: 'soft', label: 'Soft (newsletter on top)' }, { value: 'minimal', label: 'Minimal' }, { value: 'boutique', label: 'Boutique centred' }, { value: 'noir', label: 'Noir with gold' }, { value: 'editorial', label: 'Editorial oversized wordmark' },
          { value: 'heritage', label: 'Heritage' }, { value: 'nordic', label: 'Nordic' }, { value: 'parisian', label: 'Parisian “Merci”' }, { value: 'glamour', label: 'Glamour promo' }, { value: 'bento', label: 'Bento grid' },
        ])}
        {text('footer.tagline', 'Tagline')}
        {toggle('footer.showNewsletter', 'Newsletter sign-up')}
        {toggle('footer.showSocial', 'Social icons')}
        {toggle('footer.showPayments', 'Payment methods')}
        <p className="text-[0.75rem] text-muted">Footer links are managed in <Link href="/admin/settings" className="underline">Settings → Footer menus</Link>.</p>
      </div>
    ),
    announcement: (
      <div className="space-y-4">
        {toggle('announcement.enabled', 'Show announcement bar')}
        {select('announcement.style', 'Style', [{ value: 'rotate', label: 'Rotating messages' }, { value: 'marquee', label: 'Scrolling marquee' }, { value: 'static', label: 'Single static message' }])}
        <div className="space-y-2">
          <p className="label">Messages</p>
          {s.announcement.messages.map((m, i) => (
            <div key={i} className="space-y-1.5 rounded-lg border border-line p-2.5">
              <input value={m.text} onChange={(e) => set('announcement.messages', s.announcement.messages.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)))} className="field" placeholder="Message" />
              <div className="flex gap-2">
                <input value={m.link ?? ''} onChange={(e) => set('announcement.messages', s.announcement.messages.map((x, k) => (k === i ? { ...x, link: e.target.value } : x)))} className="field" placeholder="Optional link, e.g. /shop" />
                <button onClick={() => set('announcement.messages', s.announcement.messages.filter((_, k) => k !== i))} className="btn btn-secondary btn-sm">Remove</button>
              </div>
            </div>
          ))}
          <button onClick={() => set('announcement.messages', [...s.announcement.messages, { text: 'New message', link: '' }])} className="btn btn-secondary btn-sm">Add message</button>
        </div>
      </div>
    ),
    mobile: (
      <div className="space-y-4">
        <p className="rounded-md bg-secondary px-3 py-2 text-[0.75rem] text-muted">These settings only apply on phones (under 768px). Switch the preview to mobile to see them.</p>
        {range('mobile.baseSize', 'Base text size', 12, 19, 1, 'px')}
        {range('mobile.sectionSpacing', 'Section spacing', 24, 160, 4, 'px')}
        {range('mobile.containerPadding', 'Side padding', 8, 48, 1, 'px')}
        {select('mobile.gridColumns', 'Product columns', [{ value: 1, label: '1 column' }, { value: 2, label: '2 columns' }])}
        {select('mobile.heroHeight', 'Hero height', [{ value: 'auto', label: 'Auto' }, { value: '60', label: '60% screen' }, { value: '75', label: '75% screen' }, { value: '90', label: '90% screen' }, { value: '100', label: 'Full screen' }])}
        {select('mobile.headerVariant', 'Logo position', [{ value: 'center', label: 'Centred logo' }, { value: 'left', label: 'Left logo' }])}
        {toggle('mobile.stickyAtc', 'Sticky add-to-bag bar on product pages')}
        {toggle('mobile.showAnnouncement', 'Show announcement bar')}
      </div>
    ),
    motion: (
      <div className="space-y-4">
        {select('animation.style', 'Scroll reveal animation', [{ value: 'fade-up', label: 'Fade up' }, { value: 'fade', label: 'Fade' }, { value: 'scale', label: 'Soft scale' }, { value: 'reveal', label: 'Mask reveal' }, { value: 'rise', label: 'Rise' }, { value: 'slow', label: 'Slow & stately' }, { value: 'blur', label: 'Blur in' }, { value: 'slide', label: 'Slide' }, { value: 'none', label: 'None' }])}
        {range('animation.speed', 'Duration', 150, 2500, 50, 'ms')}
        <p className="text-[0.75rem] text-muted">Animations automatically respect visitors’ “reduce motion” accessibility setting.</p>
      </div>
    ),
  };

  return (
    <div className="flex h-[100dvh] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin/themes" className="text-[0.78rem] text-muted hover:text-ink">← Themes</Link>
          <span className="truncate font-heading text-[1.3rem]">{name}</span>
          {isActive ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.68rem] text-emerald-700">Live</span> : <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.68rem] text-muted">Not active</span>}
          <span className="text-[0.75rem] text-muted">{status === 'saving' ? <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Saving draft…</span> : status === 'saved' ? <span className="inline-flex items-center gap-1 text-emerald-700"><Check size={12} /> Draft saved</span> : status === 'error' ? <span className="text-rose-700">{msg}</span> : 'No unpublished changes'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DeviceToggle device={device} setDevice={setDevice} />
          <Link href={`/admin/builder?theme=${themeId}`} className="btn btn-secondary btn-sm"><LayoutTemplate size={13} /> Sections</Link>
          <button disabled={pending} onClick={() => confirm('Restore this theme’s original design settings into the draft?') && start(async () => { await resetThemeDefaults(themeId, 'settings'); window.location.reload(); })} className="btn btn-secondary btn-sm"><RotateCcw size={13} /> Defaults</button>
          {draft && <button disabled={pending} onClick={() => confirm('Discard all unpublished changes?') && start(async () => { await discardThemeDraft(themeId); window.location.reload(); })} className="btn btn-secondary btn-sm"><Undo2 size={13} /> Discard</button>}
          {!isActive && <button disabled={pending} onClick={() => start(async () => { await flush(); await publishTheme(themeId); const r = await activateTheme(themeId); setMsg(r.message); window.location.reload(); })} className="btn btn-secondary btn-sm">Publish &amp; activate</button>}
          <button disabled={pending} onClick={() => start(async () => { if (await flush()) { const r = await publishTheme(themeId); setDraft(false); setStatus('idle'); setMsg(r.message); reload(); } })} className="btn btn-primary btn-sm">{pending ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Publish</button>
        </div>
      </div>
      {msg && status !== 'error' && <p className="border-b border-emerald-200 bg-emerald-50 px-4 py-1.5 text-[0.78rem] text-emerald-800">{msg}</p>}
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[340px] shrink-0 flex-col border-r border-line bg-white">
          <nav className="grid grid-cols-3 gap-1 border-b border-line p-2">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={cn('flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[0.68rem]', tab === t.id ? 'bg-ink text-white' : 'text-muted hover:bg-secondary hover:text-ink')}>
                <t.icon size={15} strokeWidth={1.5} /> {t.label}
              </button>
            ))}
          </nav>
          <div className="flex-1 overflow-y-auto p-4">{panels[tab]}</div>
        </aside>
        <div className="min-w-0 flex-1">
          <PreviewFrame ref={frame} src={`/?__preview=${themeId}&__mode=draft`} device={device} onReload={reload} openHref={`/?__preview=${themeId}&__mode=draft`} status="Previewing your draft — visitors still see the published version" />
        </div>
      </div>
    </div>
  );
}
