/** Client-safe font catalogue (labels + CSS variables) used by the theme engine and the customizer. */
export const FONT_LIST = {
  cormorant: { label: 'Cormorant Garamond', css: 'var(--ff-cormorant)', kind: 'serif' },
  playfair: { label: 'Playfair Display', css: 'var(--ff-playfair)', kind: 'serif' },
  bodoni: { label: 'Bodoni Moda', css: 'var(--ff-bodoni)', kind: 'serif' },
  baskerville: { label: 'Libre Baskerville', css: 'var(--ff-baskerville)', kind: 'serif' },
  ebgaramond: { label: 'EB Garamond', css: 'var(--ff-ebgaramond)', kind: 'serif' },
  fraunces: { label: 'Fraunces', css: 'var(--ff-fraunces)', kind: 'serif' },
  instrument: { label: 'Instrument Serif', css: 'var(--ff-instrument)', kind: 'serif' },
  dmserif: { label: 'DM Serif Display', css: 'var(--ff-dmserif)', kind: 'serif' },
  marcellus: { label: 'Marcellus', css: 'var(--ff-marcellus)', kind: 'serif' },
  italiana: { label: 'Italiana', css: 'var(--ff-italiana)', kind: 'serif' },
  tenor: { label: 'Tenor Sans', css: 'var(--ff-tenor)', kind: 'sans' },
  inter: { label: 'Inter', css: 'var(--ff-inter)', kind: 'sans' },
  intertight: { label: 'Inter Tight', css: 'var(--ff-intertight)', kind: 'sans' },
  dmsans: { label: 'DM Sans', css: 'var(--ff-dmsans)', kind: 'sans' },
  montserrat: { label: 'Montserrat', css: 'var(--ff-montserrat)', kind: 'sans' },
  figtree: { label: 'Figtree', css: 'var(--ff-figtree)', kind: 'sans' },
  karla: { label: 'Karla', css: 'var(--ff-karla)', kind: 'sans' },
  jost: { label: 'Jost', css: 'var(--ff-jost)', kind: 'sans' },
  manrope: { label: 'Manrope', css: 'var(--ff-manrope)', kind: 'sans' },
  outfit: { label: 'Outfit', css: 'var(--ff-outfit)', kind: 'sans' },
  syne: { label: 'Syne', css: 'var(--ff-syne)', kind: 'sans' },
  spacegrotesk: { label: 'Space Grotesk', css: 'var(--ff-spacegrotesk)', kind: 'sans' },
} as const;

export type FontKey = keyof typeof FONT_LIST;
export const FONT_KEYS = Object.keys(FONT_LIST) as FontKey[];
