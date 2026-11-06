'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertAdmin } from '@/lib/auth';
import { normalizeGift, safeImageUrl } from '@/lib/gift-packaging';
import { getSettings, saveSetting } from '@/lib/settings';

const schema = z.object({
  enabled: z.boolean(),
  priceRupees: z.coerce.number().min(0).max(50_000),
  images: z
    .array(z.object({ id: z.string().trim().max(40), url: z.string().trim().max(1000), alt: z.string().trim().max(160) }))
    .max(6),
});

export async function saveGiftPackaging(input: unknown): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const actor = await assertAdmin({ adminOnly: true });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || 'Check the packaging settings.' };
  if (parsed.data.images.some((img) => img.url && !safeImageUrl(img.url))) return { ok: false, error: 'Packaging images must be a site file or an https URL.' };
  const current = normalizeGift((await getSettings()).giftPackaging);
  const next = normalizeGift({
    ...current,
    enabled: parsed.data.enabled,
    price: Math.round(parsed.data.priceRupees * 100),
    images: parsed.data.images.filter((img) => img.url),
    initialized: true,
    audit: { by: actor.email, at: new Date().toISOString() },
  });
  await saveSetting('giftPackaging', next);
  revalidatePath('/', 'layout');
  revalidatePath('/admin/packaging');
  return { ok: true, message: next.enabled ? `Premium gift packaging is on at Rs ${parsed.data.priceRupees.toLocaleString('en-PK')} per piece.` : 'Premium gift packaging is off. Existing orders are unchanged.' };
}
