import { and, desc, eq } from 'drizzle-orm';
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
  enabled: boolean;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
};

type Stored = Omit<EmailConfig, 'password'> & {
  passwordEnc: string | null;
  enabled?: boolean;
  lastSuccessAt?: string | null;
  lastError?: string | null;
  lastErrorAt?: string | null;
};

/** Google shows App Passwords in groups of four. Spaces, newlines and invisible characters make Gmail return 535-5.7.8. */
export function normalizeSecret(value: string) {
  return value.replace(/[\s\u00a0\u200b\u200c\u200d\ufeff]+/g, '');
}

export function explainSmtpError(message: string) {
  if (/535|BadCredentials|Username and Password not accepted/i.test(message)) {
    return 'Gmail rejected the login (535-5.7.8 Username and Password not accepted). Use a 16-letter App Password from https://myaccount.google.com/apppasswords — not the normal Gmail password. 2-Step Verification must be on. The username must be the full Gmail address. Host smtp.gmail.com, port 587 with STARTTLS, or port 465 with SSL. Spaces in the App Password are removed automatically.';
  }
  return message.slice(0, 500);
}

export function gmailAppPasswordError(password: string) {
  if (/^[a-z]{16}$/i.test(password)) return null;
  return 'This is not a Gmail App Password. It must be 16 letters, from https://myaccount.google.com/apppasswords, after 2-Step Verification is on. Do not enter your normal Gmail password — Gmail answers that with 535-5.7.8.';
}

const emptyPublic = (): EmailPublic => ({
  address: '',
  senderName: 'EVERMOON',
  host: '',
  port: 587,
  username: '',
  security: 'starttls',
  hasPassword: false,
  configured: false,
  enabled: true,
  lastSuccessAt: null,
  lastError: null,
  lastErrorAt: null,
});

function asStored(value: unknown): Stored | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const security = v.security === 'ssl' || v.security === 'none' || v.security === 'starttls' ? v.security : 'starttls';
  return {
    address: typeof v.address === 'string' ? v.address : '',
    senderName: typeof v.senderName === 'string' ? v.senderName : 'EVERMOON',
    host: typeof v.host === 'string' ? v.host : '',
    port: Number(v.port) || 587,
    username: typeof v.username === 'string' ? v.username : '',
    passwordEnc: typeof v.passwordEnc === 'string' ? v.passwordEnc : null,
    security,
    enabled: v.enabled !== false,
    lastSuccessAt: typeof v.lastSuccessAt === 'string' ? v.lastSuccessAt : null,
    lastError: typeof v.lastError === 'string' ? v.lastError : null,
    lastErrorAt: typeof v.lastErrorAt === 'string' ? v.lastErrorAt : null,
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
    enabled: stored.enabled !== false,
    lastSuccessAt: stored.lastSuccessAt ?? null,
    lastError: stored.lastError ?? null,
    lastErrorAt: stored.lastErrorAt ?? null,
  };
}

export async function resolveMailbox(): Promise<{ config: EmailConfig | null; error?: string; enabled: boolean }> {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1);
  const stored = asStored(row?.value);
  if (!stored?.passwordEnc || !stored.host || !stored.username) {
    return { config: null, error: 'Email is not configured. Add SMTP details in Admin → Settings.', enabled: stored?.enabled !== false };
  }
  let password = '';
  try {
    password = normalizeSecret(decryptSecret(stored.passwordEnc));
  } catch {
    return { config: null, error: 'The saved app password could not be read. Enter it again. It was not sent.', enabled: stored.enabled !== false };
  }
  if (!password) return { config: null, error: 'The saved app password is empty. Enter it again.', enabled: stored.enabled !== false };
  const gmail = /gmail\.com$/i.test(stored.host) || /gmail\.com$/i.test(stored.username);
  const security: EmailSecurity = gmail ? (stored.security === 'ssl' ? 'ssl' : 'starttls') : stored.security;
  return {
    config: {
      address: (gmail ? stored.username : stored.address || stored.username).trim(),
      senderName: stored.senderName || 'EVERMOON',
      host: gmail ? 'smtp.gmail.com' : stored.host.trim(),
      port: gmail ? (security === 'ssl' ? 465 : 587) : stored.port,
      username: stored.username.trim(),
      password,
      security,
    },
    enabled: stored.enabled !== false,
  };
}

export async function getEmailConfig(): Promise<EmailConfig | null> {
  return (await resolveMailbox()).config;
}

async function rememberEmailResult(ok: boolean, error?: string) {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1);
  const prev = asStored(row?.value);
  if (!prev) return;
  const now = new Date().toISOString();
  const value: Stored = {
    ...prev,
    lastSuccessAt: ok ? now : prev.lastSuccessAt ?? null,
    lastError: ok ? null : error?.slice(0, 500) ?? 'Send failed',
    lastErrorAt: ok ? prev.lastErrorAt ?? null : now,
  };
  await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, KEY));
}

