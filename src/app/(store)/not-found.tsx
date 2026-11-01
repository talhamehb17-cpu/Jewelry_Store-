import Link from 'next/link';
import { Search } from 'lucide-react';

export default function StoreNotFound() {
  return (
    <div className="container-x flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
      <p className="font-heading text-[clamp(5rem,16vw,11rem)] leading-none text-accent/40">404</p>
      <h1 className="t-2 -mt-4">This page has slipped away</h1>
      <p className="mt-4 max-w-md text-muted">The page you’re looking for may have moved or no longer exists. Let us help you find something beautiful.</p>
      <form action="/search" className="mt-8 flex w-full max-w-md items-center gap-2 border-b border-ink pb-2">
        <Search size={18} strokeWidth={1.25} />
        <input name="q" placeholder="Search jewelry…" className="flex-1 bg-transparent py-2 outline-none" aria-label="Search" />
        <button className="text-[0.75rem] uppercase tracking-[0.18em]">Search</button>
      </form>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary">Return home</Link>
        <Link href="/collections/best-sellers" className="btn btn-secondary">Shop best sellers</Link>
      </div>
    </div>
  );
}
