import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Img } from '@/components/ui/img';
import { getPage } from '@/lib/pages';
import { renderMarkdown } from '@/lib/markdown';
import { IMG } from '@/lib/images';

export async function generateMetadata(): Promise<Metadata> {
  const p = await getPage('about');
  return { title: p?.seoTitle || 'Our Story', description: p?.seoDescription ?? undefined, alternates: { canonical: '/about' } };
}

export default async function AboutPage() {
  const page = await getPage('about');
  if (!page) notFound();
  return (
    <>
      <section className="relative flex min-h-[62vh] items-end overflow-hidden">
        <Img src={IMG.heroMain} alt="Maison Aurelle" sizes="100vw" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
        <div className="container-x relative pb-14 text-white">
          <p className="mb-3 text-[0.72rem] uppercase tracking-[0.3em] text-white/80">Maison Aurelle · Est. 2019</p>
          <h1 className="t-display max-w-3xl">{page.title}</h1>
        </div>
      </section>
      <section className="section-y container-x">
        <div className="grid gap-14 md:grid-cols-[1fr_1.3fr]">
          <div className="space-y-4 md:sticky md:top-28 md:self-start">
            <div className="relative aspect-[4/5] overflow-hidden rounded-theme-sm bg-surface"><Img src={IMG.aurelia2} alt="" sizes="40vw" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative aspect-square overflow-hidden rounded-theme-sm bg-surface"><Img src={IMG.crescent1} alt="" sizes="20vw" /></div>
              <div className="relative aspect-square overflow-hidden rounded-theme-sm bg-surface"><Img src={IMG.celestine1} alt="" sizes="20vw" /></div>
            </div>
          </div>
          <div>
            <div className="prose-aurelle" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }} />
            <dl className="mt-12 grid grid-cols-3 gap-6 border-y border-line py-8">
              {[['2019', 'Founded in Lahore'], ['12k+', 'Pieces delivered'], ['4.9★', 'Average rating']].map(([v, l]) => (
                <div key={l}><dt className="font-heading text-[2rem] leading-none">{v}</dt><dd className="mt-2 text-[0.72rem] uppercase tracking-[0.14em] text-muted">{l}</dd></div>
              ))}
            </dl>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/shop" className="btn btn-primary">Shop the collection</Link>
              <Link href="/contact" className="btn btn-secondary">Book an appointment</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
