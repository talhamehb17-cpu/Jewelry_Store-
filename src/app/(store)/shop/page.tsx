import type { Metadata } from 'next';
import { CatalogView, type SP } from '@/components/store/catalog-view';
import { IMG } from '@/lib/images';

export const metadata: Metadata = {
  title: 'Shop All Jewelry',
  description: 'Shop rings, necklaces, earrings, bracelets and jewelry sets in 18k gold vermeil, solid gold, pearls and lab-grown diamonds.',
  alternates: { canonical: '/shop' },
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  return (
    <CatalogView
      base="/shop"
      sp={sp}
      title="Shop All Jewelry"
      eyebrow="The Collection"
      description="Timeless pieces designed in Lahore — made for every day, and every moment that matters."
      image={IMG.heroMain}
      showCategoryFilter
    />
  );
}