export async function saveEmailSettings(input: {
  address: string;
  senderName: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  security: EmailSecurity;
  enabled?: boolean;
}) {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1);
  const prev = asStored(row?.value);
  const gmail = /gmail/i.test(input.host) || /gmail\.com$/i.test(input.username);
  const password = input.password ? normalizeSecret(input.password) : '';
  const passwordEnc = password ? encryptSecret(password) : prev?.passwordEnc ?? null;
  const security: EmailSecurity = gmail ? (input.security === 'ssl' ? 'ssl' : 'starttls') : input.security;
  const value: Stored = {
    address: input.address.trim().slice(0, 255),
    senderName: input.senderName.trim().slice(0, 120) || 'EVERMOON',
    host: (gmail ? 'smtp.gmail.com' : input.host.trim()).slice(0, 255),
    port: gmail ? (security === 'ssl' ? 465 : 587) : Math.min(65535, Math.max(1, Math.floor(input.port) || 587)),
    username: input.username.trim().slice(0, 255),
    passwordEnc,
    security,
    enabled: input.enabled !== false,
    lastSuccessAt: prev?.lastSuccessAt ?? null,
    lastError: prev?.lastError ?? null,
    lastErrorAt: prev?.lastErrorAt ?? null,
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

function temporarySmtp(message: string) {
  return /timeout|ECONNECTION|ETIMEDOUT|ECONNRESET|421|450|451|452/i.test(message) && !/535/.test(message);
}

export async function deliverEmail(
  to: string,
  subject: string,
  html: string,
  meta: { kind: string; campaignId?: number | null; orderId?: number | null; force?: boolean } = { kind: 'transactional' },
) {
  const db = await getDb();
  if (meta.orderId && !meta.force) {
    const [prior] = await db
      .select({ id: emailLogs.id })
      .from(emailLogs)
      .where(and(eq(emailLogs.orderId, meta.orderId), eq(emailLogs.kind, meta.kind.slice(0, 40)), eq(emailLogs.status, 'sent')))
      .limit(1);
    if (prior) return { sent: false, error: 'Already accepted for this order event.', via: 'duplicate', status: 'skipped' as const };
  }
  const mailbox = await resolveMailbox();
  let sent = false;
  let error: string | undefined;
  let via = 'none';
  let attempts = 0;
  if (mailbox.config && !mailbox.enabled) {
    error = 'Email is turned off in Admin → Settings.';
    via = 'disabled';
  } else if (mailbox.config) {
    const cfg = mailbox.config;
    const from = `${cfg.senderName} <${cfg.address || cfg.username}>`;
    const sendOnce = async () => {
      attempts += 1;
      const transport = mailerFrom(cfg);
      await transport.verify();
      const info = await transport.sendMail({ from, to, subject, html });
      return info;
    };
    try {
      await sendOnce();
      sent = true;
      via = 'smtp';
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'SMTP send failed';
      if (temporarySmtp(raw)) {
        try {
          await new Promise((r) => setTimeout(r, 800));
          await sendOnce();
          sent = true;
          via = 'smtp';
        } catch (again) {
          error = explainSmtpError(again instanceof Error ? again.message : raw);
        }
      } else {
        error = explainSmtpError(raw);
      }
    }
  } else if (mailbox.error && /could not be read|empty/i.test(mailbox.error)) {
    error = mailbox.error;
  } else if (process.env.RESEND_API_KEY) {
    try {
      attempts = 1;
      const from = process.env.EMAIL_FROM || 'EVERMOON <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, html }),
      });
      sent = res.ok;
      via = 'resend';
      if (!res.ok) error = `Email provider returned ${res.status}. This is not an SMTP acceptance.`;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Email provider failed';
    }
  } else {
    error = mailbox.error || 'Email is not configured. Add SMTP details in Admin → Settings.';
  }
  const status = sent ? 'sent' : via === 'duplicate' || via === 'disabled' ? 'skipped' : 'failed';
  try {
    await db.insert(emailLogs).values({
      kind: meta.kind.slice(0, 40),
      toEmail: to.slice(0, 255),
      subject: subject.slice(0, 255),
      campaignId: meta.campaignId ?? null,
      orderId: meta.orderId ?? null,
      status,
      error: sent ? null : error?.slice(0, 500) ?? null,
      attempts: Math.max(1, attempts),
    });
  } catch {
    // A log failure must not hide the send result.
  }
  if (mailbox.config) await rememberEmailResult(sent, error).catch(() => undefined);
  return { sent, error, via, status };
}

export async function recentEmailLogs(limit = 12) {
  const db = await getDb();
  return db.select().from(emailLogs).orderBy(desc(emailLogs.createdAt)).limit(limit);
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
          <img src="${logo}" alt="EVERMOON" width="72" height="72" style="display:block;margin:0 auto 12px;width:72px;height:72px;object-fit:contain">
          <p style="margin:0;font-family:Georgia,serif;letter-spacing:0.28em;font-size:13px">EVERMOON</p>
        </td></tr>
        <tr><td style="padding:8px 28px 28px;font-family:Georgia,Helvetica,Arial,sans-serif">
          <h1 style="font-weight:400;font-size:26px;line-height:1.25;margin:12px 0 16px">${title}</h1>
          <div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#3c342c">${body}</div>
        </td></tr>
        <tr><td style="padding:18px 28px 26px;border-top:1px solid #E6DCCF;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8A7F74">
          EVERMOON<br>
          <a href="${home}" style="color:#8A6A2F">${home.replace(/^https?:\/\//, '')}</a>
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
