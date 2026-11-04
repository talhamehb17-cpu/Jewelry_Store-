'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { SubscriberOffer } from '@/lib/subscriber-offers';
import { formatDateTime } from '@/lib/utils';

export function SubscriberOffers({ offers, title = 'Your subscriber offers' }: { offers: SubscriberOffer[]; title?: string }) {
  const [copied, setCopied] = useState('');
  if (!offers.length) return null;
  return (
    <div className="mt-4 space-y-3">
      <p className="text-[0.82rem] font-medium">{title}</p>
      <ul className="space-y-2">
        {offers.map((offer) => (
          <li key={offer.code} className="rounded-theme-sm border border-line bg-bg px-3 py-3 text-[0.84rem]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono font-semibold">{offer.code}</p>
                <p>{offer.label}</p>
                <p className="text-[0.75rem] text-muted">{offer.detail}{offer.expiresAt ? ` · Expires ${formatDateTime(offer.expiresAt)}` : ''}</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary shrink-0 !px-3 !py-2 text-[0.75rem]"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(offer.code);
                    setCopied(offer.code);
                  } catch {
                    setCopied('');
                  }
                }}
              >
                {copied === offer.code ? <Check size={14} /> : <Copy size={14} />} {copied === offer.code ? 'Copied' : 'Copy code'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
