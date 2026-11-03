import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Img } from '@/components/ui/img';
import { getPage } from '@/lib/pages';
import { renderMarkdown } from '@/lib/markdown';
import { BRAND } from '@/lib/brand';

export async function generateMetadata(): Promise<Metadata> {
  const p = await getPage('about');
  return { title: p?.seoTitle || 'Our Story', description: p?.seoDescription ?? undefined, alternates: { canonical: '/about' } };
}

export default async function AboutPage() {
  const page = await getPage('about');
  if (!page) notFound();
  return (
    <>
      <section className="border-b border-line">
        <div className="container-x grid items-end gap-8 py-10 md:grid-cols-[1.1fr_0.9fr] md:py-16">
          <div>
            <p className="eyebrow mb-4">Evermoon Jewels · Lahore</p>
            <h1 className="t-display max-w-xl text-balance">{page.title}</h1>
            <p className="mt-5 max-w-md text-[1.05rem] leading-relaxed text-muted">Wear your little wonder. Pretty jewellery, handpicked and finished to be worn every day.</p>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-theme-sm bg-surface">
            <Img src={BRAND.campaign} alt="Evermoon Jewels campaign — jewellery in afternoon light" sizes="(max-width:768px) 100vw, 45vw" priority className="!object-cover !object-[center_30%]" />
          </div>
        </div>
      </section>
      <section className="section-y container-x">
        <div className="grid gap-14 md:grid-cols-[1fr_1.3fr]">
          <div className="space-y-4 md:sticky md:top-28 md:self-start">
            <div className="relative aspect-[4/5] max-h-[70svh] overflow-hidden rounded-theme-sm bg-surface md:max-h-none"><Img src={BRAND.jewelry} alt="Evermoon jewellery on stone" sizes="40vw" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative aspect-square overflow-hidden rounded-theme-sm bg-surface"><Img src={BRAND.tray} alt="Pearl flower earrings and a fine chain" sizes="20vw" /></div>
              <div className="relative aspect-square overflow-hidden rounded-theme-sm bg-surface"><Img src={BRAND.bracelet} alt="Floral bracelet on sage silk" sizes="20vw" /></div>
            </div>
          </div>
          <div>
            <div className="prose-aurelle" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }} />
            <dl className="mt-12 grid grid-cols-3 gap-6 border-y border-line py-8">
              {[['Lahore', 'Designed in Gulberg'], ['18k', 'Gold vermeil'], ['7 days', 'Easy returns']].map(([v, l]) => (
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
