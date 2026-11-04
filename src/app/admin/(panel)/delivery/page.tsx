import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { deliveryIssues, orders } from '@/db/schema';
import { requireAdminPage } from '@/lib/auth';
import { listDeliveryServices } from '@/lib/delivery';
import { getAutomationSettings } from '@/lib/delivery-effects';
import { PageHeader } from '@/components/admin/ui';
import { DeliveryManager } from '@/components/admin/delivery-manager';
import { DeliverySettingsForm } from '@/components/admin/delivery-settings';

export const metadata = { title: 'Delivery' };

export default async function DeliveryAdmin() {
  await requireAdminPage();
  const db = await getDb();
  const [services, issues, automation] = await Promise.all([
    listDeliveryServices(),
    db.select().from(deliveryIssues).orderBy(desc(deliveryIssues.createdAt)).limit(30),
    getAutomationSettings(db),
  ]);
  const numbers = new Map<number, string>();
  for (const issue of issues) {
    const [row] = await db.select({ number: orders.number }).from(orders).where(eq(orders.id, issue.orderId)).limit(1);
    if (row) numbers.set(issue.orderId, row.number);
  }
  return (
    <>
      <PageHeader title="Delivery" description="Separate Standard and Express timelines. Delivered is never set because an estimate passed." />
      <div className="mb-6"><DeliverySettingsForm initial={automation} /></div>
      <DeliveryManager
        services={services}
        issues={issues.map((i) => ({ id: i.id, orderId: i.orderId, status: i.status, note: i.note, createdAt: i.createdAt.toISOString(), number: numbers.get(i.orderId) }))}
      />
    </>
  );
}
