import type { Metadata } from 'next';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { addresses } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { AddressBook } from '@/components/store/address-book';
import { PROVINCES } from '@/lib/utils';

export const metadata: Metadata = { title: 'Addresses', robots: { index: false } };

export default async function AddressesPage() {
  const user = await requireUser('/account/addresses');
  const db = await getDb();
  const list = await db.select().from(addresses).where(eq(addresses.userId, user.id)).orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
  return <AddressBook addresses={list} provinces={PROVINCES} />;
}
