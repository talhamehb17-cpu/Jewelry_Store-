import { requireAdminPage } from '@/lib/auth';
import { getRateBook } from '@/lib/currency';
import { getDb } from '@/db';
import { exchangeRates } from '@/db/schema';
import { PageHeader } from '@/components/admin/ui';
import { CurrencyAdmin } from '@/components/admin/currency-admin';

export const metadata = { title: 'Currency' };

export default async function CurrencyPage() {
  await requireAdminPage({ adminOnly: true });
  const db = await getDb();
  const [book, rows] = await Promise.all([getRateBook(), db.select().from(exchangeRates)]);
  return (
    <>
      <PageHeader title="Display currency" description="Customers can view prices in another currency. They still pay in PKR." />
      <CurrencyAdmin
        fetchedAt={book.fetchedAt}
        rates={rows.map((r) => ({ code: r.code, perPkr: r.perPkr, source: r.source, fetchedAt: r.fetchedAt.toISOString() }))}
      />
    </>
  );
}
