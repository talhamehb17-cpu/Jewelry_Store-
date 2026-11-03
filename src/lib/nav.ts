export type NavNode = { href: string; children?: { href: string }[] | null };

function norm(href: string) {
  const base = (href || '/').split('?')[0]?.split('#')[0] || '/';
  return base.length > 1 && base.endsWith('/') ? base.slice(0, -1) : base;
}

/**
 * One nav item owns the current URL. A longer match wins, so
 * /collections/new-arrivals highlights New Arrivals, not Collections,
 * and a dropdown child highlights its parent only when no sibling is closer.
 */
export function activeNavHref(pathname: string, items: NavNode[]): string | null {
  const path = norm(pathname);
  let best: { owner: string; score: number } | null = null;
  for (const item of items) {
    const owned = [item.href, ...(item.children?.map((c) => c.href) ?? [])];
    for (const href of owned) {
      const h = norm(href);
      const exact = path === h;
      const prefix = h !== '/' && path.startsWith(`${h}/`);
      if (!exact && !prefix) continue;
      const score = h.length * 10 + (exact ? 6 : 0);
      if (!best || score > best.score) best = { owner: item.href, score };
    }
  }
  return best?.owner ?? null;
}

export function isNavActive(pathname: string, href: string, items: NavNode[]) {
  return activeNavHref(pathname, items) === norm(href) || activeNavHref(pathname, items) === href;
}
