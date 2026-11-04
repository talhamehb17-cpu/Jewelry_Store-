import { publicImage } from '@/lib/look';

/** The storefront may show only the URL saved on this campaign. Never a stand-in photo. */
export function campaignImageSrc(campaign: { id: number; image: string | null | undefined }) {
  const src = publicImage(campaign.image, '').trim();
  if (!src || /^(blob:|data:)/i.test(src)) return null;
  // A private Blob URL cannot be loaded by the browser. Stream only this campaign's file.
  if (src.includes('.private.blob.')) return `/api/campaign-image/${campaign.id}`;
  return src;
}
