import { desc } from 'drizzle-orm';
import { Download } from 'lucide-react';
import { getDb } from '@/db';
import { contactMessages, newsletterSubscribers } from '@/db/schema';
import { Card, Empty, PageHeader, Pill } from '@/components/admin/ui';
import { ActionButton } from '@/components/admin/action-button';
import { markMessage, removeSubscriber } from '@/app/actions/admin/commerce';
import { formatDateTime, formatDate } from '@/lib/utils';

export const metadata = { title: 'Messages' };

export default async function MessagesAdmin() {
  const db = await getDb();
  const [msgs, subs] = await Promise.all([
    db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(100),
    db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt)).limit(500),
  ]);
  return (
    <>
      <PageHeader title="Messages" description="Contact form enquiries and newsletter subscribers." />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title={`Enquiries (${msgs.filter((m) => !m.read).length} unread)`} pad={false}>
          {msgs.length === 0 ? <Empty title="No messages yet" /> : (
            <ul className="divide-y divide-line">
              {msgs.map((m) => (
                <li key={m.id} className={`p-5 ${m.read ? '' : 'bg-[#fbf8f2]'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{m.subject || 'Enquiry'} {!m.read && <Pill tone="gold">new</Pill>}</p>
                    <span className="text-[0.75rem] text-muted">{formatDateTime(m.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-[0.78rem] text-muted">{m.name} · <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject ?? 'Your enquiry')}`} className="underline">{m.email}</a>{m.phone ? ` · ${m.phone}` : ''}</p>
                  <p className="mt-2 whitespace-pre-line text-[0.86rem]">{m.message}</p>
                  <div className="mt-3 flex gap-2">
                    <ActionButton action={markMessage.bind(null, m.id, !m.read)} showResult={false} className="btn-sm">{m.read ? 'Mark unread' : 'Mark as read'}</ActionButton>
                    <ActionButton action={markMessage.bind(null, m.id, 'delete')} confirmText="Delete this message?" showResult={false} className="btn-sm !text-rose-700">Delete</ActionButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={`Subscribers (${subs.length})`} actions={<a href="/api/admin/subscribers/export" className="btn btn-secondary btn-sm"><Download size={13} /> CSV</a>} pad={false}>
          <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
            {subs.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-[0.82rem]">
                <span className="min-w-0"><span className="block truncate">{s.email}</span><span className="text-[0.7rem] text-muted">{s.source} · {formatDate(s.createdAt)}</span></span>
                <ActionButton action={removeSubscriber.bind(null, s.id)} confirmText={`Remove ${s.email}?`} showResult={false} className="btn-sm">Remove</ActionButton>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
