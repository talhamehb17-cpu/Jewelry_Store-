import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { deliveryIssues, orders } from '@/db/schema';
import { requireAdminPage } from '@/lib/auth';
import { listDeliveryServices } from '@/lib/delivery';
import { PageHeader } from '@/components/admin/ui';
import { DeliveryManager } from '@/components/admin/delivery-manager';

export const metadata = { title: 'Delivery' };

export default async function DeliveryAdmin() {
  await requireAdminPage();
  const db = await getDb();
  const [services, issues] = await Promise.all([
    listDeliveryServices(),
    db.select().from(deliveryIssues).orderBy(desc(deliveryIssues.createdAt)).limit(30),
  ]);
  const numbers = new Map<number, string>();
  for (const issue of issues) {
    const [row] = await db.select({ number: orders.number }).from(orders).where(eq(orders.id, issue.orderId)).limit(1);
    if (row) numbers.set(issue.orderId, row.number);
  }
  return (
    <>
      <PageHeader title="Delivery" description="Estimates, charges, and the stages that may advance on a timer. Delivered is never automatic." />
      <DeliveryManager
        services={services}
        issues={issues.map((i) => ({ id: i.id, orderId: i.orderId, status: i.status, note: i.note, createdAt: i.createdAt.toISOString(), number: numbers.get(i.orderId) }))}
      />
    </>
  );
}
