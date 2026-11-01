import { NextResponse } from 'next/server';
import { getCardsByIds, getCardsBySlugs, listProducts } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

const ints = (v: string | null) => (v ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 48);

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  if (sp.get('ids')) return NextResponse.json({ items: await getCardsByIds(ints(sp.get('ids'))) });
  if (sp.get('slugs')) {
    const slugs = (sp.get('slugs') ?? '').split(',').map((s) => s.trim()).filter((s) => /^[a-z0-9-]{1,160}$/.test(s)).slice(0, 24);
    return NextResponse.json({ items: await getCardsBySlugs(slugs) });
  }
  if (sp.get('recommend')) {
    const exclude = new Set(ints(sp.get('exclude')));
    const limit = Math.min(12, Number(sp.get('limit')) || 4);
    const { items } = await listProducts({ sort: 'bestselling', perPage: limit + exclude.size + 2, availability: 'in' });
    return NextResponse.json({ items: items.filter((p) => !exclude.has(p.id)).slice(0, limit) });
  }
  return NextResponse.json({ error: 'Specify ids, slugs or recommend' }, { status: 400 });
}
