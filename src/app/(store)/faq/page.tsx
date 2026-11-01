import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus } from 'lucide-react';
import { getPage } from '@/lib/pages';
import { parseFaq, renderMarkdown, stripMarkdown } from '@/lib/markdown';
import { jsonLd } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const p = await getPage('faq');
  return { title: p?.seoTitle || 'FAQ', description: p?.seoDescription ?? undefined, alternates: { canonical: '/faq' } };
}

export default async function FaqPage() {
  const page = await getPage('faq');
  if (!page) notFound();
  const sections = parseFaq(page.content);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: sections.flatMap((s) => s.items).map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: stripMarkdown(i.a) } })),
  };
  return (
    <div className="container-x pb-[var(--section-y)] pt-12 md:pt-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Help centre</p>
        <h1 className="t-1 mt-3">{page.title}</h1>
      </div>
      <div className="mx-auto mt-12 grid max-w-5xl gap-12 md:grid-cols-[200px_1fr]">
        <nav className="hidden md:block">
          <ul className="sticky top-28 space-y-3 text-[0.9rem]">
            {sections.map((s) => <li key={s.title}><a href={`#${s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="text-muted transition hover:text-ink">{s.title}</a></li>)}
          </ul>
        </nav>
        <div className="space-y-12">
          {sections.map((s) => (
            <section key={s.title} id={s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')} className="scroll-mt-28">
              <h2 className="t-3 mb-4">{s.title}</h2>
              <div className="divide-y divide-line border-y border-line">
                {s.items.map((i) => (
                  <details key={i.q} className="group py-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 [&::-webkit-details-marker]:hidden">
                      <span className="text-[1rem] font-medium">{i.q}</span>
                      <Plus size={18} strokeWidth={1.25} className="shrink-0 transition duration-300 group-open:rotate-45" />
                    </summary>
                    <div className="prose-aurelle mt-3 text-[0.94rem]" dangerouslySetInnerHTML={{ __html: renderMarkdown(i.a) }} />
                  </details>
                ))}
              </div>
            </section>
          ))}
          <div className="rounded-theme bg-surface/70 p-8 text-center">
            <p className="font-heading text-2xl">Still have a question?</p>
            <p className="mt-2 text-muted">Our client care team replies within one working day.</p>
            <Link href="/contact" className="btn btn-primary mt-6">Contact us</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
