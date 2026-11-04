import type { Order, OrderItem } from '@/db/schema';
import { formatMoney } from './money';
import { absoluteUrl, siteUrl } from './utils';
import { brandEmailLayout, deliverEmail, emailButton } from './mailer';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Sends through the admin SMTP account, then Resend if that is the only provider configured. */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  kind = 'transactional',
  meta: { orderId?: number; force?: boolean; campaignId?: number | null } = {},
) {
  const res = await deliverEmail(to, subject, html, { kind, ...meta });
  return { sent: res.sent, reason: res.error, via: res.via, status: res.status };
}

export function orderConfirmationEmail(order: Order, items: OrderItem[], link: string) {
  const rows = items
    .map(
      (i) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #E6DCCF">${i.image ? `<img src="${absoluteUrl(i.image)}" alt="" width="48" height="60" style="width:48px;height:60px;object-fit:cover;vertical-align:middle;margin-right:8px">` : ''}${esc(i.name)}${i.variantTitle ? ` <span style="color:#8A7F74">(${esc(i.variantTitle)})</span>` : ''} × ${i.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #E6DCCF;text-align:right">${formatMoney(i.lineTotal)}</td>
      </tr>`,
    )
    .join('');
  const pay = order.paymentPlan?.applied
    ? `Advance ${formatMoney(order.paymentPlan.advanceAmount)} by ${order.paymentMethod}, remaining ${formatMoney(order.paymentPlan.remainingAmount)} cash on delivery`
    : order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod === 'bank' ? 'Bank transfer' : order.paymentMethod === 'easypaisa' ? 'EasyPaisa' : order.paymentMethod === 'jazzcash' ? 'JazzCash' : order.paymentMethod;
  return brandEmailLayout(
    `Thank you, ${esc(order.customerName.split(' ')[0] || 'there')}`,
    `<p>We’ve received order <strong>${esc(order.number)}</strong>. The atelier will prepare it with care.</p>
     <p style="color:#8A7F74;font-size:13px">Payment: ${esc(pay)} · ${esc(order.shippingMethodName)} · payable ${formatMoney(order.total)} PKR</p>
     <p style="color:#8A7F74;font-size:13px">Delivery timing on the site is an estimate, not a guarantee. You can cancel from your account only while the order is Pending.</p>
     ${order.campaignDiscount ? `<p>Includes ${esc(order.campaignName || 'event sale')} savings of ${formatMoney(order.campaignDiscount)}.</p>` : ''}
     <table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:14px">${rows}
       ${order.discountTotal ? `<tr><td style="padding:8px 0">Discount${order.discountCode ? ` (${esc(order.discountCode)})` : ''}</td><td style="text-align:right">−${formatMoney(order.discountTotal)}</td></tr>` : ''}
       <tr><td style="padding:12px 0 0">Total</td><td style="padding:12px 0 0;text-align:right"><strong>${formatMoney(order.total)}</strong></td></tr>
     </table>
     ${emailButton(link, 'VIEW YOUR ORDER')}`,
  );
}

const STATUS_COPY: Record<string, string> = {
  pending: 'We’ve received your order.',
  confirmed: 'Your order is confirmed.',
  processing: 'Your order is being finished and packed.',
  shipped: 'Your order is on its way.',
  out_for_delivery: 'Your order is out for delivery.',
  delivered: 'Your order has been delivered.',
  cancelled: 'Your order has been cancelled.',
  paid: 'Your payment has been confirmed.',
  refunded: 'A refund has been recorded on your order.',
  failed: 'We could not verify the payment receipt.',
  delivery_request: 'Your order is out for delivery. Have you received your package?',
  delivery_issue: 'We have recorded that the package has not arrived. It is not marked delivered.',
  delivery_resolved: 'The delivery question on your order has been resolved.',
};

export function statusEmail(order: Order, message: string, link: string) {
  const title = STATUS_COPY[message] || `Order ${order.number}`;
  const tracking = order.trackingNumber ? `<p>Tracking: ${esc(order.trackingCarrier ?? '')} ${esc(order.trackingNumber)}</p>` : '';
  const service = order.shippingMethodName ? `<p style="color:#8A7F74">${esc(order.shippingMethodName)}</p>` : '';
  const confirm = message === 'delivery_request' ? `<p>This note is sent after the order is actually out for delivery. It is not sent just because the original estimate has passed. You can answer on the website, and the atelier can also confirm delivery after checking.</p>` : '';
  const who = message === 'delivered' && order.confirmationSource === 'admin' ? `<p>The atelier confirmed delivery${order.confirmationNote ? `: ${esc(order.confirmationNote)}` : '.'}</p>` : '';
  return brandEmailLayout(
    title,
    `<p>Order <strong>${esc(order.number)}</strong> — ${esc(title)}</p>${service}${tracking}${confirm}${who}<p style="color:#8A7F74">Total ${formatMoney(order.total)} PKR</p>${emailButton(link, 'VIEW ORDER')}`,
  );
}

export function resetEmail(link: string) {
  return brandEmailLayout(
    'Reset your password',
    `<p>Choose a new password with the link below. It expires in 60 minutes.</p>${emailButton(link, 'CHOOSE A NEW PASSWORD')}<p style="color:#8A7F74;font-size:13px">If you didn’t request this, you can ignore this email.</p>`,
  );
}

export function testEmailHtml() {
  return brandEmailLayout(
    'Your email settings work',
    `<p>This is a real message from EVERMOON. It was accepted by the mail server. Check the inbox and the spam folder.</p>${emailButton(siteUrl(), 'VISIT THE STORE')}`,
  );
}

export function campaignEmailHtml(input: {
  name: string;
  percent: number;
  description: string;
  endsAt: Date;
  image?: string | null;
  href: string;
  unsubscribe: string;
}) {
  const when = input.endsAt.toLocaleString('en-GB', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const img = input.image ? `<img src="${absoluteUrl(input.image)}" alt="" width="504" style="width:100%;max-width:504px;height:auto;display:block;margin:0 0 18px">` : '';
  return brandEmailLayout(
    esc(input.name),
    `${img}<p style="font-family:Georgia,serif;font-size:28px;margin:0 0 8px">${input.percent}% off</p>
     <p>${esc(input.description || 'A private edit from the Lahore studio.')}</p>
     <p style="color:#8A7F74">Ends ${esc(when)} PKT. The discount stops automatically when the timer reaches zero.</p>
     ${emailButton(absoluteUrl(input.href || '/shop'), 'SHOP THE SALE')}`,
    { unsubscribe: input.unsubscribe },
  );
}

export function arrivalEmailHtml(input: { name: string; price: number; description: string; image?: string | null; href: string; unsubscribe: string }) {
  const img = input.image ? `<img src="${absoluteUrl(input.image)}" alt="" width="504" style="width:100%;max-width:504px;height:auto;display:block;margin:0 0 18px">` : '';
  return brandEmailLayout(
    'New arrival',
    `${img}<h2 style="font-weight:400;font-size:22px;margin:0 0 8px">${esc(input.name)}</h2>
     <p style="font-size:16px;margin:0 0 12px">${formatMoney(input.price)}</p>
     <p>${esc(input.description.slice(0, 280))}</p>
     ${emailButton(absoluteUrl(input.href), 'SHOP NOW')}`,
    { unsubscribe: input.unsubscribe },
  );
}
