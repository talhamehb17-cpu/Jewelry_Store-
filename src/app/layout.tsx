import type { Metadata, Viewport } from 'next';
import { fontVariables } from '@/themes/fonts';
import { siteUrl } from '@/lib/utils';
import { BRAND } from '@/lib/brand';
import { LOOK } from '@/lib/look';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description:
    'Handpicked jewellery designed in Lahore — 18k gold vermeil, freshwater pearls and lab-grown diamonds. Cash on Delivery, EasyPaisa, JazzCash and bank transfer, with free shipping over Rs 10,000.',
  applicationName: BRAND.name,
  icons: { icon: BRAND.logo, apple: '/images/brand/logo-180.png' },
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    locale: 'en_PK',
    images: [{ url: LOOK.hero, width: 1376, height: 768, alt: 'Gold necklace and pearl earrings in window light' }],
  },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FBF7F1',
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
