import type { Order, OrderItem } from '@/db/schema';
import { formatMoney } from './money';
import { siteUrl } from './utils';

/** Sends transactional email through Resend when RESEND_API_KEY is configured; otherwise a no-op. */
export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false as const, reason: 'Email provider not configured' };
  const from = process.env.EMAIL_FROM || 'Maison Aurelle <onboarding@resend.dev>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return { sent: res.ok as boolean };
  } catch {
    return { sent: false as const };
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#FBF7F1;font-family:Helvetica,Arial,sans-serif;color:#2B2622">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px">
    <p style="text-align:center;font-family:Georgia,serif;letter-spacing:6px;font-size:22px;margin:0 0 32px">AURELLE</p>
    <h1 style="font-family:Georgia,serif;font-weight:400;font-size:26px;margin:0 0 16px">${esc(title)}</h1>
    ${body}
    <p style="margin-top:40px;font-size:12px;color:#8A7F74">Maison Aurelle · Gulberg III, Lahore · <a href="${siteUrl()}" style="color:#8A7F74">${siteUrl().replace(/^https?:\/\//, '')}</a></p>
  </div></body></html>`;
}

export function orderConfirmationEmail(order: Order, items: OrderItem[], link: string) {
  const rows = items
    .map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #E6DCCF">${esc(i.name)}${i.variantTitle ? ` <span style="color:#8A7F74">(${esc(i.variantTitle)})</span>` : ''} × ${i.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #E6DCCF;text-align:right">${formatMoney(i.lineTotal)}</td></tr>`)
    .join('');
  return layout(
    `Thank you, ${order.customerName.split(' ')[0]}`,
    `<p>We’ve received your order <strong>${order.number}</strong> and our atelier is preparing it with care.</p>
     <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px">${rows}
     <tr><td style="padding:12px 0 0">Total</td><td style="padding:12px 0 0;text-align:right"><strong>${formatMoney(order.total)}</strong></td></tr></table>
     <p><a href="${link}" style="display:inline-block;background:#2B2622;color:#FBF7F1;padding:12px 22px;text-decoration:none;font-size:12px;letter-spacing:2px">VIEW YOUR ORDER</a></p>`,
  );
}

export function statusEmail(order: Order, message: string, link: string) {
  return layout(`Order ${order.number}: ${message}`, `<p>${esc(message)}.</p>${order.trackingNumber ? `<p>Tracking: ${esc(order.trackingCarrier ?? '')} ${esc(order.trackingNumber)}</p>` : ''}<p><a href="${link}">View order details</a></p>`);
}

export function resetEmail(link: string) {
  return layout('Reset your password', `<p>Click the link below to choose a new password. This link expires in 60 minutes.</p><p><a href="${link}">${link}</a></p><p style="color:#8A7F74;font-size:13px">If you didn’t request this, you can ignore this email.</p>`);
}
