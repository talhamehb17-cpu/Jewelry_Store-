'use server';

import { z } from 'zod';
import { assertAdmin } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getEmailConfig, saveEmailSettings, type EmailSecurity } from '@/lib/mailer';
import { deliverEmail } from '@/lib/mailer';
import { testEmailHtml } from '@/lib/email';

const schema = z.object({
  address: z.string().trim().email('Enter the sender email address.').max(255),
  senderName: z.string().trim().min(2, 'Enter a sender name.').max(120),
  host: z.string().trim().min(3, 'Enter the SMTP host.').max(255),
  port: z.coerce.number().int().min(1).max(65535),
  username: z.string().trim().min(1, 'Enter the SMTP username.').max(255),
  password: z.string().max(200).optional().default(''),
  security: z.enum(['starttls', 'ssl', 'none']),
});

export async function saveEmailSettingsAction(input: z.input<typeof schema>) {
  await assertAdmin({ adminOnly: true });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };
  const d = parsed.data;
  const existing = await getEmailConfig();
  if (!d.password.trim() && !existing) return { ok: false, message: 'Enter the SMTP password or Gmail app password. It is stored encrypted and is never sent back to the browser.' };
  await saveEmailSettings({ ...d, security: d.security as EmailSecurity, password: d.password.trim() || undefined });
  return { ok: true, message: 'Email settings saved. Send a test before relying on them.' };
}

export async function sendTestEmailAction(to: string) {
  await assertAdmin({ adminOnly: true });
  const email = to.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: 'Enter a valid address for the test.' };
  if (!rateLimit(`mailtest:${await clientIp()}`, 5, 10 * 60_000)) return { ok: false, message: 'Too many test emails. Wait a few minutes.' };
  const cfg = await getEmailConfig();
  if (!cfg) return { ok: false, message: 'Save a host, username and app password first.' };
  const res = await deliverEmail(email, 'Evermoon Jewels — test email', testEmailHtml(), { kind: 'test' });
  if (!res.sent) return { ok: false, message: res.error || 'The mail server rejected the message.' };
  return { ok: true, message: `Test email sent to ${email}. Check the inbox and spam folder.` };
}
