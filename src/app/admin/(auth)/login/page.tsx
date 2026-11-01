import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/store/auth-forms';
import { getCurrentUser, isStaff } from '@/lib/auth';

export const metadata: Metadata = { title: 'Admin sign in', robots: { index: false } };

export default async function AdminLogin() {
  const user = await getCurrentUser();
  if (user && isStaff(user)) redirect('/admin');
  return (
    <div className="admin-root grid min-h-screen place-items-center bg-[#f7f5f1] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-ink font-heading text-2xl text-[#d8b878]">A</span>
          <h1 className="mt-5 font-heading text-[2rem]">Aurelle Admin</h1>
          <p className="mt-1 text-[0.85rem] text-muted">Sign in to manage your store</p>
        </div>
        <div className="admin-card p-7">
          <LoginForm area="admin" next="/admin" />
        </div>
        <p className="mt-6 text-center text-[0.8rem] text-muted"><Link href="/" className="hover:text-ink">← Back to store</Link></p>
      </div>
    </div>
  );
}
