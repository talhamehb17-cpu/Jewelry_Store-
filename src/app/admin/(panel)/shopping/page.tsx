import { PageHeader } from '@/components/admin/ui';
import { ShoppingRulesForm } from '@/components/admin/shopping-rules-form';
import { getSettings } from '@/lib/settings';
import { normalizeShopping } from '@/lib/shopping-rules';

export const metadata = { title: 'Shopping conditions' };

export default async function ShoppingAdmin() {
  const settings = await getSettings();
  const shopping = normalizeShopping(settings.shopping);
  return (
    <>
      <PageHeader title="Shopping conditions" description="Payment rules and checkout amounts. The high-value rule uses the initial defaults until an administrator saves a change here. Discount codes stay on their own page. Events stay on Events & campaigns." />
      <ShoppingRulesForm
        shopping={shopping}
        freeShipping={settings.shipping.freeThreshold}
        enabledMethods={{
          easypaisa: !!settings.payments.easypaisa?.enabled,
          jazzcash: !!settings.payments.jazzcash?.enabled,
          bank: !!settings.payments.bank.enabled,
          cod: !!settings.payments.cod.enabled,
          card: false,
        }}
      />
    </>
  );
}
