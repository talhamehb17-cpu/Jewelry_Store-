import localFont from 'next/font/local';

/*
 * Self-hosted font library (SIL Open Font License, via Fontsource). Fonts are declared with
 * preload:false so the browser only downloads the families the active theme actually uses.
 */

const cormorant = localFont({
  src: [
    { path: '../fonts/cormorant-garamond-latin-wght-normal.woff2', weight: '300 700', style: 'normal' },
    { path: '../fonts/cormorant-garamond-latin-wght-italic.woff2', weight: '300 700', style: 'italic' },
  ],
  variable: '--ff-cormorant',
  display: 'swap',
  preload: false,
  fallback: ['Georgia', 'serif'],
});
const playfair = localFont({
  src: [
    { path: '../fonts/playfair-display-latin-wght-normal.woff2', weight: '400 900', style: 'normal' },
    { path: '../fonts/playfair-display-latin-wght-italic.woff2', weight: '400 900', style: 'italic' },
  ],
  variable: '--ff-playfair',
  display: 'swap',
  preload: false,
  fallback: ['Georgia', 'serif'],
});
const bodoni = localFont({
  src: [
    { path: '../fonts/bodoni-moda-latin-wght-normal.woff2', weight: '400 900', style: 'normal' },
    { path: '../fonts/bodoni-moda-latin-wght-italic.woff2', weight: '400 900', style: 'italic' },
  ],
  variable: '--ff-bodoni',
  display: 'swap',
  preload: false,
  fallback: ['Didot', 'Georgia', 'serif'],
});
const baskerville = localFont({
  src: [
    { path: '../fonts/libre-baskerville-latin-wght-normal.woff2', weight: '400 700', style: 'normal' },
    { path: '../fonts/libre-baskerville-latin-wght-italic.woff2', weight: '400 700', style: 'italic' },
  ],
  variable: '--ff-baskerville',
  display: 'swap',
  preload: false,
  fallback: ['Baskerville', 'Georgia', 'serif'],
});
const ebgaramond = localFont({
  src: [
    { path: '../fonts/eb-garamond-latin-wght-normal.woff2', weight: '400 800', style: 'normal' },
    { path: '../fonts/eb-garamond-latin-wght-italic.woff2', weight: '400 800', style: 'italic' },
  ],
  variable: '--ff-ebgaramond',
  display: 'swap',
  preload: false,
  fallback: ['Garamond', 'Georgia', 'serif'],
});
const fraunces = localFont({
  src: [
    { path: '../fonts/fraunces-latin-wght-normal.woff2', weight: '100 900', style: 'normal' },
    { path: '../fonts/fraunces-latin-wght-italic.woff2', weight: '100 900', style: 'italic' },
  ],
  variable: '--ff-fraunces',
  display: 'swap',
  preload: false,
  fallback: ['Georgia', 'serif'],
});
const instrument = localFont({
  src: [
    { path: '../fonts/instrument-serif-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/instrument-serif-latin-400-italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--ff-instrument',
  display: 'swap',
  preload: false,
  fallback: ['Georgia', 'serif'],
});
const dmserif = localFont({
  src: [
    { path: '../fonts/dm-serif-display-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/dm-serif-display-latin-400-italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--ff-dmserif',
  display: 'swap',
  preload: false,
  fallback: ['Georgia', 'serif'],
});
const marcellus = localFont({
  src: '../fonts/marcellus-latin-400-normal.woff2',
  weight: '400',
  variable: '--ff-marcellus',
  display: 'swap',
  preload: false,
  fallback: ['Georgia', 'serif'],
});
const italiana = localFont({
  src: '../fonts/italiana-latin-400-normal.woff2',
  weight: '400',
  variable: '--ff-italiana',
  display: 'swap',
  preload: false,
  fallback: ['Georgia', 'serif'],
});
const tenor = localFont({
  src: '../fonts/tenor-sans-latin-400-normal.woff2',
  weight: '400',
  variable: '--ff-tenor',
  display: 'swap',
  preload: false,
  fallback: ['Helvetica Neue', 'Arial', 'sans-serif'],
});
const inter = localFont({
  src: '../fonts/inter-latin-wght-normal.woff2',
  weight: '100 900',
  variable: '--ff-inter',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'Helvetica Neue', 'Arial', 'sans-serif'],
});
const intertight = localFont({
  src: '../fonts/inter-tight-latin-wght-normal.woff2',
  weight: '100 900',
  variable: '--ff-intertight',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'Helvetica Neue', 'Arial', 'sans-serif'],
});
const dmsans = localFont({
  src: '../fonts/dm-sans-latin-wght-normal.woff2',
  weight: '100 1000',
  variable: '--ff-dmsans',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'Helvetica Neue', 'Arial', 'sans-serif'],
});
const montserrat = localFont({
  src: '../fonts/montserrat-latin-wght-normal.woff2',
  weight: '100 900',
  variable: '--ff-montserrat',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'Helvetica Neue', 'Arial', 'sans-serif'],
});
const figtree = localFont({
  src: '../fonts/figtree-latin-wght-normal.woff2',
  weight: '300 900',
  variable: '--ff-figtree',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'Helvetica Neue', 'Arial', 'sans-serif'],
});
const karla = localFont({
  src: '../fonts/karla-latin-wght-normal.woff2',
  weight: '200 800',
  variable: '--ff-karla',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'Helvetica Neue', 'Arial', 'sans-serif'],
});
const jost = localFont({
  src: '../fonts/jost-latin-wght-normal.woff2',
  weight: '100 900',
  variable: '--ff-jost',
  display: 'swap',
  preload: false,
  fallback: ['Futura', 'system-ui', 'Arial', 'sans-serif'],
});
const manrope = localFont({
  src: '../fonts/manrope-latin-wght-normal.woff2',
  weight: '200 800',
  variable: '--ff-manrope',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'Helvetica Neue', 'Arial', 'sans-serif'],
});
const outfit = localFont({
  src: '../fonts/outfit-latin-wght-normal.woff2',
  weight: '100 900',
  variable: '--ff-outfit',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'Helvetica Neue', 'Arial', 'sans-serif'],
});
const syne = localFont({
  src: '../fonts/syne-latin-wght-normal.woff2',
  weight: '400 800',
  variable: '--ff-syne',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'Helvetica Neue', 'Arial', 'sans-serif'],
});
const spacegrotesk = localFont({
  src: '../fonts/space-grotesk-latin-wght-normal.woff2',
  weight: '300 700',
  variable: '--ff-spacegrotesk',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'Helvetica Neue', 'Arial', 'sans-serif'],
});

export const fontVariables = [
  cormorant, playfair, bodoni, baskerville, ebgaramond, fraunces, instrument, dmserif, marcellus, italiana,
  tenor, inter, intertight, dmsans, montserrat, figtree, karla, jost, manrope, outfit, syne, spacegrotesk,
]
  .map((f) => f.variable)
  .join(' ');
