import { eq } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import { getDb } from '@/db';
import { emailLogs, settings } from '@/db/schema';
import { decryptSecret, encryptSecret } from './crypto-box';
import { absoluteUrl, siteUrl } from './utils';

const KEY = 'email_smtp';

export type EmailSecurity = 'none' | 'starttls' | 'ssl';

export type EmailConfig = {
  address: string;
  senderName: string;
  host: string;
  port: number;
  username: string;
  password: string;
  security: EmailSecurity;
};

export type EmailPublic = {
  address: string;
  senderName: string;
  host: string;
  port: number;
  username: string;
  security: EmailSecurity;
  hasPassword: boolean;
  configured: boolean;
};

type Stored = Omit<EmailConfig, 'password'> & { passwordEnc: string | null };

const emptyPublic = (): EmailPublic => ({
  address: '',
  senderName: 'Evermoon Jewels',
  host: '',
  port: 587,
  username: '',
  security: 'starttls',
  hasPassword: false,
  configured: false,
});

function asStored(value: unknown): Stored | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const security = v.security === 'ssl' || v.security === 'none' || v.security === 'starttls' ? v.security : 'starttls';
  return {
    address: typeof v.address === 'string' ? v.address : '',
    senderName: typeof v.senderName === 'string' ? v.senderName : 'Evermoon Jewels',
    host: typeof v.host === 'string' ? v.host : '',
    port: Number(v.port) || 587,
    username: typeof v.username === 'string' ? v.username : '',
    passwordEnc: typeof v.passwordEnc === 'string' ? v.passwordEnc : null,
    security,
  };
}

export async function getEmailSettingsPublic(): Promise<EmailPublic> {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1);
  const stored = asStored(row?.value);
  if (!stored) return emptyPublic();
  const configured = !!(stored.host && stored.username && stored.passwordEnc && stored.address);
  return {
    address: stored.address,
    senderName: stored.senderName,
    host: stored.host,
    port: stored.port,
    username: stored.username,
    security: stored.security,
    hasPassword: !!stored.passwordEnc,
    configured,
  };
}

export async function getEmailConfig(): Promise<EmailConfig | null> {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1);
  const stored = asStored(row?.value);
  if (!stored?.passwordEnc || !stored.host || !stored.username) return null;
  let password = '';
  try {
    password = decryptSecret(stored.passwordEnc);
  } catch {
    return null;
  }
  if (!password) return null;
  return {
    address: stored.address || stored.username,
    senderName: stored.senderName || 'Evermoon Jewels',
    host: stored.host,
    port: stored.port,
    username: stored.username,
    password,
    security: stored.security,
  };
}

export async function saveEmailSettings(input: {
  address: string;
  senderName: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  security: EmailSecurity;
}) {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1);
  const prev = asStored(row?.value);
  const passwordEnc = input.password?.trim() ? encryptSecret(input.password.trim()) : prev?.passwordEnc ?? null;
  const value: Stored = {
    address: input.address.trim().slice(0, 255),
    senderName: input.senderName.trim().slice(0, 120) || 'Evermoon Jewels',
    host: input.host.trim().slice(0, 255),
    port: Math.min(65535, Math.max(1, Math.floor(input.port) || 587)),
    username: input.username.trim().slice(0, 255),
    passwordEnc,
    security: input.security,
  };
  await db
    .insert(settings)
    .values({ key: KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

export function mailerFrom(cfg: EmailConfig) {
  const secure = cfg.security === 'ssl' || cfg.port === 465;
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure,
    auth: { user: cfg.username, pass: cfg.password },
    requireTLS: cfg.security === 'starttls',
    tls: { minVersion: 'TLSv1.2' },
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 20_000,
  });
}

export async function deliverEmail(to: string, subject: string, html: string, meta: { kind: string; campaignId?: number | null } = { kind: 'transactional' }) {
  const cfg = await getEmailConfig();
  let sent = false;
  let error: string | undefined;
  let via = 'none';
  if (cfg) {
    try {
      const from = `${cfg.senderName} <${cfg.address || cfg.username}>`;
      await mailerFrom(cfg).sendMail({ from, to, subject, html });
      sent = true;
      via = 'smtp';
    } catch (e) {
      error = e instanceof Error ? e.message : 'SMTP send failed';
    }
  } else if (process.env.RESEND_API_KEY) {
    try {
      const from = process.env.EMAIL_FROM || 'Evermoon Jewels <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, html }),
      });
      sent = res.ok;
      via = 'resend';
      if (!res.ok) error = `Email provider returned ${res.status}`;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Email provider failed';
    }
  } else {
    error = 'Email is not configured. Add SMTP details in Admin → Settings.';
  }
  try {
    const db = await getDb();
    await db.insert(emailLogs).values({
      kind: meta.kind.slice(0, 40),
      toEmail: to.slice(0, 255),
      subject: subject.slice(0, 255),
      campaignId: meta.campaignId ?? null,
      status: sent ? 'sent' : 'failed',
      error: error?.slice(0, 500) ?? null,
    });
  } catch {
    // A log failure must not hide the send result.
  }
  return { sent, error, via };
}

export function brandEmailLayout(title: string, body: string, opts: { unsubscribe?: string } = {}) {
  const logo = absoluteUrl('/images/brand/logo.webp');
  const home = siteUrl();
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#F6F1EA;color:#2B2622">
  <div style="display:none;max-height:0;overflow:hidden">${title}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F1EA;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf9;border:1px solid #E6DCCF">
        <tr><td style="padding:28px 28px 8px;text-align:center">
          <img src="${logo}" alt="Evermoon Jewels" width="72" height="72" style="display:block;margin:0 auto 12px;width:72px;height:72px;object-fit:contain">
          <p style="margin:0;font-family:Georgia,serif;letter-spacing:0.28em;font-size:13px">EVERMOON</p>
        </td></tr>
        <tr><td style="padding:8px 28px 28px;font-family:Georgia,Helvetica,Arial,sans-serif">
          <h1 style="font-weight:400;font-size:26px;line-height:1.25;margin:12px 0 16px">${title}</h1>
          <div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#3c342c">${body}</div>
        </td></tr>
        <tr><td style="padding:18px 28px 26px;border-top:1px solid #E6DCCF;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8A7F74">
          Evermoon Jewels · 42-C Main Boulevard, Gulberg III, Lahore<br>
          <a href="${home}" style="color:#8A6A2F">${home.replace(/^https?:\/\//, '')}</a>
          · <a href="tel:+923001234567" style="color:#8A6A2F">+92 300 1234567</a>
          ${opts.unsubscribe ? `<br><a href="${opts.unsubscribe}" style="color:#8A7F74">Unsubscribe from promotional emails</a>` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function emailButton(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${href}" style="display:inline-block;background:#2B2622;color:#FBF7F1;text-decoration:none;padding:13px 22px;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.16em">${label}</a></p>`;
}
