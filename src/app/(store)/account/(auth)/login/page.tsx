import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { BRAND } from '@/lib/brand';
import { LoginForm } from '@/components/store/auth-forms';
import { getCurrentUser, isStaff } from '@/lib/auth';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(isStaff(user) ? '/admin' : next?.startsWith('/') ? next : '/account');
  return (
    <>
      <Image src={BRAND.logo} alt={BRAND.name} width={84} height={84} className="mb-6 h-20 w-20 object-contain" />
      <p className="eyebrow">Welcome back</p>
      <h1 className="t-2 mt-3">Sign in</h1>
      <p className="mt-3 text-[0.92rem] text-muted">Track orders, save addresses and keep your wishlist across devices.</p>
      <div className="mt-8"><LoginForm next={next} /></div>
      <p className="mt-8 text-center text-[0.88rem] text-muted">New to Evermoon? <Link href={`/account/register${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-ink underline underline-offset-4">Create an account</Link></p>
    </>
  );
}
