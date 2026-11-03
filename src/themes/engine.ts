import { FONT_LIST, type FontKey } from './font-list';
import { THEMES, DEFAULT_THEME } from './presets';
import { THEME_IDS, SECTION_TYPES, type SectionInstance, type ThemeColors, type ThemeConfig, type ThemeId, type ThemeSettings } from './types';

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === 'string' && (THEME_IDS as readonly string[]).includes(v);
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);

/** Deep merge where `override` wins; arrays are replaced, not merged. */
export function deepMerge<T>(base: T, override: unknown): T {
  if (!isObj(base) || !isObj(override)) return (override === undefined ? base : (override as T));
  const out: Obj = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (v === undefined) continue;
    const b = (base as Obj)[k];
    out[k] = isObj(b) && isObj(v) ? deepMerge(b, v) : v;
  }
  return out as T;
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const num = (v: unknown, def: number, min: number, max: number) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};
const pick = <T extends string | number>(v: unknown, allowed: readonly T[], def: T): T => (allowed.includes(v as T) ? (v as T) : def);
const str = (v: unknown, def: string, max = 200) => (typeof v === 'string' ? v.slice(0, max) : def);
const font = (v: unknown, def: FontKey): FontKey => (typeof v === 'string' && v in FONT_LIST ? (v as FontKey) : def);

