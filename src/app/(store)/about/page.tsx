import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Img } from '@/components/ui/img';
import { getPage } from '@/lib/pages';
import { renderMarkdown } from '@/lib/markdown';
import { BRAND } from '@/lib/brand';
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
      <section className="border-b border-line">
        <div className="container-x py-10 md:py-14">
          <p className="eyebrow mb-4">EVERMOON · Lahore</p>
          <h1 className="t-display max-w-3xl text-balance">{page.title}</h1>
          <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-muted">Wear your little wonder. Pretty jewellery, handpicked and finished to be worn every day.</p>
        </div>
        <div className="container-x pb-10 md:pb-14">
          <figure className="overflow-hidden border border-line bg-[#f4eadc]">
            <div className="relative mx-auto aspect-[2056/765] w-full max-w-[1680px]">
              <Img
                src={BRAND.about}
                alt="EVERMOON — Wear your little wonder. Pretty little things for your everyday."
                sizes="(max-width:1680px) 100vw, 1680px"
                priority
                className="!object-cover !object-center"
              />
            </div>
          </figure>
          <p className="mt-3 text-center text-[0.68rem] uppercase tracking-[0.18em] text-muted">The house still life · kept for Our Story</p>
        </div>
      </section>
      <section className="section-y container-x">
        <div className="grid gap-14 md:grid-cols-[1fr_1.3fr]">
          <div className="space-y-4 md:sticky md:top-28 md:self-start">
            <div className="relative aspect-[4/5] max-h-[70svh] overflow-hidden bg-surface md:max-h-none">
              <Img src={IMG.aurelia1} alt="Aurelia gold necklace" sizes="(max-width:768px) 100vw, 40vw" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative aspect-square overflow-hidden bg-surface"><Img src={IMG.elara1} alt="Elara solitaire ring" sizes="20vw" /></div>
              <div className="relative aspect-square overflow-hidden bg-surface"><Img src={IMG.celeste1} alt="Celeste pearl earrings" sizes="20vw" /></div>
            </div>
          </div>
          <div>
            <div className="prose-aurelle" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }} />
            <dl className="mt-12 grid grid-cols-3 gap-6 border-y border-line py-8">
              {[['Lahore', 'Designed in Lahore'], ['18k', 'Gold vermeil'], ['7 days', 'Returns discussed']].map(([v, l]) => (
                <div key={l}><dt className="font-heading text-[clamp(1.6rem,4vw,2rem)] leading-none">{v}</dt><dd className="mt-2 text-[0.72rem] uppercase tracking-[0.14em] text-muted">{l}</dd></div>
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
