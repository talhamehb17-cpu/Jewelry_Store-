import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'aurelle_session';
const PREVIEW_COOKIE = 'aurelle_preview';
const THEME_RE = /^[a-z-]{3,40}$/;

async function sessionRole(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const s = process.env.AUTH_SECRET || (process.env.NODE_ENV !== 'production' ? 'aurelle-dev-only-secret-change-me-0123456789' : '');
  if (!token || !s) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(s), { algorithms: ['HS256'] });
    return String(payload.role ?? 'customer');
  } catch {
    return null;
  }
}

function previewCookieOpts() {
  const crossSite = process.env.COOKIE_CROSS_SITE === '1';
  return {
    httpOnly: true,
    path: '/',
    sameSite: crossSite ? ('none' as const) : ('lax' as const),
    secure: crossSite || process.env.NODE_ENV === 'production',
    partitioned: crossSite || undefined,
  };
}

export async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Theme preview links: /?__preview=<theme>&__mode=draft|published  and  ?__exit_preview=1
  if (searchParams.has('__preview') || searchParams.has('__exit_preview')) {
    const url = req.nextUrl.clone();
    const theme = searchParams.get('__preview') ?? '';
    const mode = searchParams.get('__mode') === 'draft' ? 'draft' : 'published';
    url.searchParams.delete('__preview');
    url.searchParams.delete('__mode');
    url.searchParams.delete('__exit_preview');
    const res = NextResponse.redirect(url);
    if (searchParams.has('__exit_preview') || !THEME_RE.test(theme)) res.cookies.set(PREVIEW_COOKIE, '', { ...previewCookieOpts(), maxAge: 0 });
    else res.cookies.set(PREVIEW_COOKIE, `${theme}:${mode}`, { ...previewCookieOpts(), maxAge: 60 * 60 * 8 });
    return res;
  }

  // Optimistic route protection (authoritative checks also run server-side in layouts/actions)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const role = await sessionRole(req);
    if (role !== 'admin' && role !== 'staff') {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }
  if (pathname.startsWith('/account') && !/^\/account\/(login|register|forgot-password|reset-password)/.test(pathname)) {
    const role = await sessionRole(req);
    if (!role) {
      const url = req.nextUrl.clone();
      url.pathname = '/account/login';
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|images|fonts|videos|favicon.ico|robots.txt|sitemap.xml|api/media).*)'],
};
