'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export type CampaignBannerData = { name: string; percent: number; endsAt: string; href: string };

function parts(endsAt: string, now: number) {
  const diff = Math.max(0, +new Date(endsAt) - now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    done: diff <= 0,
    label: `${pad(Math.floor(diff / 86_400_000))} : ${pad(Math.floor(diff / 3_600_000) % 24)} : ${pad(Math.floor(diff / 60_000) % 60)} : ${pad(Math.floor(diff / 1000) % 60)}`,
  };
}

export function CampaignBanner({ campaign }: { campaign: CampaignBannerData }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const tick = parts(campaign.endsAt, now);
  useEffect(() => {
    if (!tick.done || gone) return;
    setGone(true);
    router.refresh();
  }, [tick.done, gone, router]);
  if (gone || tick.done) return null;
  return (
    <div className="campaign-bar relative z-[52] text-[var(--c-primary-text)]">
      <div className="container-x flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 py-2.5 text-center">
        <p className="min-w-0 text-[0.68rem] font-medium uppercase tracking-[0.16em] sm:text-[0.78rem]">
          <span className="block sm:inline">{campaign.name}</span>
          <span className="mx-2 hidden opacity-60 sm:inline">·</span>
          <span className="block sm:inline">{campaign.percent}% off</span>
        </p>
        <p className="font-mono text-[0.72rem] tracking-[0.12em] tabular-nums sm:text-[0.8rem]" aria-live="polite">
          <span className="mr-2 opacity-70">Ends in</span>
          {tick.label}
        </p>
        <Link href={campaign.href || '/shop'} className="btn btn-sm !border-current !bg-transparent !px-3 !py-1.5 !text-[0.65rem] !text-inherit hover:!bg-white/10">
          Shop the sale
        </Link>
      </div>
    </div>
  );
}
