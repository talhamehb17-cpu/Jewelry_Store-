import { PageHeader } from '@/components/admin/ui';
import { PackagingForm } from '@/components/admin/packaging-form';
import { normalizeGift } from '@/lib/gift-packaging';
import { getSettings } from '@/lib/settings';
import { requireAdminPage } from '@/lib/auth';

export const metadata = { title: 'Gift packaging' };

export default async function PackagingAdmin() {
  await requireAdminPage({ adminOnly: true });
  const settings = await getSettings();
  const gift = normalizeGift(settings.giftPackaging);
  return (
    <>
      <PageHeader title="Gift packaging" description="Optional premium packaging. Customers only see it on products marked available, and the charge is calculated here, not in the browser." />
      <PackagingForm initial={gift} />
    </>
  );
}
