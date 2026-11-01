import type { Metadata } from 'next';
import { WishlistView } from '@/components/store/wishlist-view';
import { getThemeContext } from '@/lib/theme-server';

export const metadata: Metadata = { title: 'Wishlist', robots: { index: false } };

export default async function WishlistPage() {
  const ctx = await getThemeContext();
  return <WishlistView variant={ctx.config.settings.layout.cardVariant} />;
}
