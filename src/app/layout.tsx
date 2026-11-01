import type { Metadata, Viewport } from 'next';
import { fontVariables } from '@/themes/fonts';
import { siteUrl } from '@/lib/utils';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Maison Aurelle — Fine Jewelry Made for Your Moments',
    template: '%s · Maison Aurelle',
  },
  description:
    'Timeless fine jewelry designed in Lahore — 18k gold vermeil, freshwater pearls and lab-grown diamonds. Cash on Delivery, EasyPaisa, JazzCash and bank transfer, with free shipping over Rs 10,000.',
  applicationName: 'Maison Aurelle',
  openGraph: {
    type: 'website',
    siteName: 'Maison Aurelle',
    locale: 'en_PK',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630, alt: 'Maison Aurelle fine jewelry' }],
  },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FBF7F1',
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
