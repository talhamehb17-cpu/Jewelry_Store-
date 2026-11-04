import type { Metadata } from 'next';
import Link from 'next/link';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { customerNotifications, orderItems, orders } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';
import { DeliveryAnswer } from '@/components/store/delivery-answer';
import { Img } from '@/components/ui/img';

export const metadata: Metadata = { title: 'Updates', robots: { index: false } };

export default async function NotificationsPage() {
  const user = await requireUser('/account/notifications');
  const db = await getDb();
  const rows = await db
    .select({
      id: customerNotifications.id,
      status: customerNotifications.status,
      title: customerNotifications.title,
      body: customerNotifications.body,
      scheduledAt: customerNotifications.scheduledAt,
      response: customerNotifications.response,
      orderId: orders.id,
      number: orders.number,
      orderStatus: orders.status,
      service: orders.shippingMethodName,
      image: orderItems.image,
      name: orderItems.name,
    })
    .from(customerNotifications)
    .innerJoin(orders, eq(orders.id, customerNotifications.orderId))
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(and(eq(customerNotifications.type, 'delivery_confirm'), sql`(${orders.userId} = ${user.id} or (${orders.userId} is null and lower(${orders.email}) = ${user.email.toLowerCase()}))`))
    .orderBy(desc(customerNotifications.scheduledAt));
  const seen = new Set<number>();
  const notes = rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
  return (
    <div className="space-y-5">
      <div>
        <h2 className="t-3">Updates</h2>
        <p className="mt-2 text-[0.88rem] text-muted">Delivery questions stay here until you or the atelier resolves them. Closing a popup does not answer it.</p>
      </div>
      {notes.length === 0 ? (
        <p className="rounded-theme border border-dashed border-line p-8 text-center text-muted">No delivery updates yet.</p>
      ) : (
        notes.map((note) => {
          const open = ['scheduled', 'pending', 'answered_no'].includes(note.status) && !['delivered', 'cancelled'].includes(note.orderStatus);
          const due = note.scheduledAt.getTime() <= Date.now();
          return (
            <article key={note.id} className="rounded-theme border border-line p-4">
              <div className="flex gap-3">
                <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-theme-sm bg-surface"><Img src={note.image} alt="" sizes="56px" /></span>
                <div className="min-w-0">
                  <p className="font-medium">{note.title || 'Delivery update'}</p>
                  <p className="text-[0.85rem] text-muted">{note.number} · {note.name} · {note.service}</p>
                  <p className="text-[0.78rem] text-muted">{due ? `Asked ${formatDateTime(note.scheduledAt)}` : `Opens ${formatDateTime(note.scheduledAt)}`} · {note.orderStatus.replaceAll('_', ' ')}</p>
                </div>
              </div>
              {open && due && <div className="mt-4"><DeliveryAnswer orderId={note.orderId} mode={note.response === 'no' || note.status === 'answered_no' ? 'no' : 'pending'} /></div>}
              {!open && <p className="mt-3 text-[0.85rem]">{note.orderStatus === 'delivered' ? 'This delivery is confirmed.' : note.body}</p>}
              <Link href={`/account/orders/${note.number}`} className="mt-3 inline-block text-[0.82rem] underline-offset-4 hover:underline">View order</Link>
            </article>
          );
        })
      )}
    </div>
  );
}
