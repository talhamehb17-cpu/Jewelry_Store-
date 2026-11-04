import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { Plus, ExternalLink } from 'lucide-react';
import { getDb } from '@/db';
import { pages } from '@/db/schema';
import { Card, PageHeader, Pill, TableWrap } from '@/components/admin/ui';
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
        <TableWrap>
        <table className="admin-table w-full text-[0.84rem]">
          <thead><tr><th>Title</th><th>URL</th><th>Template</th><th>Status</th><th>Updated</th><th /></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="is-primary" data-label="Title"><Link href={`/admin/pages/${p.id}`} className="font-medium hover:underline">{p.title}</Link>{p.system && <span className="ml-2"><Pill>system</Pill></span>}</td>
                <td data-label="URL" className="font-mono text-[0.75rem] text-muted">{publicPath(p.slug, p.template)}</td>
                <td data-label="Template">{titleCase(p.template)}</td>
                <td data-label="Status"><Pill tone={p.status === 'published' ? 'green' : 'amber'}>{p.status}</Pill></td>
                <td data-label="Updated" className="text-muted">{formatDate(p.updatedAt)}</td>
                <td data-label="" className="text-right"><a href={publicPath(p.slug, p.template)} target="_blank" rel="noreferrer" className="inline-flex h-10 w-10 items-center justify-center text-muted hover:text-ink" aria-label="View page"><ExternalLink size={15} /></a></td>
              </tr>
            ))}
          </tbody>
        </table>
        </TableWrap>
      </Card>
    </>
  );
}
