/** Public storefront URL for a CMS page. */
export function publicPath(slug: string, template: string) {
  return slug === 'about' ? '/about' : slug === 'contact' ? '/contact' : slug === 'faq' ? '/faq' : template === 'policy' ? `/policies/${slug}` : `/pages/${slug}`;
}
