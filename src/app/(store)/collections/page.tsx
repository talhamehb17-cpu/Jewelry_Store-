import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Img } from '@/components/ui/img';
import { getCollections } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Explore Evermoon Jewels collections — new arrivals, best sellers, The Pearl Edit, Bridal, Everyday Gold and thoughtful gifts.',
  alternates: { canonical: '/collections' },
};

export default async function CollectionsIndex() {
  const cols = await getCollections();
  const [feature, ...rest] = cols;
  return (
    <div className="container-x pb-[var(--section-y)] pt-10 md:pt-14">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <p className="eyebrow">Explore</p>
        <h1 className="t-1 mt-3">Collections</h1>
        <p className="mt-4 text-muted">Curated edits for every chapter — from everyday gold to your wedding day.</p>
      </div>
      {feature && (
        <Link href={`/collections/${feature.slug}`} className="group reveal relative mb-[var(--grid-gap)] flex min-h-[360px] items-end overflow-hidden rounded-theme bg-surface md:min-h-[460px]">
          <Img src={feature.image} alt={feature.name} sizes="100vw" priority className="transition duration-[1600ms] group-hover:scale-105" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <span className="relative p-8 text-white md:p-12">
            <span className="font-heading block text-[clamp(2rem,4vw,3.4rem)] leading-none">{feature.name}</span>
            <span className="mt-3 block max-w-md text-white/85">{feature.description}</span>
            <span className="mt-5 inline-flex items-center gap-2 text-[0.75rem] uppercase tracking-[0.2em]">Shop now <ArrowRight size={14} strokeWidth={1.25} /></span>
          </span>
        </Link>
      )}
      <div className="grid grid-cols-2 gap-[var(--grid-gap)] md:grid-cols-3">
        {rest.map((c, i) => (
          <Link key={c.id} href={`/collections/${c.slug}`} className="group reveal" style={{ ['--d' as string]: `${(i % 3) * 90}ms` }}>
            <span className="relative block aspect-[4/5] overflow-hidden rounded-theme bg-surface">
              <Img src={c.image} alt={c.name} sizes="(max-width:768px) 50vw, 33vw" className="transition duration-[1400ms] group-hover:scale-105" />
            </span>
            <span className="font-heading mt-4 block text-[1.3rem]">{c.name}</span>
            <span className="mt-1 line-clamp-2 block text-[0.85rem] text-muted">{c.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
