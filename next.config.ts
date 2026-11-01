import type { NextConfig } from 'next';

const onVercel = !!process.env.VERCEL;

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  // Clickjacking protection in production (the sandbox preview embeds the site in an iframe, so only on Vercel).
  ...(onVercel
    ? [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ['@electric-sql/pglite'],
  allowedDevOrigins: ['*.e2b.app', '**.e2b.app'],
  experimental: {
    serverActions: {
      allowedOrigins: ['*.e2b.app', '**.e2b.app'],
      bodySizeLimit: '4mb',
    },
  },
  outputFileTracingIncludes: {
    '/**': ['./drizzle/**/*'],
  },
  images: {
    qualities: [70, 80, 90],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400,
    localPatterns: [{ pathname: '/images/**', search: '' }],
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      { source: '/images/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/videos/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ];
  },
  async redirects() {
    return [
      { source: '/pages/about', destination: '/about', permanent: true },
      { source: '/pages/contact', destination: '/contact', permanent: true },
      { source: '/pages/faq', destination: '/faq', permanent: true },
      { source: '/products', destination: '/shop', permanent: false },
    ];
  },
};

export default nextConfig;
