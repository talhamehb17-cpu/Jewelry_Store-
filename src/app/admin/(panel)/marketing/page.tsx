import { asc, desc } from 'drizzle-orm';
import { getDb } from '@/db';
import { campaigns, categories, products } from '@/db/schema';
import { PageHeader } from '@/components/admin/ui';
import { CampaignManager } from '@/components/admin/campaign-manager';
import { subscriberCount, syncCampaignClocks } from '@/lib/campaigns';
import { requireAdminPage } from '@/lib/auth';

export const metadata = { title: 'Events & campaigns' };

export default async function MarketingAdmin() {
  await requireAdminPage();
  await syncCampaignClocks();
  const db = await getDb();
  const [list, prods, cats, subscribers] = await Promise.all([
    db.select().from(campaigns).orderBy(desc(campaigns.updatedAt)),
    db.select({ id: products.id, name: products.name }).from(products).orderBy(asc(products.name)),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.position)),
    subscriberCount(),
  ]);
  return (
    <>
      <PageHeader title="Events & campaigns" description="Automatic sale prices, a live countdown, and one-time emails to subscribed customers. Times are Pakistan time." />
      <CampaignManager
        subscribers={subscribers}
        products={prods}
        categories={cats}
        campaigns={list.map((c) => ({
          ...c,
          startsAt: c.startsAt.toISOString(),
          endsAt: c.endsAt.toISOString(),
          emailSentAt: c.emailSentAt?.toISOString() ?? null,
        }))}
      />
    </>
  );
}
