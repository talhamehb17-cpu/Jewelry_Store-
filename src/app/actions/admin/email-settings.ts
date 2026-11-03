'use server';

import { z } from 'zod';
import { assertAdmin } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getEmailConfig, gmailAppPasswordError, normalizeSecret, saveEmailSettings, type EmailSecurity } from '@/lib/mailer';
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
  enabled: z.boolean().optional().default(true),
});

export async function saveEmailSettingsAction(input: z.input<typeof schema>) {
  await assertAdmin({ adminOnly: true });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };
  const d = parsed.data;
  const existing = await getEmailConfig();
  const password = normalizeSecret(d.password);
  if (!password && !existing) return { ok: false, message: 'Enter the Gmail App Password. It is stored encrypted and is never sent back to the browser.' };
  const gmail = /gmail/i.test(d.host) || /gmail\.com$/i.test(d.username);
  if (gmail && password) {
    const problem = gmailAppPasswordError(password);
    if (problem) return { ok: false, message: problem };
  }
  if (gmail && !d.username.includes('@')) return { ok: false, message: 'The Gmail username must be the full email address.' };
  await saveEmailSettings({ ...d, security: d.security as EmailSecurity, password: password || undefined, enabled: d.enabled });
  return { ok: true, message: 'Email settings saved. Send a test — success is shown only if the server accepts the login.' };
}

export async function sendTestEmailAction(to: string) {
  await assertAdmin({ adminOnly: true });
  const email = to.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: 'Enter a valid address for the test.' };
  if (!rateLimit(`mailtest:${await clientIp()}`, 5, 10 * 60_000)) return { ok: false, message: 'Too many test emails. Wait a few minutes.' };
  const cfg = await getEmailConfig();
  if (!cfg) return { ok: false, message: 'Save a host, username and app password first.' };
  const res = await deliverEmail(email, 'EVERMOON — test email', testEmailHtml(), { kind: 'test' });
  if (!res.sent) return { ok: false, message: res.error || 'The mail server rejected the message. Nothing was marked as sent.' };
  return { ok: true, message: `The mail server accepted a test message for ${email}. Check the inbox and spam folder. Accepted is not the same as opened.` };
}
