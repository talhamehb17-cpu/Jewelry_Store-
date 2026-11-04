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
  passwordLength: number | null;
  passwordShape: 'gmail-app' | 'other' | 'empty' | 'unreadable';
  usernameIsEmail: boolean;
  usernameMatchesAddress: boolean;
};

type Stored = Omit<EmailConfig, 'password'> & {
  passwordEnc: string | null;
  enabled?: boolean;
  lastSuccessAt?: string | null;
  lastError?: string | null;
  lastErrorAt?: string | null;
  workingPort?: number | null;
  workingAuth?: 'LOGIN' | 'PLAIN' | null;
};

/** Google shows App Passwords in groups of four. Spaces, newlines and invisible characters make Gmail return 535-5.7.8. */
export function normalizeSecret(value: string) {
  return value.replace(/[\s\u00a0\u200b\u200c\u200d\ufeff]+/g, '');
}

export function explainSmtpError(message: string) {
  if (/535|BadCredentials|Username and Password not accepted/i.test(message)) {
    return 'Gmail refused SMTP login (535-5.7.8) after the saved secret was decrypted and sent. This is not marked as sent. The diagnostics show username shape, password length, host, port and the AUTH method. A 535 means Gmail rejected the login; it does not by itself prove the characters were typed wrong.';
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
  passwordLength: null,
  passwordShape: 'empty',
  usernameIsEmail: false,
  usernameMatchesAddress: false,
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
    workingPort: v.workingPort === 465 || v.workingPort === 587 ? v.workingPort : null,
    workingAuth: v.workingAuth === 'LOGIN' || v.workingAuth === 'PLAIN' ? v.workingAuth : null,
  };
}

export function passwordShape(password: string): EmailPublic['passwordShape'] {
  if (!password) return 'empty';
  return /^[a-z]{16}$/i.test(password) ? 'gmail-app' : 'other';
}