/** Coerces arbitrary (possibly user-edited) settings into a safe, complete ThemeSettings object. */
export function sanitizeSettings(input: unknown, themeId: ThemeId): ThemeSettings {
  const d = THEMES[themeId].settings;
  const s = deepMerge(d, input) as ThemeSettings;
  const colors = { ...d.colors };
  for (const key of Object.keys(d.colors) as (keyof typeof d.colors)[]) {
    const v = (s.colors as unknown as Record<string, unknown>)?.[key];
    colors[key] = typeof v === 'string' && HEX.test(v.trim()) ? v.trim() : d.colors[key];
  }
  const t = s.typography;
  const l = s.layout;
  const b = s.buttons;
  const h = s.header;
  const f = s.footer;
  const m = s.mobile;
  const a = s.announcement;
  return {
    colors,
    typography: {
      headingFont: font(t.headingFont, d.typography.headingFont),
      bodyFont: font(t.bodyFont, d.typography.bodyFont),
      navFont: font(t.navFont, d.typography.navFont),
      accentFont: font(t.accentFont, d.typography.accentFont),
      baseSize: num(t.baseSize, d.typography.baseSize, 12, 20),
      headingScale: num(t.headingScale, d.typography.headingScale, 0.7, 1.6),
      headingWeight: num(t.headingWeight, d.typography.headingWeight, 100, 900),
      bodyWeight: num(t.bodyWeight, d.typography.bodyWeight, 200, 700),
      headingTracking: num(t.headingTracking, d.typography.headingTracking, -0.08, 0.3),
      headingCase: pick(t.headingCase, ['none', 'uppercase'] as const, d.typography.headingCase),
      navTracking: num(t.navTracking, d.typography.navTracking, -0.05, 0.4),
      navCase: pick(t.navCase, ['none', 'uppercase'] as const, d.typography.navCase),
      navSize: num(t.navSize, d.typography.navSize, 10, 20),
      lineHeight: num(t.lineHeight, d.typography.lineHeight, 1.2, 2.2),
    },
    layout: {
      containerWidth: num(l.containerWidth, d.layout.containerWidth, 960, 1800),
      sectionSpacing: num(l.sectionSpacing, d.layout.sectionSpacing, 32, 220),
      gridColumns: pick(Number(l.gridColumns) as 3 | 4 | 5, [3, 4, 5] as const, d.layout.gridColumns),
      gridGap: num(l.gridGap, d.layout.gridGap, 0, 64),
      radius: num(l.radius, d.layout.radius, 0, 40),
      imageRatio: pick(l.imageRatio, ['square', 'portrait', 'tall'] as const, d.layout.imageRatio),
      cardVariant: pick(l.cardVariant, ['classic', 'minimal', 'rounded', 'noir', 'editorial', 'framed', 'nordic', 'arch', 'luxe', 'overlay'] as const, d.layout.cardVariant),
      pdpVariant: pick(l.pdpVariant, ['thumbs-left', 'grid', 'carousel', 'stacked', 'asymmetric'] as const, d.layout.pdpVariant),
      pdpStyle: pick(l.pdpStyle, ['soft', 'minimal', 'boutique', 'noir', 'editorial', 'heritage', 'nordic', 'romantic', 'luxe', 'bold'] as const, d.layout.pdpStyle),
      collectionVariant: pick(l.collectionVariant, ['sidebar', 'topbar', 'drawer', 'banner'] as const, d.layout.collectionVariant),
    },
    buttons: {
      shape: pick(b.shape, ['square', 'soft', 'rounded', 'pill'] as const, d.buttons.shape),
      style: pick(b.style, ['solid', 'outline'] as const, d.buttons.style),
      hover: pick(b.hover, ['darken', 'lift', 'fill', 'shine', 'invert', 'arrow'] as const, d.buttons.hover),
      uppercase: typeof b.uppercase === 'boolean' ? b.uppercase : d.buttons.uppercase,
      tracking: num(b.tracking, d.buttons.tracking, 0, 0.4),
      size: pick(b.size, ['sm', 'md', 'lg'] as const, d.buttons.size),
      weight: num(b.weight, d.buttons.weight, 300, 800),
    },
    header: {
      variant: pick(h.variant, ['centered', 'inline', 'boutique', 'split', 'masthead', 'heritage', 'menu', 'parisian', 'luxe', 'floating'] as const, d.header.variant),
      sticky: typeof h.sticky === 'boolean' ? h.sticky : d.header.sticky,
      transparentOnHome: typeof h.transparentOnHome === 'boolean' ? h.transparentOnHome : d.header.transparentOnHome,
      logoText: str(h.logoText, d.header.logoText, 40),
      logoTagline: str(h.logoTagline, d.header.logoTagline, 80),
      logoImage: str(h.logoImage, '', 500),
      logoSize: num(h.logoSize, d.header.logoSize, 14, 96),
      borderBottom: typeof h.borderBottom === 'boolean' ? h.borderBottom : d.header.borderBottom,
    },
    footer: {
      variant: pick(f.variant, ['soft', 'minimal', 'boutique', 'noir', 'editorial', 'heritage', 'nordic', 'parisian', 'glamour', 'bento'] as const, d.footer.variant),
      tagline: str(f.tagline, d.footer.tagline, 200),
      showNewsletter: typeof f.showNewsletter === 'boolean' ? f.showNewsletter : d.footer.showNewsletter,
      showSocial: typeof f.showSocial === 'boolean' ? f.showSocial : d.footer.showSocial,
      showPayments: typeof f.showPayments === 'boolean' ? f.showPayments : d.footer.showPayments,
    },
    announcement: {
      enabled: typeof a.enabled === 'boolean' ? a.enabled : d.announcement.enabled,
      style: pick(a.style, ['rotate', 'marquee', 'static'] as const, d.announcement.style),
      messages: Array.isArray(a.messages)
        ? a.messages
            .filter((x) => x && typeof x.text === 'string' && x.text.trim())
            .slice(0, 8)
            .map((x) => ({ text: x.text.slice(0, 160), link: typeof x.link === 'string' ? x.link.slice(0, 300) : '' }))
        : d.announcement.messages,
    },
    mobile: {
      baseSize: num(m.baseSize, d.mobile.baseSize, 12, 19),
      sectionSpacing: num(m.sectionSpacing, d.mobile.sectionSpacing, 24, 160),
      gridColumns: pick(Number(m.gridColumns) as 1 | 2, [1, 2] as const, d.mobile.gridColumns),
      heroHeight: pick(m.heroHeight, ['auto', '60', '75', '90', '100'] as const, d.mobile.heroHeight),
      headerVariant: pick(m.headerVariant, ['center', 'left'] as const, d.mobile.headerVariant),
      stickyAtc: typeof m.stickyAtc === 'boolean' ? m.stickyAtc : d.mobile.stickyAtc,
      showAnnouncement: typeof m.showAnnouncement === 'boolean' ? m.showAnnouncement : d.mobile.showAnnouncement,
      containerPadding: num(m.containerPadding, d.mobile.containerPadding, 8, 48),
    },
    animation: {
      style: pick(s.animation?.style, ['fade-up', 'fade', 'scale', 'reveal', 'rise', 'slow', 'blur', 'slide', 'none'] as const, d.animation.style),
      speed: num(s.animation?.speed, d.animation.speed, 150, 2500),
    },
  };
}

