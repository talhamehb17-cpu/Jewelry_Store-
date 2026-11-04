import type { Metadata } from 'next';
import { CatalogView, type SP } from '@/components/store/catalog-view';
import { IMG } from '@/lib/images';

export const metadata: Metadata = {
  title: 'Shop All Jewelry',
  description: 'Buy EVERMOON jewellery online in Pakistan — earrings, necklaces, bracelets, rings and gifts in 18k gold vermeil, freshwater pearls and lab-grown diamonds. Cash on Delivery, EasyPaisa, JazzCash and bank transfer.',
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