export async function getEmailSettingsPublic(): Promise<EmailPublic> {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1);
  const stored = asStored(row?.value);
  if (!stored) return emptyPublic();
  const configured = !!(stored.host && stored.username && stored.passwordEnc && stored.address);
  let passwordLength: number | null = null;
  let shape: EmailPublic['passwordShape'] = stored.passwordEnc ? 'unreadable' : 'empty';
  if (stored.passwordEnc) {
    try {
      const password = normalizeSecret(decryptSecret(stored.passwordEnc));
      passwordLength = password.length;
      shape = passwordShape(password);
    } catch {
      shape = 'unreadable';
    }
  }
  return {
    address: stored.address,
    senderName: stored.senderName,
    host: stored.host,
    port: stored.workingPort || stored.port,
    username: stored.username,
    security: stored.security,
    hasPassword: !!stored.passwordEnc,
    configured,
    enabled: stored.enabled !== false,
    lastSuccessAt: stored.lastSuccessAt ?? null,
    lastError: stored.lastError ?? null,
    lastErrorAt: stored.lastErrorAt ?? null,
    passwordLength,
    passwordShape: shape,
    usernameIsEmail: stored.username.includes('@'),
    usernameMatchesAddress: stored.username.trim().toLowerCase() === stored.address.trim().toLowerCase(),
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
  let username = stored.username.replace(/\s+/g, '');
  const address = stored.address.trim();
  const gmail = /gmail\.com$/i.test(stored.host) || /gmail\.com$/i.test(username) || /gmail\.com$/i.test(address);
  if (gmail && !username.includes('@') && address.includes('@')) username = address.replace(/\s+/g, '');
  const security: EmailSecurity = gmail ? (stored.workingPort === 465 || stored.security === 'ssl' ? 'ssl' : 'starttls') : stored.security;
  const port = gmail ? (stored.workingPort === 465 || stored.workingPort === 587 ? stored.workingPort : security === 'ssl' ? 465 : 587) : stored.port;
  return {
    config: {
      address: (gmail ? username : address || username).trim(),
      senderName: stored.senderName || 'EVERMOON',
      host: gmail ? 'smtp.gmail.com' : stored.host.trim(),
      port,
      username,
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
    workingPort: password ? null : prev?.workingPort ?? null,
    workingAuth: password ? null : prev?.workingAuth ?? null,
  };
  await db
    .insert(settings)
    .values({ key: KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

type AuthMode = { port: number; secure: boolean; requireTLS: boolean; authMethod: 'LOGIN' | 'PLAIN' };

function modesFor(cfg: EmailConfig): AuthMode[] {
  const first: AuthMode = cfg.port === 465 || cfg.security === 'ssl'
    ? { port: 465, secure: true, requireTLS: false, authMethod: 'LOGIN' }
    : { port: 587, secure: false, requireTLS: true, authMethod: 'LOGIN' };
  const alt: AuthMode = first.port === 465
    ? { port: 587, secure: false, requireTLS: true, authMethod: 'PLAIN' }
    : { port: 465, secure: true, requireTLS: false, authMethod: 'PLAIN' };
  return [first, alt];
}

export function mailerFrom(cfg: EmailConfig, mode: AuthMode = modesFor(cfg)[0]!) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: mode.port,
    secure: mode.secure,
    auth: { user: cfg.username, pass: cfg.password },
    authMethod: mode.authMethod,
    requireTLS: mode.requireTLS,
    tls: { minVersion: 'TLSv1.2', servername: cfg.host },
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 20_000,
    family: 4,
  } as nodemailer.TransportOptions);
}

async function rememberWorkingMode(mode: AuthMode) {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1);
  const prev = asStored(row?.value);
  if (!prev) return;
  const value: Stored = {
    ...prev,
    port: mode.port,
    security: mode.port === 465 ? 'ssl' : 'starttls',
    workingPort: mode.port,
    workingAuth: mode.authMethod,
  };
  await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, KEY));
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
    const sendOnce = async (mode: AuthMode) => {
      attempts += 1;
      const transport = mailerFrom(cfg, mode);
      await transport.verify();
      await transport.sendMail({ from, to, subject, html });
      return mode;
    };
    const modes = modesFor(cfg);
    try {
      const mode = await sendOnce(modes[0]!);
      sent = true;
      via = `smtp:${mode.port}/${mode.authMethod}`;
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'SMTP send failed';
      const retry = temporarySmtp(raw) ? modes[0]! : modes[1];
      if (retry) {
        try {
          if (temporarySmtp(raw)) await new Promise((r) => setTimeout(r, 800));
          const mode = await sendOnce(retry);
          sent = true;
          via = `smtp:${mode.port}/${mode.authMethod}`;
          await rememberWorkingMode(mode).catch(() => undefined);
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

export type SmtpProbe = {
  configured: boolean;
  decrypt: 'ok' | 'failed' | 'missing';
  host: string | null;
  port: number | null;
  usernameIsEmail: boolean;
  usernameMatchesAddress: boolean;
  passwordLength: number | null;
  passwordShape: EmailPublic['passwordShape'];
  envOverride: false;
  accepted: boolean;
  steps: { step: string; ok: boolean; detail: string }[];
};

function maskMailbox(email: string) {
  const [name, domain] = email.split('@');
  if (!domain) return 'not-an-email';
  return `${name.slice(0, 2)}…@${domain}`;
}

/** Checks decrypt, host, port and SMTP AUTH. Never returns the password or sends mail. */
export async function probeMailbox(): Promise<SmtpProbe> {
  const pub = await getEmailSettingsPublic();
  const mailbox = await resolveMailbox();
  const report: SmtpProbe = {
    configured: pub.configured,
    decrypt: pub.passwordShape === 'unreadable' ? 'failed' : pub.hasPassword ? 'ok' : 'missing',
    host: mailbox.config?.host || pub.host || null,
    port: mailbox.config?.port ?? pub.port,
    usernameIsEmail: mailbox.config ? mailbox.config.username.includes('@') : pub.usernameIsEmail,
    usernameMatchesAddress: pub.usernameMatchesAddress,
    passwordLength: pub.passwordLength,
    passwordShape: pub.passwordShape,
    envOverride: false,
    accepted: false,
    steps: [],
  };
  if (!mailbox.config) {
    report.steps.push({ step: 'read mailbox', ok: false, detail: mailbox.error || 'Email is not configured.' });
    return report;
  }
  report.steps.push({
    step: 'decrypt',
    ok: true,
    detail: `Saved secret decrypted. Length ${pub.passwordLength}. Shape ${pub.passwordShape}. Username ${maskMailbox(mailbox.config.username)}.`,
  });
  const attempts: AuthMode[] = [
    { port: 587, secure: false, requireTLS: true, authMethod: 'LOGIN' },
    { port: 587, secure: false, requireTLS: true, authMethod: 'PLAIN' },
    { port: 465, secure: true, requireTLS: false, authMethod: 'LOGIN' },
    { port: 465, secure: true, requireTLS: false, authMethod: 'PLAIN' },
  ];
  for (const mode of attempts) {
    try {
      await mailerFrom(mailbox.config, mode).verify();
      report.accepted = true;
      report.steps.push({ step: `SMTP ${mode.port} ${mode.authMethod}`, ok: true, detail: 'The server accepted the login. No message was sent by this check.' });
      await rememberWorkingMode(mode).catch(() => undefined);
      break;
    } catch (error) {
      const err = error as { responseCode?: number; code?: string; response?: string; message?: string };
      const raw = String(err.response || err.message || 'Login was rejected').replace(/pass(?:word)?[=:]\S+/gi, '[secret]').slice(0, 280);
      report.steps.push({
        step: `SMTP ${mode.port} ${mode.authMethod}`,
        ok: false,
        detail: `${err.responseCode || err.code || 'error'}: ${raw}`,
      });
    }
  }
  if (!report.accepted) {
    const last = report.steps.filter((step) => !step.ok).at(-1)?.detail;
    await rememberEmailResult(false, last || 'SMTP login was not accepted').catch(() => undefined);
  }
  return report;
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
