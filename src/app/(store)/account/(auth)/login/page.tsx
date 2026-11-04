import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser, isStaff } from '@/lib/auth';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(isStaff(user) ? '/admin' : next?.startsWith('/') ? next : '/account');
  return null;
}
