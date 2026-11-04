'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';
import { clockString, formatClock, parseClock } from '@/lib/store-hours';
import { cn } from '@/lib/utils';

function dialPosition(index: number, total: number, radius: number) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return { left: `${50 + Math.cos(angle) * radius}%`, top: `${50 + Math.sin(angle) * radius}%` };
}

export function TimePicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hour12, setHour12] = useState(true);
  const [evening, setEvening] = useState(false);
  const [picking, setPicking] = useState<'hour' | 'minute'>('hour');
  const [hour, setHour] = useState(11);
  const [minute, setMinute] = useState(0);
  const labelId = useId();
  const titleId = useId();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const openClock = () => {
    const total = parseClock(value) ?? 11 * 60;
    const nextHour = Math.floor(total / 60);
    setHour(nextHour);
    setMinute(total % 60);
    setEvening(nextHour >= 12);
    setPicking('hour');
    setOpen(true);
  };

  const apply = () => {
    onChange(clockString(hour * 60 + minute));
    setOpen(false);
  };

  const hours12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const hours24 = evening ? [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const shown = formatClock(clockString(hour * 60 + minute), hour12);
  const selected12 = hour % 12 || 12;

  const dialog = (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-3 sm:items-center" onMouseDown={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-[380px] rounded-2xl border border-[#e6e0d6] bg-white p-4 shadow-[0_24px_60px_-28px_rgba(0,0,0,.55)]" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p id={titleId} className="text-[0.72rem] uppercase tracking-[0.14em] text-[#8a8178]">{label}</p>
            <p className="font-heading text-[2rem] leading-none text-[#1c1917]">{shown}</p>
          </div>
          <button type="button" className="rounded-full border border-[#e6e0d6] px-3 py-1.5 text-[0.68rem] uppercase tracking-[0.12em]" onClick={() => setHour12((current) => !current)}>{hour12 ? '24-hour' : 'AM/PM'}</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className={cn('rounded-full px-3 py-2 text-[0.82rem]', picking === 'hour' ? 'bg-[#1c1917] text-white' : 'border border-[#e6e0d6]')} onClick={() => setPicking('hour')}>Hours</button>
          <button type="button" className={cn('rounded-full px-3 py-2 text-[0.82rem]', picking === 'minute' ? 'bg-[#1c1917] text-white' : 'border border-[#e6e0d6]')} onClick={() => setPicking('minute')}>Minutes</button>
        </div>
        <div className="relative mx-auto mt-4 aspect-square w-[min(100%,280px)] rounded-full border border-[#e6e0d6] bg-[#f7f4ef]">
          <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1c1917]" />
          {picking === 'hour' && hour12 && hours12.map((face, index) => (
            <button key={face} type="button" className={cn('absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[0.95rem]', selected12 === face && 'bg-[#1c1917] text-white')} style={dialPosition(index, 12, 38)} onClick={() => { setHour((face % 12) + (hour >= 12 ? 12 : 0)); setPicking('minute'); }}>{face}</button>
          ))}
          {picking === 'hour' && !hour12 && hours24.map((face, index) => (
            <button key={face} type="button" className={cn('absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[0.9rem]', hour === face && 'bg-[#1c1917] text-white')} style={dialPosition(index, 12, 38)} onClick={() => { setHour(face); setPicking('minute'); }}>{String(face).padStart(2, '0')}</button>
          ))}
          {picking === 'minute' && minutes.map((face, index) => (
            <button key={face} type="button" className={cn('absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[0.82rem]', minute === face && 'bg-[#1c1917] text-white')} style={dialPosition(index, 12, 38)} onClick={() => setMinute(face)}>{String(face).padStart(2, '0')}</button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          {hour12 ? (
            <div className="flex gap-2">
              <button type="button" className={cn('rounded-full px-4 py-2 text-[0.82rem]', hour < 12 ? 'bg-[#1c1917] text-white' : 'border border-[#e6e0d6]')} onClick={() => setHour(hour % 12)}>AM</button>
              <button type="button" className={cn('rounded-full px-4 py-2 text-[0.82rem]', hour >= 12 ? 'bg-[#1c1917] text-white' : 'border border-[#e6e0d6]')} onClick={() => setHour((hour % 12) + 12)}>PM</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button type="button" className={cn('rounded-full px-3 py-2 text-[0.75rem]', !evening ? 'bg-[#1c1917] text-white' : 'border border-[#e6e0d6]')} onClick={() => setEvening(false)}>00–11</button>
              <button type="button" className={cn('rounded-full px-3 py-2 text-[0.75rem]', evening ? 'bg-[#1c1917] text-white' : 'border border-[#e6e0d6]')} onClick={() => setEvening(true)}>12–23</button>
            </div>
          )}
          <p className="text-[0.75rem] text-[#8a8178]">{picking === 'hour' ? 'Tap an hour' : 'Tap a minute'}</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={apply}>Apply</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <span id={labelId} className="label">{label}</span>
      <button type="button" className="field flex w-full items-center justify-between text-left" aria-labelledby={labelId} aria-haspopup="dialog" aria-expanded={open} onClick={openClock}>
        <span>{value ? formatClock(value, true) : 'Select a time'}</span>
        <Clock size={16} strokeWidth={1.5} className="text-muted" />
      </button>
      {open && mounted ? createPortal(dialog, document.body) : null}
    </div>
  );
}
