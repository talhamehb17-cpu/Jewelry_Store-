import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { PasswordForm, ProfileForm } from '@/components/store/profile-forms';

export const metadata: Metadata = { title: 'Profile & security', robots: { index: false } };

export default async function ProfilePage() {
  const user = await requireUser('/account/profile');
  return (
    <div className="grid gap-10 xl:grid-cols-2">
      <section>
        <h2 className="t-3 mb-6">Profile</h2>
        <ProfileForm user={{ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone ?? '', acceptsMarketing: user.acceptsMarketing }} />
      </section>
      <section>
        <h2 className="t-3 mb-6">Change password</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
