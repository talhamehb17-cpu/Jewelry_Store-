'use client';

import { useEffect } from 'react';
import { useStore } from './providers';

export function ClearCartOnMount() {
  const { clearCart, cartReady } = useStore();
  useEffect(() => {
    if (cartReady) clearCart();
  }, [cartReady, clearCart]);
  return null;
}
