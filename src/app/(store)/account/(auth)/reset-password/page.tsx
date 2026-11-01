import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetForm } from '@/components/store/auth-forms';

export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="t-2">Choose a new password</h1>
      {token && /^[a-f0-9]{64}$/.test(token) ? (
        <div className="mt-8"><ResetForm token={token} /></div>
      ) : (
        <p className="mt-4 text-muted">This reset link is invalid. <Link href="/account/forgot-password" className="underline">Request a new one</Link>.</p>
      )}
    </>
  );
}
