'use client';

import { useEffect, useState } from 'react';
import { storeStatus, weekLines, type HoursSchedule } from '@/lib/store-hours';
import { cn } from '@/lib/utils';

export function StoreHours({ schedule, compact = false }: { schedule: HoursSchedule; compact?: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, 15_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  const status = storeStatus(schedule, now);
  return (
    <div>
      <p className={cn('text-[0.82rem]', status.open ? 'text-accent' : 'text-muted')} aria-live="polite">{status.label}</p>
      {!compact && (
        <ul className="mt-2 space-y-1 text-[0.78rem] leading-relaxed text-muted">
          {weekLines(schedule).map((line) => <li key={line}>{line}</li>)}
        </ul>
      )}
    </div>
  );
}
