import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotForm } from '@/components/store/auth-forms';

export const metadata: Metadata = { title: 'Reset password', robots: { index: false } };

export default function ForgotPage() {
  return (
    <>
      <h1 className="t-2">Forgot your password?</h1>
      <p className="mt-3 text-[0.92rem] text-muted">Enter your email and we’ll send you a secure link to choose a new password.</p>
      <div className="mt-8"><ForgotForm /></div>
      <p className="mt-8 text-center text-[0.88rem]"><Link href="/account/login" className="underline underline-offset-4">Back to sign in</Link></p>
    </>
  );
}
