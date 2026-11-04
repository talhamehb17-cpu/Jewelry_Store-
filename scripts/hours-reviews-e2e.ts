/**
 * Store-hours maths and verified-review eligibility. Uses an embedded database only.
 */
import { rmSync } from 'node:fs';
import { eq } from 'drizzle-orm';

delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;
process.env.PGLITE_DIR = '/tmp/evermoon-hours-reviews';
process.env.AUTH_SECRET = 'hours-reviews-e2e-secret-32-characters';
rmSync(process.env.PGLITE_DIR, { recursive: true, force: true });

async function main() {
  const hours = await import('../src/lib/store-hours');
  const { defaultSchedule, isPlaceholderHours, scheduleError, storeStatus } = hours;
  type HoursSchedule = import('../src/lib/store-hours').HoursSchedule;
  const { logoutDestination } = await import('../src/lib/auth');
  const { imageTypeMatches } = await import('../src/lib/image-upload');
  const failures: string[] = [];
  const check = (name: string, ok: boolean, detail = '') => {
    if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
    else console.log(`ok  ${name}`);
  };

  const openWeek = (patch: Partial<HoursSchedule['days']['mon']> = {}): HoursSchedule => {
    const schedule = defaultSchedule('Asia/Karachi');
    for (const day of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const) {
      schedule.days[day] = { closed: false, open: '11:00', close: '20:00', breakStart: null, breakEnd: null, ...patch };
    }
    return schedule;
  };

  const at = (iso: string) => new Date(iso);
  const standard = openWeek();
  check('open during published hours', storeStatus(standard, at('2026-06-01T06:30:00.000Z')).label.startsWith('Open now'));
  check('closes at 8:00 PM', storeStatus(standard, at('2026-06-01T06:30:00.000Z')).label.includes('Closes at 8:00 PM'));
  check('closed before opening', storeStatus(standard, at('2026-06-01T04:00:00.000Z')).label.includes('Opens at 11:00 AM'));
  check('sunday stays closed', storeStatus(standard, at('2026-06-07T08:00:00.000Z')).label.startsWith('Closed'));
  check('sunday names the next opening', storeStatus(standard, at('2026-06-07T08:00:00.000Z')).label.includes('Monday'));

  const withBreak = openWeek({ breakStart: '14:00', breakEnd: '15:00' });
  check('break is not open', storeStatus(withBreak, at('2026-06-01T09:30:00.000Z')).kind === 'break');
  check('break names the reopen time', storeStatus(withBreak, at('2026-06-01T09:30:00.000Z')).label.includes('3:00 PM'));
  check('break has ended at 3:00 PM', storeStatus(withBreak, at('2026-06-01T10:00:00.000Z')).open);

  const overnight = defaultSchedule('Asia/Karachi');
  overnight.days.mon = { closed: false, open: '20:00', close: '02:00', breakStart: null, breakEnd: null };
  check('midnight crossing stays open', storeStatus(overnight, at('2026-06-01T20:30:00.000Z')).open);
  check('midnight crossing closes at 2:00 AM', storeStatus(overnight, at('2026-06-01T20:30:00.000Z')).label.includes('2:00 AM'));
  check('after the overnight close is closed', !storeStatus(overnight, at('2026-06-01T21:30:00.000Z')).open);
  const holidayCutsNight = defaultSchedule('Asia/Karachi');
  holidayCutsNight.days.mon = { closed: false, open: '20:00', close: '02:00', breakStart: null, breakEnd: null };
  holidayCutsNight.holidays = [{ date: '2026-06-02', closed: true, open: null, close: null, label: 'Eid' }];
  check('a holiday stops an overnight shift at midnight', !storeStatus(holidayCutsNight, at('2026-06-01T20:30:00.000Z')).open);

  const holiday = openWeek();
  holiday.holidays = [{ date: '2026-06-02', closed: true, open: null, close: null, label: 'Eid' }];
  check('holiday closes the day', storeStatus(holiday, at('2026-06-02T08:00:00.000Z')).label.includes('Eid'));
  const closure = openWeek();
  closure.closure = { from: '2026-06-03', to: '2026-06-04', label: 'Stocktake' };
  check('temporary closure is respected', storeStatus(closure, at('2026-06-03T08:00:00.000Z')).kind === 'closure');
  check('timezone is the store timezone', storeStatus(standard, at('2026-06-01T15:30:00.000Z')).open === false);
  check('invalid schedule is rejected', scheduleError({ timezone: 'Not/AZone', days: standard.days, holidays: [], closure: null }) !== null);
  check('valid schedule is accepted', scheduleError(standard) === null);
  check('sample hours are not displayed as hours', isPlaceholderHours('Sample card') && isPlaceholderHours('Demo hours'));
  check('a real summary is kept', !isPlaceholderHours('Monday · 11:00 AM – 8:00 PM'));

  check('customer logout goes to the account login', logoutDestination('customer') === '/account/login');
  check('admin logout goes to the admin login', logoutDestination('admin') === '/admin/login');
  check('staff logout goes to the admin login', logoutDestination('staff') === '/admin/login');
  check('jpeg signature is accepted', imageTypeMatches(Uint8Array.from([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 'image/jpeg'));
  check('text is not accepted as jpeg', !imageTypeMatches(Uint8Array.from([0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0, 0, 0, 0, 0]), 'image/jpeg'));

  const { getDb } = await import('../src/db');
  const { orders, orderItems, products, reviews, users } = await import('../src/db/schema');
  const { eligiblePurchases } = await import('../src/lib/reviews');
  const db = await getDb();
  const [buyer] = await db.insert(users).values({ email: 'buyer-hours@example.com', passwordHash: 'not-a-login', firstName: 'Ayesha', lastName: 'Khan', role: 'customer' }).returning();
  const [stranger] = await db.insert(users).values({ email: 'stranger-hours@example.com', passwordHash: 'not-a-login', firstName: 'Other', lastName: 'Person', role: 'customer' }).returning();
  const [product] = await db.insert(products).values({ slug: `hours-ring-${crypto.randomUUID().slice(0, 6)}`, name: 'Hours test ring', price: 100000, status: 'active' }).returning();
  async function makeOrder(status: string, owner = buyer!) {
    const [row] = await db.insert(orders).values({
      number: `TMP-${crypto.randomUUID().slice(0, 8)}`,
      userId: owner.id,
      email: owner.email,
      customerName: `${owner.firstName} ${owner.lastName}`,
      status,
      paymentStatus: 'paid',
      paymentMethod: 'cod',
      shippingMethod: 'standard',
      shippingMethodName: 'Normal Delivery',
      shippingAddress: { firstName: owner.firstName, lastName: owner.lastName, phone: '03001234567', line1: 'Controlled lane', city: 'Lahore', province: 'Punjab', country: 'Pakistan' },
      subtotal: 100000,
      total: 100000,
      deliveredAt: status === 'delivered' ? new Date('2026-06-02T10:00:00.000Z') : null,
    }).returning();
    await db.insert(orderItems).values({ orderId: row!.id, productId: product!.id, name: product!.name, quantity: 1, unitPrice: 100000, lineTotal: 100000 });
    return row!;
  }
  const delivered = await makeOrder('delivered');
  await makeOrder('processing');
  const open = await eligiblePurchases(buyer!.id, buyer!.email, product!.id);
  check('delivered purchase can be reviewed', open.length === 1 && open[0]?.orderId === delivered.id);
  check('another customer cannot review it', (await eligiblePurchases(stranger!.id, stranger!.email, product!.id)).length === 0);
  await db.insert(reviews).values({ productId: product!.id, userId: buyer!.id, orderId: delivered.id, name: 'Ayesha Khan', email: buyer!.email, rating: 5, body: 'It arrived and the gold is quiet and lovely.', status: 'pending', verified: true });
  check('the same purchase cannot be reviewed twice', (await eligiblePurchases(buyer!.id, buyer!.email, product!.id)).length === 0);
  let duplicate = false;
  try {
    await db.insert(reviews).values({ productId: product!.id, userId: buyer!.id, orderId: delivered.id, name: 'Ayesha Khan', email: buyer!.email, rating: 4, body: 'A second note should not be stored.', status: 'pending', verified: true });
  } catch {
    duplicate = true;
  }
  check('database rejects a duplicate purchase review', duplicate);
  const [hidden] = await db.select().from(reviews).where(eq(reviews.orderId, delivered.id));
  check('pending review is not published', hidden?.status === 'pending');
  const guestOrder = await makeOrder('delivered', { ...stranger!, id: stranger!.id });
  await db.update(orders).set({ userId: null, email: buyer!.email }).where(eq(orders.id, guestOrder.id));
  const guestMatch = await eligiblePurchases(buyer!.id, buyer!.email, product!.id);
  check('matching guest email can review a delivered guest order', guestMatch.some((row) => row.orderId === guestOrder.id));
  const { SignJWT, jwtVerify } = await import('jose');
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
  const token = await new SignJWT({ role: 'customer', ver: buyer!.tokenVersion }).setProtectedHeader({ alg: 'HS256' }).setSubject(String(buyer!.id)).setIssuedAt().setExpirationTime('1h').sign(secret);
  const { payload } = await jwtVerify(token, secret);
  await db.update(users).set({ tokenVersion: buyer!.tokenVersion + 1 }).where(eq(users.id, buyer!.id));
  const [bumped] = await db.select({ tokenVersion: users.tokenVersion }).from(users).where(eq(users.id, buyer!.id));
  check('signing out invalidates the previous session token', bumped?.tokenVersion !== Number(payload.ver));
  const saved = hours.normalizeSchedule({ ...standard, published: true });
  check('a clock selection survives normalisation', saved?.days.mon.open === '11:00' && saved.days.mon.close === '20:00' && saved.published === true);
  check('an unpublished schedule stays off the storefront', !hours.isLiveSchedule(saved ? { ...saved, published: false } : null));
  const { storeLocations } = await import('../src/db/schema');
  await db.insert(storeLocations).values({ name: 'Clock test counter', city: 'Lahore', country: 'Pakistan', address: 'Controlled test lane, not a public branch', hours: 'Sample card', timezone: 'Asia/Karachi', schedule: saved, active: true, showOnHome: true });
  const [stored] = await db.select().from(storeLocations).where(eq(storeLocations.name, 'Clock test counter'));
  check('opening and closing times remain after a database save', stored?.schedule?.days.mon.open === '11:00' && stored.schedule.days.mon.close === '20:00');
  check('a Sample hours string is not treated as public hours', hours.isPlaceholderHours(stored?.hours));
  await db.update(reviews).set({ status: 'published', avatar: '/images/reviews/hira.webp', title: 'Quiet gold' }).where(eq(reviews.productId, product!.id));
  await db.insert(reviews).values({ productId: product!.id, name: 'Studio Desk', email: 'desk@studio.maisonaurelle.pk', rating: 5, title: 'A studio note', body: 'Studio note kept beside the customer review.', status: 'published', verified: false });
  await db.insert(reviews).values({ productId: product!.id, userId: buyer!.id, name: 'Hidden Buyer', email: buyer!.email, rating: 1, title: 'Not for the site', body: 'This rejected note must stay off the product page.', status: 'hidden', verified: true });
  const { publishedReviewSnapshot, recalcProductRating } = await import('../src/lib/reviews');
  await recalcProductRating(product!.id);
  const [rated] = await db.select({ ratingAvg: products.ratingAvg, ratingCount: products.ratingCount }).from(products).where(eq(products.id, product!.id));
  check('approving a review updates the average and count', rated?.ratingCount === 2 && rated.ratingAvg === 5);
  const snap = await publishedReviewSnapshot(product!.id, 0, 12);
  const approved = snap.reviews.find((row) => row.body.includes('quiet and lovely'));
  check('approved review is in the same public list as the studio note', !!approved && snap.reviews.some((row) => row.studio && row.body.includes('Studio note kept')));
  check('approved review keeps the customer name, stars, title and picture', approved?.name === 'Ayesha Khan' && approved.rating === 5 && approved.title === 'Quiet gold' && approved.avatar === '/images/reviews/hira.webp' && approved.verified === true);
  check('a studio note is not marked verified purchase', snap.reviews.some((row) => row.studio && !row.verified));
  check('a rejected review stays out of the public list', !snap.reviews.some((row) => row.body.includes('rejected note')) && snap.total === 2);

  if (failures.length) {
    console.error(failures.map((item) => `FAIL ${item}`).join('\n'));
    process.exit(1);
  }
  console.log('\nAll hours and review checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
