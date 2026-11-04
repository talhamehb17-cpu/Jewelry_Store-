'use client';

import { useActionState } from 'react';
import { changePasswordAction, updateAvatarAction, updateProfileAction } from '@/app/actions/auth';
import { FormMessage, Input } from './auth-forms';

export function AvatarForm({ avatar }: { avatar: string | null }) {
  const [state, action, pending] = useActionState(updateAvatarAction, null);
  return (
    <form action={action} className="mb-6 flex items-center gap-4 rounded-theme border border-line p-6">
      <span className="relative h-16 w-16 overflow-hidden rounded-full bg-surface">{avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-[0.8rem]">DP</span>}</span>
      <div>
        <FormMessage state={state} />
        <label className="label" htmlFor="profile-avatar">Profile picture</label>
        <input id="profile-avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="text-[0.82rem]" />
        <button disabled={pending} className="btn btn-secondary btn-sm mt-3">{pending ? 'Saving…' : 'Save picture'}</button>
      </div>
    </form>
  );
}

export function ProfileForm({ user }: { user: { firstName: string; lastName: string; email: string; phone: string; acceptsMarketing: boolean } }) {
  const [state, action, pending] = useActionState(updateProfileAction, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4 rounded-theme border border-line p-6" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="First name" name="firstName" defaultValue={user.firstName} error={fe.firstName} />
        <Input label="Last name" name="lastName" defaultValue={user.lastName} error={fe.lastName} />
      </div>
      <Input label="Email" name="email" defaultValue={user.email} disabled />
      <Input label="Phone" name="phone" type="tel" defaultValue={user.phone} />
      <label className="flex items-center gap-3 text-[0.88rem]"><input type="checkbox" name="marketing" className="checkbox" defaultChecked={user.acceptsMarketing} /> Receive news about collections and private sales</label>
      <button disabled={pending} className="btn btn-primary">{pending ? 'Saving…' : 'Save changes'}</button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4 rounded-theme border border-line p-6" noValidate>
      <FormMessage state={state} />
      <Input label="Current password" name="current" type="password" autoComplete="current-password" error={fe.current} />
      <Input label="New password" name="password" type="password" autoComplete="new-password" error={fe.password} />
      <Input label="Confirm new password" name="confirm" type="password" autoComplete="new-password" error={fe.confirm} />
      <button disabled={pending} className="btn btn-primary">{pending ? 'Updating…' : 'Update password'}</button>
    </form>
  );
}
