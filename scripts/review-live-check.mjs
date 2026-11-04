/**
 * Drives the live storefront: a new customer buys, reviews, and an admin approves.
 * Does not touch any order it did not just create.
 * Run only from a machine that can reach the store. Requires Playwright.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = (process.env.STORE_URL || 'https://aurelle-jewelry-zeta.vercel.app').replace(/\/$/, '');
const adminEmail = process.env.ADMIN_EMAIL || '';
const adminPassword = process.env.ADMIN_PASSWORD || '';
const stamp = Date.now().toString(36);
const email = `review.check.${stamp}@example.com`;
const password = `ReviewCheck#${stamp.slice(-6)}1a`;
const reviewTitle = `Checked ${stamp}`;
const reviewBody = `The pearl sits lightly and the gold hook is comfortable. Live check ${stamp}.`;
const rejectedBody = `This note must stay hidden from the product page. Live check ${stamp}.`;
const outDir = 'review-live-check';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

if (!adminEmail || !adminPassword) {
  console.error('ADMIN_EMAIL and ADMIN_PASSWORD are required.');
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
const notes = [];
const log = (line) => {
  notes.push(line);
  console.log(line);
};

const browser = await chromium.launch({ headless: true });
const customer = await browser.newContext();
const admin = await browser.newContext();
const guest = await browser.newContext();
const customerPage = await customer.newPage();
const adminPage = await admin.newPage();
const guestPage = await guest.newPage();
customerPage.setDefaultTimeout(45000);
adminPage.setDefaultTimeout(45000);
guestPage.setDefaultTimeout(30000);

async function shot(page, name) {
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true }).catch(() => undefined);
}

async function addCeleste(page) {
  await page.goto(`${base}/products/celeste-pearl-earrings`, { waitUntil: 'domcontentloaded' });
  const needsSize = await page.getByText('Select a size to see availability').isVisible().catch(() => false);
  if (needsSize) {
    const choice = page.locator('button[aria-pressed="false"]').first();
    if (await choice.count()) await choice.click();
  }
  await page.getByRole('button', { name: 'Add to bag', exact: true }).first().click();
  await page.waitForTimeout(800);
  await page.goto(`${base}/checkout`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Checkout' }).waitFor();
  if (await page.getByText('Your bag is empty').isVisible().catch(() => false)) {
    throw new Error('The bag was empty at checkout.');
  }
}

async function placeCod(page, note) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mobile number').fill('03001234567');
  await page.getByLabel('First name').fill('Review');
  await page.getByLabel('Last name').fill('Check');
  await page.getByLabel('Address', { exact: true }).fill('Review check lane');
  await page.getByLabel('City').fill('Lahore');
  await page.getByLabel('Province').selectOption('Punjab');
  const save = page.getByLabel('Save this address to my account');
  if (await save.isVisible().catch(() => false)) await save.uncheck().catch(() => undefined);
  await page.getByLabel('Order note (optional)').fill(note);
  const cod = page.getByRole('radio', { name: /Cash on Delivery/i });
  if (await cod.count()) await cod.check();
  await page.getByRole('button', { name: /Place order/ }).click();
  await page.waitForURL(/order=/, { timeout: 70000 });
  const number = new URL(page.url()).searchParams.get('order');
  if (!number) throw new Error(`Checkout did not return an order number: ${page.url()}`);
  return number;
}

async function deliver(number) {
  await adminPage.goto(`${base}/admin/orders?q=${encodeURIComponent(number)}`, { waitUntil: 'domcontentloaded' });
  const link = adminPage.getByRole('link', { name: number, exact: true });
  await link.waitFor();
  await link.click();
  await adminPage.waitForURL(/\/admin\/orders\/\d+/);
  const notify = adminPage.getByLabel(/Email the customer about this update/i);
  if (await notify.isVisible().catch(() => false)) await notify.uncheck().catch(() => undefined);
  for (const label of ['Mark Confirmed', 'Mark Processing']) {
    const button = adminPage.getByRole('button', { name: label, exact: true });
    await button.waitFor();
    await button.click();
    await adminPage.getByText(/Order marked as/i).waitFor({ timeout: 40000 });
  }
  await adminPage.getByRole('button', { name: 'Mark as delivered', exact: true }).click();
  await adminPage.getByRole('button', { name: 'Yes, mark delivered' }).click();
  await adminPage.getByText(/Marked delivered/i).waitFor({ timeout: 40000 });
}

async function submitReview(body, title) {
  await customerPage.goto(`${base}/products/celeste-pearl-earrings#reviews`, { waitUntil: 'domcontentloaded' });
  await customerPage.getByRole('button', { name: 'Write a review' }).click();
  await customerPage.getByRole('button', { name: '5 stars' }).click();
  await customerPage.getByLabel('Title').fill(title);
  await customerPage.getByLabel('Review').fill(body);
  await customerPage.getByLabel('Name').fill('Review Check');
  await customerPage.locator('#rv-avatar').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png });
  await customerPage.getByRole('button', { name: 'Submit review' }).click();
  await customerPage.getByText(/will appear beside the other reviews/i).waitFor({ timeout: 40000 });
}

try {
  await customerPage.emulateMedia({ reducedMotion: 'reduce' });
  await customerPage.goto(`${base}/account/register`, { waitUntil: 'domcontentloaded' });
  await customerPage.locator('#up-f-firstName').fill('Review');
  await customerPage.locator('#up-f-lastName').fill('Check');
  await customerPage.locator('#up-f-email').fill(email);
  await customerPage.locator('#up-f-password').fill(password);
  const marketing = customerPage.locator('input[name="marketing"]');
  if (await marketing.isChecked()) await marketing.uncheck();
  await customerPage.getByRole('button', { name: 'Create account' }).click();
  await customerPage.waitForURL(/\/account/, { timeout: 40000 });
  await customerPage.emulateMedia({ reducedMotion: 'no-preference' });
  log(`customer ${email}`);

  await addCeleste(customerPage);
  const approvedOrder = await placeCod(customerPage, `Review display check ${stamp}. Not a customer sale.`);
  log(`approved-order ${approvedOrder}`);
  await adminPage.goto(`${base}/admin/login`, { waitUntil: 'domcontentloaded' });
  await adminPage.locator('#f-email').fill(adminEmail);
  await adminPage.locator('#f-password').fill(adminPassword);
  await adminPage.getByRole('button', { name: 'Sign in' }).click();
  await adminPage.waitForURL(/\/admin(?!\/login)/, { timeout: 40000 });
  await deliver(approvedOrder);
  log(`delivered ${approvedOrder}`);

  await submitReview(reviewBody, reviewTitle);
  log('submitted pending review');
  await guestPage.goto(`${base}/products/celeste-pearl-earrings?v=${stamp}#reviews`, { waitUntil: 'networkidle' });
  await guestPage.waitForTimeout(6000);
  const pendingVisible = await guestPage.getByText(reviewBody).count();
  if (pendingVisible) throw new Error('Pending review was visible on the public product page.');
  log('pending review stayed hidden');

  await guestPage.goto(`${base}/products/celeste-pearl-earrings?v=${stamp}#reviews`, { waitUntil: 'domcontentloaded' });
  await adminPage.goto(`${base}/admin/reviews?status=pending`, { waitUntil: 'domcontentloaded' });
  const pendingRow = adminPage.locator('li', { hasText: reviewBody });
  await pendingRow.waitFor();
  await pendingRow.getByRole('button', { name: 'Approve' }).click();
  await adminPage.waitForTimeout(1500);
  log('approved');

  const card = guestPage.locator('article', { hasText: reviewBody });
  await card.waitFor({ timeout: 20000 });
  const motion = await card.evaluate((el) => ({
    className: el.className,
    animationName: getComputedStyle(el).animationName,
  }));
  if (!String(motion.className).includes('review-enter')) throw new Error(`New review did not receive the entrance class: ${motion.className}`);
  log(`animation ${motion.animationName}`);
  await shot(guestPage, 'appeared');
  const beside = await guestPage.getByText(/Studio testimonial/i).count();
  if (!beside) throw new Error('The studio review was missing from the same section.');
  const verified = await card.getByText('Verified purchase').count();
  if (!verified) throw new Error('Approved review was not marked Verified purchase.');
  const name = await card.getByText('Review Check').count();
  if (!name) throw new Error('Approved review did not show the customer name.');

  await guestPage.reload({ waitUntil: 'domcontentloaded' });
  await guestPage.getByText(reviewBody).waitFor({ timeout: 20000 });
  await shot(guestPage, 'after-refresh');
  const api = await guestPage.request.get(`${base}/api/reviews?slug=celeste-pearl-earrings&limit=12&t=${Date.now()}`);
  const payload = await api.json();
  const row = (payload.reviews || []).find((item) => String(item.body).includes(stamp) && item.body === reviewBody);
  if (!row) throw new Error('Public review API did not return the approved review.');
  if (!row.verified || row.studio) throw new Error('Approved review was not stored as a verified customer review.');
  if (!row.avatar || row.avatar.startsWith('blob:') || row.avatar.startsWith('data:')) throw new Error('Profile picture was not a stored image address.');
  log(`api-avatar ${row.avatar}`);

  await addCeleste(customerPage);
  const rejectedOrder = await placeCod(customerPage, `Rejected review check ${stamp}. Not a customer sale.`);
  log(`rejected-order ${rejectedOrder}`);
  await deliver(rejectedOrder);
  await submitReview(rejectedBody, `Hidden ${stamp}`);
  await adminPage.goto(`${base}/admin/reviews?status=pending`, { waitUntil: 'domcontentloaded' });
  const rejectRow = adminPage.locator('li', { hasText: rejectedBody });
  await rejectRow.waitFor();
  await rejectRow.getByRole('button', { name: 'Reject' }).click();
  await adminPage.waitForTimeout(1500);
  await guestPage.goto(`${base}/products/celeste-pearl-earrings?v=hidden-${stamp}`, { waitUntil: 'networkidle' });
  await guestPage.waitForTimeout(6000);
  if (await guestPage.getByText(rejectedBody).count()) throw new Error('Rejected review appeared on the product page.');
  if (!(await guestPage.getByText(reviewBody).count())) throw new Error('Approved review disappeared after the rejection check.');
  const hiddenApi = await guestPage.request.get(`${base}/api/reviews?slug=celeste-pearl-earrings&limit=24&t=${Date.now()}`);
  const hiddenPayload = await hiddenApi.json();
  if ((hiddenPayload.reviews || []).some((item) => item.body === rejectedBody)) throw new Error('Rejected review was returned by the public API.');
  log('rejected review stayed hidden');
  await shot(guestPage, 'final');

  await writeFile(`${outDir}/result.json`, JSON.stringify({ ok: true, stamp, email, approvedOrder, rejectedOrder, reviewBody, reviewTitle, animation: motion, avatar: row.avatar, notes }, null, 2));
  log('live review check passed');
} catch (error) {
  await shot(customerPage, 'customer-error');
  await shot(adminPage, 'admin-error');
  await shot(guestPage, 'guest-error');
  await writeFile(`${outDir}/result.json`, JSON.stringify({ ok: false, stamp, email, error: error instanceof Error ? error.message : String(error), notes }, null, 2));
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
