import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/utils';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/checkout', '/cart', '/wishlist', '/unsubscribe', '/api/', '/search'] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
