import type { Metadata } from 'next';
import { CartPageView } from '@/components/store/cart-page';

export const metadata: Metadata = { title: 'Your Bag', robots: { index: false } };

export default function CartPage() {
  return <CartPageView />;
}
