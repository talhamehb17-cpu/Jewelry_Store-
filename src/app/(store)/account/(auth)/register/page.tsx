import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/store/auth-forms';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Create account', robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect('/account');
  return (
    <>
      <p className="eyebrow">Join the EVERMOON Circle</p>
      <h1 className="t-2 mt-3">Create an account</h1>
      <p className="mt-3 text-[0.92rem] text-muted">Enjoy faster checkout, order tracking and early access to new collections.</p>
      <div className="mt-8"><RegisterForm next={next} /></div>
      <p className="mt-8 text-center text-[0.88rem] text-muted">Already have an account? <Link href="/account/login" className="text-ink underline underline-offset-4">Sign in</Link></p>
    </>
  );
}
