import type { FontKey } from './font-list';

export const THEME_IDS = [
  'soft-luxury',
  'modern-minimal',
  'rose-boutique',
  'dark-luxury',
  'editorial',
  'old-money',
  'scandinavian',
  'parisian',
  'golden-glamour',
  'contemporary',
  'glassmorphism',
  'neumorphism',
] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export type HeaderVariant =
  | 'centered'
  | 'inline'
  | 'boutique'
  | 'split'
  | 'masthead'
  | 'heritage'
  | 'menu'
  | 'parisian'
  | 'luxe'
  | 'floating';
export type FooterVariant =
  | 'soft'
  | 'minimal'
  | 'boutique'
  | 'noir'
  | 'editorial'
  | 'heritage'
  | 'nordic'
  | 'parisian'
  | 'glamour'
  | 'bento';
export type CardVariant =
  | 'classic'
  | 'minimal'
  | 'rounded'
  | 'noir'
  | 'editorial'
  | 'framed'
  | 'nordic'
  | 'arch'
  | 'luxe'
  | 'overlay';
export type PdpVariant = 'thumbs-left' | 'grid' | 'carousel' | 'stacked' | 'asymmetric';
export type CollectionVariant = 'sidebar' | 'topbar' | 'drawer' | 'banner';
export type AnimationStyle = 'fade-up' | 'fade' | 'scale' | 'reveal' | 'rise' | 'slow' | 'blur' | 'slide' | 'none';

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  muted: string;
  primary: string;
  primaryText: string;
  secondary: string;
  accent: string;
  border: string;
  sale: string;
  headerBg: string;
  headerText: string;
  footerBg: string;
  footerText: string;
  announcementBg: string;
  announcementText: string;
}

export interface ThemeTypography {
  headingFont: FontKey;
  bodyFont: FontKey;
  navFont: FontKey;
  accentFont: FontKey;
  baseSize: number; // px
  headingScale: number; // multiplier for display sizes
  headingWeight: number;
  bodyWeight: number;
  headingTracking: number; // em
  headingCase: 'none' | 'uppercase';
  navTracking: number; // em
  navCase: 'none' | 'uppercase';
  navSize: number; // px
  lineHeight: number;
}

export interface ThemeLayout {
  containerWidth: number; // px
  sectionSpacing: number; // px (desktop)
  gridColumns: 3 | 4 | 5;
  gridGap: number; // px
  radius: number; // px
  imageRatio: 'square' | 'portrait' | 'tall';
  cardVariant: CardVariant;
  pdpVariant: PdpVariant;
  pdpStyle: 'soft' | 'minimal' | 'boutique' | 'noir' | 'editorial' | 'heritage' | 'nordic' | 'romantic' | 'luxe' | 'bold';
  collectionVariant: CollectionVariant;
}

export interface ThemeButtons {
  shape: 'square' | 'soft' | 'rounded' | 'pill';
  style: 'solid' | 'outline';
  hover: 'darken' | 'lift' | 'fill' | 'shine' | 'invert' | 'arrow';
  uppercase: boolean;
  tracking: number; // em
  size: 'sm' | 'md' | 'lg';
  weight: number;
}

export interface ThemeHeader {
  variant: HeaderVariant;
  sticky: boolean;
  transparentOnHome: boolean;
  logoText: string;
  logoTagline: string;
  logoImage: string;
  logoSize: number; // px
  borderBottom: boolean;
}

export interface ThemeFooter {
  variant: FooterVariant;
  tagline: string;
  showNewsletter: boolean;
  showSocial: boolean;
  showPayments: boolean;
}

export interface ThemeAnnouncement {
  enabled: boolean;
  style: 'rotate' | 'marquee' | 'static';
  messages: { text: string; link?: string }[];
}

export interface ThemeMobile {
  baseSize: number;
  sectionSpacing: number;
  gridColumns: 1 | 2;
  heroHeight: 'auto' | '60' | '75' | '90' | '100';
  headerVariant: 'center' | 'left';
  stickyAtc: boolean;
  showAnnouncement: boolean;
  containerPadding: number;
}

export interface ThemeAnimation {
  style: AnimationStyle;
  speed: number; // ms
}

export interface ThemeSettings {
  colors: ThemeColors;
  typography: ThemeTypography;
  layout: ThemeLayout;
  buttons: ThemeButtons;
  header: ThemeHeader;
  footer: ThemeFooter;
  announcement: ThemeAnnouncement;
  mobile: ThemeMobile;
  animation: ThemeAnimation;
}

export const SECTION_TYPES = [
  'hero',
  'categories',
  'featured-collections',
  'product-grid',
  'brand-story',
  'image-banner',
  'image-text',
  'complete-the-look',
  'testimonials',
  'instagram',
  'newsletter',
  'rich-text',
  'video',
  'faq',
  'trust-badges',
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SectionSettings = Record<string, any>;

export interface SectionInstance {
  id: string;
  type: SectionType;
  enabled: boolean;
  visibility: 'all' | 'desktop' | 'mobile';
  variant: string;
  settings: SectionSettings;
}

export interface ThemeConfig {
  settings: ThemeSettings;
  sections: SectionInstance[];
}

export interface ThemeDefinition extends ThemeConfig {
  id: ThemeId;
  name: string;
  tagline: string;
  description: string;
  mood: string[];
}
