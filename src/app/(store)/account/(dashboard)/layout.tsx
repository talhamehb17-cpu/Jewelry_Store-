import { requireUser } from '@/lib/auth';
import { customerAlertCount } from '@/lib/fulfillment';
import { AccountNav } from '@/components/store/account-nav';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/account');
  const alerts = await customerAlertCount(user.id);
  return (
    <div className="container-x pb-24 pt-10 md:pt-14">
      <div className="mb-10">
        <p className="eyebrow">My account</p>
        <h1 className="t-2 mt-2">Hello, {user.firstName || 'there'}</h1>
      </div>
      <div className="grid gap-10 lg:grid-cols-[230px_1fr]">
        <AccountNav alerts={alerts} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
