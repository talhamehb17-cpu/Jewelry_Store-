import { getSettings, stripeConfigured, emailConfigured } from '@/lib/settings';
import { getDbKind } from '@/db';
import { requireAdminPage } from '@/lib/auth';
import { PageHeader } from '@/components/admin/ui';
import { SettingsForms } from '@/components/admin/settings-forms';
import { siteUrl } from '@/lib/utils';

export const metadata = { title: 'Settings' };

export default async function SettingsAdmin() {
  await requireAdminPage({ adminOnly: true });
  const [settings, kind] = await Promise.all([getSettings(), getDbKind()]);
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  let host = '';
  try {
    host = url ? new URL(url).hostname : '';
  } catch {}
  return (
    <>
      <PageHeader title="Settings" description="Store details, shipping, payments, navigation and system status." />
      <SettingsForms
        settings={settings}
        system={{
          db: kind,
          dbHost: host.replace(/^([^.]{6})[^.]*/, '$1…'),
          claimUrl: process.env.NEON_CLAIM_URL ?? null,
          expiresAt: process.env.NEON_DB_EXPIRES_AT ?? null,
          stripe: stripeConfigured(),
          stripeWebhook: `${siteUrl()}/api/stripe/webhook`,
          email: emailConfigured(),
          env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
          siteUrl: siteUrl(),
        }}
      />
    </>
  );
}
