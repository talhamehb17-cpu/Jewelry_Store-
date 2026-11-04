'use client';

import { TimePicker } from './time-picker';
import { COMMON_TIMEZONES, DAY_LABEL, WEEK_ORDER, type HoursSchedule } from '@/lib/store-hours';

export function HoursEditor({ value, onChange }: { value: HoursSchedule; onChange: (next: HoursSchedule) => void }) {
  const setDay = (day: (typeof WEEK_ORDER)[number], patch: Partial<HoursSchedule['days'][typeof day]>) => {
    onChange({ ...value, days: { ...value.days, [day]: { ...value.days[day], ...patch } } });
  };
  return (
    <div className="space-y-4">
      <label className="block text-[0.8rem]">
        <span className="label">Timezone</span>
        <input className="field" list="store-timezones" value={value.timezone} onChange={(event) => onChange({ ...value, timezone: event.target.value })} />
        <datalist id="store-timezones">{COMMON_TIMEZONES.map((zone) => <option key={zone} value={zone} />)}</datalist>
      </label>
      <div className="space-y-3">
        {WEEK_ORDER.map((day) => {
          const row = value.days[day];
          return (
            <div key={day} className="rounded-lg border border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[0.86rem] font-medium">{DAY_LABEL[day]}</p>
                <label className="flex items-center gap-2 text-[0.78rem]"><input type="checkbox" checked={row.closed} onChange={(event) => setDay(day, { closed: event.target.checked })} /> Closed</label>
              </div>
              {!row.closed && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <TimePicker label="Opening time" value={row.open} onChange={(open) => setDay(day, { open })} />
                  <TimePicker label="Closing time" value={row.close} onChange={(close) => setDay(day, { close })} />
                  <label className="flex items-center gap-2 text-[0.78rem] sm:col-span-2">
                    <input type="checkbox" checked={!!row.breakStart} onChange={(event) => setDay(day, event.target.checked ? { breakStart: row.breakStart || '14:00', breakEnd: row.breakEnd || '15:00' } : { breakStart: null, breakEnd: null })} />
                    Optional break
                  </label>
                  {row.breakStart && (
                    <>
                      <TimePicker label="Break starts" value={row.breakStart} onChange={(breakStart) => setDay(day, { breakStart })} />
                      <TimePicker label="Break ends" value={row.breakEnd || '15:00'} onChange={(breakEnd) => setDay(day, { breakEnd })} />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="rounded-lg border border-line p-3">
        <p className="text-[0.86rem] font-medium">Special holidays</p>
        <div className="mt-3 space-y-3">
          {value.holidays.map((holiday, index) => (
            <div key={`${holiday.date}-${index}`} className="grid gap-2 sm:grid-cols-2">
              <input className="field" type="date" value={holiday.date} onChange={(event) => onChange({ ...value, holidays: value.holidays.map((item, i) => i === index ? { ...item, date: event.target.value } : item) })} />
              <input className="field" placeholder="Label, such as Eid" value={holiday.label} onChange={(event) => onChange({ ...value, holidays: value.holidays.map((item, i) => i === index ? { ...item, label: event.target.value } : item) })} />
              <label className="flex items-center gap-2 text-[0.78rem]"><input type="checkbox" checked={holiday.closed} onChange={(event) => onChange({ ...value, holidays: value.holidays.map((item, i) => i === index ? { ...item, closed: event.target.checked } : item) })} /> Closed that day</label>
              <button type="button" className="text-left text-[0.78rem] underline" onClick={() => onChange({ ...value, holidays: value.holidays.filter((_, i) => i !== index) })}>Remove</button>
              {!holiday.closed && (
                <>
                  <TimePicker label="Opening time" value={holiday.open || '11:00'} onChange={(open) => onChange({ ...value, holidays: value.holidays.map((item, i) => i === index ? { ...item, open } : item) })} />
                  <TimePicker label="Closing time" value={holiday.close || '16:00'} onChange={(close) => onChange({ ...value, holidays: value.holidays.map((item, i) => i === index ? { ...item, close } : item) })} />
                </>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange({ ...value, holidays: [...value.holidays, { date: '', closed: true, open: null, close: null, label: '' }] })}>Add holiday</button>
        </div>
      </div>
      <div className="rounded-lg border border-line p-3">
        <p className="text-[0.86rem] font-medium">Temporary closure</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-[0.78rem]">From<input className="field mt-1" type="date" value={value.closure?.from || ''} onChange={(event) => onChange({ ...value, closure: { from: event.target.value, to: value.closure?.to || event.target.value, label: value.closure?.label || '' } })} /></label>
          <label className="text-[0.78rem]">To<input className="field mt-1" type="date" value={value.closure?.to || ''} onChange={(event) => onChange({ ...value, closure: { from: value.closure?.from || event.target.value, to: event.target.value, label: value.closure?.label || '' } })} /></label>
          <label className="text-[0.78rem] sm:col-span-2">Note<input className="field mt-1" value={value.closure?.label || ''} onChange={(event) => onChange({ ...value, closure: value.closure ? { ...value.closure, label: event.target.value } : { from: '', to: '', label: event.target.value } })} /></label>
          {value.closure && <button type="button" className="text-left text-[0.78rem] underline" onClick={() => onChange({ ...value, closure: null })}>Clear closure</button>}
        </div>
      </div>
    </div>
  );
}
