'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { BRAND } from '@/lib/brand';
import { LoginForm, RegisterForm } from './auth-forms';

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduce(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);
  return reduce;
}

export function AuthStage({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === '/account/login' || path === '/account/register') return <AuthSwitch />;
  return children;
}

function AuthSwitch() {
  const path = usePathname();
  const router = useRouter();
  const pathMode = path === '/account/register' ? 'register' : 'login';
  const [mode, setMode] = useState<'login' | 'register'>(pathMode);
  const [next, setNext] = useState('');
  const [live, setLive] = useState(false);
  const [height, setHeight] = useState<number>();
  const loginRef = useRef<HTMLDivElement>(null);
  const registerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => setMode(pathMode), [pathMode]);
  useEffect(() => {
    setNext(new URLSearchParams(window.location.search).get('next') || '');
  }, [path]);

  useLayoutEffect(() => {
    if (reduce || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = mode === 'login' ? loginRef.current : registerRef.current;
    if (!el) return;
    const measure = () => setHeight(el.scrollHeight);
    measure();
    setLive(true);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [mode, reduce, live]);

  const go = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    const href = nextMode === 'register' ? '/account/register' : '/account/login';
    router.push(next ? `${href}?next=${encodeURIComponent(next)}` : href, { scroll: false });
  };

  const login = (
    <div ref={loginRef}>
      <Image src={BRAND.logo} alt={BRAND.name} width={84} height={84} className="mb-6 h-20 w-20 object-contain" />
      <p className="eyebrow">Welcome back</p>
      <h1 className="t-2 mt-3" tabIndex={-1}>Sign in</h1>
      <p className="mt-3 text-[0.92rem] text-muted">Track orders, save addresses and keep your wishlist across devices.</p>
      <div className="mt-8"><LoginForm next={next} idPrefix="in-" /></div>
      <p className="mt-8 text-center text-[0.88rem] text-muted">New to EVERMOON? <button type="button" className="text-ink underline underline-offset-4" onClick={() => go('register')}>Create an account</button></p>
    </div>
  );
  const register = (
    <div ref={registerRef}>
      <p className="eyebrow">Join the EVERMOON Circle</p>
      <h1 className="t-2 mt-3" tabIndex={-1}>Create an account</h1>
      <p className="mt-3 text-[0.92rem] text-muted">Enjoy faster checkout, order tracking and early access to new collections.</p>
      <div className="mt-8"><RegisterForm next={next} idPrefix="up-" /></div>
      <p className="mt-8 text-center text-[0.88rem] text-muted">Already have an account? <button type="button" className="text-ink underline underline-offset-4" onClick={() => go('login')}>Sign in</button></p>
    </div>
  );

  if (!live || reduce) return mode === 'register' ? register : login;
  return (
    <div className="overflow-hidden transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none" style={height ? { height } : undefined}>
      <div className="flex w-[200%] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none" style={{ transform: mode === 'register' ? 'translateX(-50%)' : 'translateX(0)' }}>
        <div className="w-1/2 shrink-0" inert={mode !== 'login'}>{login}</div>
        <div className="w-1/2 shrink-0" inert={mode !== 'register'}>{register}</div>
      </div>
    </div>
  );
}