export function sanitizeSections(input: unknown, themeId: ThemeId): SectionInstance[] {
  if (!Array.isArray(input)) return structuredClone(THEMES[themeId].sections);
  return input
    .filter((s): s is SectionInstance => isObj(s) && (SECTION_TYPES as readonly string[]).includes(String((s as Obj).type)))
    .slice(0, 40)
    .map((s, i) => ({
      id: typeof s.id === 'string' && s.id ? s.id.slice(0, 60) : `${s.type}-${i}`,
      type: s.type,
      enabled: s.enabled !== false,
      visibility: pick(s.visibility, ['all', 'desktop', 'mobile'] as const, 'all'),
      variant: typeof s.variant === 'string' ? s.variant.slice(0, 40) : 'default',
      settings: isObj(s.settings) ? s.settings : {},
    }));
}

/** Resolves a stored (possibly partial / outdated) config into a complete, safe ThemeConfig. */
export function resolveThemeConfig(themeId: ThemeId, stored?: Partial<ThemeConfig> | null): ThemeConfig {
  return {
    settings: sanitizeSettings(stored?.settings ?? {}, themeId),
    sections: stored?.sections ? sanitizeSections(stored.sections, themeId) : structuredClone(THEMES[themeId].sections),
  };
}

export function defaultThemeConfig(themeId: ThemeId): ThemeConfig {
  return { settings: structuredClone(THEMES[themeId].settings), sections: structuredClone(THEMES[themeId].sections) };
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n) || full.length < 6) return { r: 0, g: 0, b: 0 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
function mixHex(a: string, b: string, t: number) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const ch = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[ch(A.r, B.r), ch(A.g, B.g), ch(A.b, B.b)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

/** Stops a dark theme from collapsing into one black mass, and a light theme from losing its type. */
function ensureContrast(colors: ThemeColors): ThemeColors {
  const out = { ...colors };
  const bg = luminance(out.background);
  const text = luminance(out.text);
  if (Math.abs(bg - text) < 0.42) out.text = bg < 0.45 ? '#F7F1E6' : '#1C1917';
  if (bg < 0.22) {
    if (luminance(out.surface) < bg + 0.06) out.surface = mixHex(out.background, '#F7F1E6', 0.14);
    if (luminance(out.secondary) < bg + 0.08) out.secondary = mixHex(out.background, '#F7F1E6', 0.2);
    if (luminance(out.border) < 0.32) out.border = mixHex(out.background, out.accent || '#C9A96E', 0.62);
    if (luminance(out.muted) < 0.55) out.muted = mixHex(out.text, out.accent || '#E4C98A', 0.35);
    if (luminance(out.headerBg) < 0.08) out.headerBg = mixHex(out.background, '#F7F1E6', 0.06);
    if (Math.abs(luminance(out.headerText) - luminance(out.headerBg)) < 0.4) out.headerText = '#F7F1E6';
    if (Math.abs(luminance(out.footerText) - luminance(out.footerBg)) < 0.4) out.footerText = '#F7F1E6';
    if (luminance(out.primary) < 0.35) out.primary = '#C9A96E';
    if (luminance(out.primaryText) > 0.55) out.primaryText = '#14110E';
  } else if (bg > 0.82 && luminance(out.text) > 0.62) {
    out.text = '#1C1917';
  }
  if (Math.abs(luminance(out.surface) - bg) < 0.03) {
    out.surface = bg < 0.5 ? mixHex(out.background, '#F7F1E6', 0.12) : mixHex(out.background, '#1C1917', 0.05);
  }
  return out;
}

const RATIO = { square: '1 / 1', portrait: '4 / 5', tall: '3 / 4' } as const;
const BTN_RADIUS = { square: '0px', soft: '4px', rounded: '10px', pill: '999px' } as const;
const BTN_SIZE = {
  sm: { py: '0.65rem', px: '1.25rem', fs: '0.72rem' },
  md: { py: '0.95rem', px: '1.9rem', fs: '0.78rem' },
  lg: { py: '1.15rem', px: '2.4rem', fs: '0.82rem' },
} as const;

/** CSS custom properties for the storefront. All values pass through sanitizeSettings first. */
export function themeCssVars(s: ThemeSettings): { desktop: Record<string, string>; mobile: Record<string, string> } {
  const c = ensureContrast(s.colors);
  const t = s.typography;
  const l = s.layout;
  const b = s.buttons;
  const size = BTN_SIZE[b.size];
  const desktop: Record<string, string> = {
    '--c-bg': c.background,
    '--c-surface': c.surface,
    '--c-text': c.text,
    '--c-muted': c.muted,
    '--c-primary': c.primary,
    '--c-primary-text': c.primaryText,
    '--c-secondary': c.secondary,
    '--c-accent': c.accent,
    '--c-border': c.border,
    '--c-sale': c.sale,
    '--c-header-bg': c.headerBg,
    '--c-header-text': c.headerText,
    '--c-footer-bg': c.footerBg,
    '--c-footer-text': c.footerText,
    '--c-ann-bg': c.announcementBg,
    '--c-ann-text': c.announcementText,
    '--f-heading': FONT_LIST[t.headingFont].css,
    '--f-body': FONT_LIST[t.bodyFont].css,
    '--f-nav': FONT_LIST[t.navFont].css,
    '--f-accent': FONT_LIST[t.accentFont].css,
    '--fs-base': `${t.baseSize}px`,
    '--h-scale': String(t.headingScale),
    '--h-weight': String(t.headingWeight),
    '--b-weight': String(t.bodyWeight),
    '--h-tracking': `${t.headingTracking}em`,
    '--h-case': t.headingCase,
    '--nav-tracking': `${t.navTracking}em`,
    '--nav-case': t.navCase,
    '--nav-size': `${t.navSize}px`,
    '--lh': String(t.lineHeight),
    '--container': `${l.containerWidth}px`,
    '--section-y': `${l.sectionSpacing}px`,
    '--grid-cols': String(l.gridColumns),
    '--grid-gap': `${l.gridGap}px`,
    '--radius': `${l.radius}px`,
    '--img-ratio': RATIO[l.imageRatio],
    '--btn-radius': BTN_RADIUS[b.shape],
    '--btn-tracking': `${b.tracking}em`,
    '--btn-case': b.uppercase ? 'uppercase' : 'none',
    '--btn-weight': String(b.weight),
    '--btn-py': size.py,
    '--btn-px': size.px,
    '--btn-fs': size.fs,
    '--anim-speed': `${s.animation.speed}ms`,
    '--logo-size': `${s.header.logoSize}px`,
    '--pad-x': '40px',
  };
  const mobile: Record<string, string> = {
    '--fs-base': `${s.mobile.baseSize}px`,
    '--section-y': `${s.mobile.sectionSpacing}px`,
    '--grid-cols': String(s.mobile.gridColumns),
    '--pad-x': `${s.mobile.containerPadding}px`,
    '--grid-gap': `${Math.min(l.gridGap, 16)}px`,
    '--logo-size': `${Math.round(Math.min(s.header.logoSize, 40) * 0.8)}px`,
  };
  return { desktop, mobile };
}

export function themeStyleTag(s: ThemeSettings, scope = ':root'): string {
  const { desktop, mobile } = themeCssVars(s);
  const decl = (o: Record<string, string>) =>
    Object.entries(o)
      .map(([k, v]) => `${k}:${v.replace(/[<>{};]/g, '')};`)
      .join('');
  return `${scope}{${decl(desktop)}}@media (max-width: 767px){${scope}{${decl(mobile)}}}`;
}

export function themeName(id: ThemeId) {
  return THEMES[id]?.name ?? THEMES[DEFAULT_THEME].name;
}
