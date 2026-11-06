'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type CartItem = {
  variantId: number;
  productId: number;
  slug: string;
  name: string;
  variantTitle: string | null;
  image: string | null;
  price: number;
  quantity: number;
  giftPackaging?: boolean;
  giftImageId?: string | null;
};

type Toast = { id: number; title: string; body?: string; tone?: 'default' | 'error' };

type QuickViewState = { slug: string } | null;

type StoreCtx = {
  cart: CartItem[];
  cartCount: number;
  cartReady: boolean;
  addToCart: (item: Omit<CartItem, 'quantity'>, qty?: number, opts?: { silent?: boolean }) => void;
  updateQty: (variantId: number, qty: number) => void;
  setGiftPackaging: (variantId: number, selected: boolean, imageId?: string | null) => void;
  removeFromCart: (variantId: number) => void;
  clearCart: () => void;
  replaceCart: (items: CartItem[]) => void;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  quickView: QuickViewState;
  setQuickView: (v: QuickViewState) => void;
  wishlist: number[];
  toggleWishlist: (productId: number, name?: string) => void;
  inWishlist: (productId: number) => boolean;
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  loggedIn: boolean;
};

const Ctx = createContext<StoreCtx | null>(null);
const CART_KEY = 'aurelle.cart.v1';
const WISH_KEY = 'aurelle.wishlist.v1';

export function StoreProvider({ children, loggedIn }: { children: React.ReactNode; loggedIn: boolean }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickView, setQuickView] = useState<QuickViewState>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      if (Array.isArray(c)) setCart(c.filter((x) => x && Number.isInteger(x.variantId)));
      const w = JSON.parse(localStorage.getItem(WISH_KEY) || '[]');
      if (Array.isArray(w)) setWishlist(w.filter((x) => Number.isInteger(x)));
    } catch {
      /* ignore corrupted storage */
    }
    setCartReady(true);
  }, []);

  useEffect(() => {
    if (cartReady) localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, cartReady]);

  useEffect(() => {
    if (cartReady) localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
  }, [wishlist, cartReady]);

  // Persist the wishlist for signed-in customers: merge local items into the account once.
  useEffect(() => {
    if (!loggedIn || !cartReady) return;
    let local: number[] = [];
    try {
      local = JSON.parse(localStorage.getItem(WISH_KEY) || '[]');
    } catch {}
    fetch('/api/wishlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ merge: local }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && Array.isArray(d.ids) && setWishlist(d.ids))
      .catch(() => {});
  }, [loggedIn, cartReady]);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3800);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((prev) => prev.filter((x) => x.id !== id)), []);

  const addToCart = useCallback<StoreCtx['addToCart']>((item, qty = 1, opts) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.variantId === item.variantId);
      if (existing) return prev.map((x) => (x.variantId === item.variantId ? { ...x, ...item, giftPackaging: 'giftPackaging' in item ? item.giftPackaging : x.giftPackaging, giftImageId: 'giftPackaging' in item ? item.giftImageId : x.giftImageId, quantity: Math.min(20, x.quantity + qty) } : x));
      return [...prev, { ...item, quantity: Math.min(20, qty) }];
    });
    if (!opts?.silent) setCartOpen(true);
  }, []);
  const updateQty = useCallback((variantId: number, qty: number) => {
    setCart((prev) => (qty <= 0 ? prev.filter((x) => x.variantId !== variantId) : prev.map((x) => (x.variantId === variantId ? { ...x, quantity: Math.min(20, qty) } : x))));
  }, []);
  const setGiftPackaging = useCallback((variantId: number, selected: boolean, imageId?: string | null) => {
    setCart((prev) => prev.map((x) => (x.variantId === variantId ? { ...x, giftPackaging: selected, giftImageId: selected ? imageId ?? x.giftImageId ?? null : null } : x)));
  }, []);
  const removeFromCart = useCallback((variantId: number) => setCart((prev) => prev.filter((x) => x.variantId !== variantId)), []);
  const clearCart = useCallback(() => setCart([]), []);
  const replaceCart = useCallback((items: CartItem[]) => setCart(items), []);

  const toggleWishlist = useCallback(
    (productId: number, name?: string) => {
      setWishlist((prev) => {
        const has = prev.includes(productId);
        const next = has ? prev.filter((x) => x !== productId) : [...prev, productId];
        if (loggedIn) {
          fetch('/api/wishlist', { method: has ? 'DELETE' : 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId }) }).catch(() => {});
        }
        toast({ title: has ? 'Removed from wishlist' : 'Saved to wishlist', body: name });
        return next;
      });
    },
    [loggedIn, toast],
  );
  const inWishlist = useCallback((id: number) => wishlist.includes(id), [wishlist]);

  const value = useMemo<StoreCtx>(
    () => ({
      cart,
      cartCount: cart.reduce((a, b) => a + b.quantity, 0),
      cartReady,
      addToCart,
      updateQty,
      setGiftPackaging,
      removeFromCart,
      clearCart,
      replaceCart,
      cartOpen,
      setCartOpen,
      searchOpen,
      setSearchOpen,
      menuOpen,
      setMenuOpen,
      quickView,
      setQuickView,
      wishlist,
      toggleWishlist,
      inWishlist,
      toasts,
      toast,
      dismissToast,
      loggedIn,
    }),
    [cart, cartReady, addToCart, updateQty, setGiftPackaging, removeFromCart, clearCart, replaceCart, cartOpen, searchOpen, menuOpen, quickView, wishlist, toggleWishlist, inWishlist, toasts, toast, dismissToast, loggedIn],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore must be used inside <StoreProvider>');
  return c;
}

/** Lock body scroll while overlays are open. */
export function useBodyLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}
