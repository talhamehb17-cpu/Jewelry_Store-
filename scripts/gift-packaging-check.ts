import assert from 'node:assert/strict';
import { giftLineCharge, normalizeGift, safeImageUrl } from '../src/lib/gift-packaging';

const paid = giftLineCharge({ enabled: true, eligible: true, selected: true, unitPrice: 25_000, quantity: 2 });
assert.equal(paid.unit, 25_000);
assert.equal(paid.total, 50_000);

const again = giftLineCharge({ enabled: true, eligible: true, selected: true, unitPrice: 25_000, quantity: 2 });
assert.equal(again.total, paid.total, 'quantity change replaces the line charge; it does not stack a second fee');

assert.equal(giftLineCharge({ enabled: true, eligible: true, selected: false, unitPrice: 25_000, quantity: 3 }).total, 0);
assert.equal(giftLineCharge({ enabled: false, eligible: true, selected: true, unitPrice: 25_000, quantity: 1 }).total, 0);
assert.equal(giftLineCharge({ enabled: true, eligible: false, selected: true, unitPrice: 25_000, quantity: 1 }).total, 0);

const changed = giftLineCharge({ enabled: true, eligible: true, selected: true, unitPrice: 40_000, quantity: 1 });
assert.equal(changed.total, 40_000);
assert.notEqual(changed.unit, paid.unit);

const settings = normalizeGift({
  enabled: true,
  price: 25_000,
  images: [
    { id: 'box', url: '/images/packaging/gift-box.webp', alt: 'Box' },
    { id: 'bad', url: 'blob:http://local/1', alt: 'No' },
    { id: 'data', url: 'data:image/png;base64,aaaa', alt: 'No' },
  ],
  initialized: true,
  audit: null,
});
assert.equal(settings.images.length, 1);
assert.equal(settings.images[0]?.url, '/images/packaging/gift-box.webp');
assert.equal(normalizeGift({}).images.length, 2);
assert.equal(normalizeGift({ images: [] }).images.length, 0);
assert.equal(safeImageUrl('https://example.com/a.webp'), true);
assert.equal(safeImageUrl('blob:http://local/1'), false);

const snapped = { unit: paid.unit, total: paid.total };
const later = giftLineCharge({ enabled: true, eligible: true, selected: true, unitPrice: 90_000, quantity: 2 });
assert.equal(snapped.unit, 25_000);
assert.equal(snapped.total, 50_000);
assert.equal(later.unit, 90_000);

console.log('gift packaging checks passed');
