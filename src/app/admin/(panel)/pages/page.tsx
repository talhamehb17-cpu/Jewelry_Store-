import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { Plus, ExternalLink } from 'lucide-react';
import { getDb } from '@/db';
import { pages } from '@/db/schema';
import { Card, PageHeader, Pill } from '@/components/admin/ui';
import { formatDate, titleCase } from '@/lib/utils';
import { publicPath } from '@/lib/page-path';

export const metadata = { title: 'Pages' };

export default async function PagesAdmin() {
  const db = await getDb();
  const rows = await db.select().from(pages).orderBy(asc(pages.title));
  return (
    <>
      <PageHeader title="Pages" description="About, Contact, FAQ, policies and your own custom pages." actions={<Link href="/admin/pages/new" className="btn btn-primary"><Plus size={15} /> New page</Link>} />
      <Card pad={false}>
        <table className="admin-table w-full text-[0.84rem]">
          <thead><tr><th>Title</th><th>URL</th><th>Template</th><th>Status</th><th>Updated</th><th /></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/admin/pages/${p.id}`} className="font-medium hover:underline">{p.title}</Link>{p.system && <span className="ml-2"><Pill>system</Pill></span>}</td>
                <td className="font-mono text-[0.75rem] text-muted">{publicPath(p.slug, p.template)}</td>
                <td>{titleCase(p.template)}</td>
                <td><Pill tone={p.status === 'published' ? 'green' : 'amber'}>{p.status}</Pill></td>
                <td className="text-muted">{formatDate(p.updatedAt)}</td>
                <td className="text-right"><a href={publicPath(p.slug, p.template)} target="_blank" rel="noreferrer" className="text-muted hover:text-ink" aria-label="View page"><ExternalLink size={15} /></a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
