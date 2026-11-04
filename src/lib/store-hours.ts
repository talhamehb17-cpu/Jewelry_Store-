/** Opening hours in the store's timezone. Pure functions — no database, no visitor clock. */

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABEL: Record<DayKey, string> = {
  sun: 'Sunday',
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
};

export const WEEK_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const COMMON_TIMEZONES = ['Asia/Karachi', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Tokyo', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles'] as const;

export type DayHours = {
  closed: boolean;
  open: string;
  close: string;
  breakStart: string | null;
  breakEnd: string | null;
};

export type HolidayHours = {
  date: string;
  closed: boolean;
  open: string | null;
  close: string | null;
  label: string;
};

export type HoursSchedule = {
  timezone: string;
  published: boolean;
  days: Record<DayKey, DayHours>;
  holidays: HolidayHours[];
  closure: { from: string; to: string; label: string } | null;
};

export type StoreStatus = {
  open: boolean;
  kind: 'open' | 'closed' | 'break' | 'holiday' | 'closure';
  label: string;
};

const PLACEHOLDER_HOURS = 'Monday – Saturday, 11am – 8pm PKT';

export function isPlaceholderHours(hours: string | null | undefined) {
  if (!hours?.trim()) return true;
  return hours.trim() === PLACEHOLDER_HOURS || /\b(sample|demo)\b/i.test(hours) || /^showcase\b/i.test(hours.trim());
}

export function emptyDay(): DayHours {
  return { closed: true, open: '11:00', close: '20:00', breakStart: null, breakEnd: null };
}

export function defaultSchedule(timezone = 'Asia/Karachi'): HoursSchedule {
  return {
    timezone,
    published: false,
    days: Object.fromEntries(DAY_KEYS.map((day) => [day, emptyDay()])) as Record<DayKey, DayHours>,
    holidays: [],
    closure: null,
  };
}

export function isLiveSchedule(schedule: HoursSchedule | null | undefined): schedule is HoursSchedule {
  return !!schedule && schedule.published === true;
}

export function parseClock(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function clockString(total: number) {
  const minutes = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function formatTime(total: number) {
  const minutes = ((total % 1440) + 1440) % 1440;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function formatClock(value: string, hour12 = true) {
  const total = parseClock(value);
  if (total == null) return value || '—';
  return hour12 ? formatTime(total) : clockString(total);
}

export function timezoneOk(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function zonedParts(date: Date, timeZone: string) {
  if (!timezoneOk(timeZone)) return null;
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) if (part.type !== 'literal') bag[part.type] = part.value;
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  const key = bag.weekday?.slice(0, 3);
  const day = DAY_KEYS.find((item) => DAY_LABEL[item].startsWith(key || '___'));
  if (!day || !bag.year || !Number.isFinite(hour)) return null;
  return { date: `${bag.year}-${bag.month}-${bag.day}`, minutes: hour * 60 + Number(bag.minute), day };
}

function shiftDate(iso: string, days: number) {
  const [year, month, day] = iso.split('-').map(Number);
  const next = new Date(Date.UTC(year!, month! - 1, day! + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

function weekdayOf(iso: string): DayKey {
  const [year, month, day] = iso.split('-').map(Number);
  return DAY_KEYS[new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay()]!;
}

function inSpan(start: number, end: number, now: number) {
  if (end === start) return false;
  if (end > start) return now >= start && now < end;
  return now >= start || now < end;
}

function asText(value: unknown, max = 80) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function normalizeSchedule(input: unknown, fallbackTz = 'Asia/Karachi'): HoursSchedule | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const daysIn = raw.days && typeof raw.days === 'object' ? (raw.days as Record<string, unknown>) : {};
  const days = {} as HoursSchedule['days'];
  for (const day of DAY_KEYS) {
    const row = daysIn[day] && typeof daysIn[day] === 'object' ? (daysIn[day] as Record<string, unknown>) : {};
    days[day] = {
      closed: row.closed !== false,
      open: asText(row.open, 5) || '11:00',
      close: asText(row.close, 5) || '20:00',
      breakStart: asText(row.breakStart, 5) || null,
      breakEnd: asText(row.breakEnd, 5) || null,
    };
  }
  const holidays = Array.isArray(raw.holidays)
    ? raw.holidays.slice(0, 40).map((item) => {
        const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
        return {
          date: asText(row.date, 10),
          closed: row.closed !== false,
          open: asText(row.open, 5) || null,
          close: asText(row.close, 5) || null,
          label: asText(row.label, 80),
        };
      })
    : [];
  const closureRaw = raw.closure && typeof raw.closure === 'object' ? (raw.closure as Record<string, unknown>) : null;
  const closure = closureRaw && (asText(closureRaw.from, 10) || asText(closureRaw.to, 10))
    ? { from: asText(closureRaw.from, 10), to: asText(closureRaw.to, 10), label: asText(closureRaw.label, 80) }
    : null;
  return { timezone: asText(raw.timezone, 64) || fallbackTz, published: raw.published === true, days, holidays, closure };
}

function breakInside(open: number, close: number, start: number, end: number) {
  if (start === end || !inSpan(open, close, start)) return false;
  const lift = (value: number) => (close <= open && value < open ? value + 1440 : value);
  const finish = close <= open ? close + 1440 : close;
  const liftedEnd = lift(end);
  return liftedEnd > lift(start) && liftedEnd <= finish;
}

export function scheduleError(input: unknown) {
  const schedule = normalizeSchedule(input);
  if (!schedule) return 'Enter a weekly schedule.';
  if (!timezoneOk(schedule.timezone)) return 'Choose a valid timezone, such as Asia/Karachi.';
  for (const day of DAY_KEYS) {
    const row = schedule.days[day];
    if (row.closed) continue;
    const open = parseClock(row.open);
    const close = parseClock(row.close);
    if (open == null || close == null) return `${DAY_LABEL[day]} needs an opening and a closing time.`;
    if (row.breakStart || row.breakEnd) {
      const start = parseClock(row.breakStart);
      const end = parseClock(row.breakEnd);
      if (start == null || end == null || !breakInside(open, close, start, end)) return `${DAY_LABEL[day]} break must sit inside opening hours.`;
    }
  }
  for (const holiday of schedule.holidays) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(holiday.date)) return 'Holiday dates use YYYY-MM-DD.';
    if (!holiday.closed && (parseClock(holiday.open) == null || parseClock(holiday.close) == null)) return `Special hours on ${holiday.date} need an opening and a closing time.`;
  }
  if (schedule.closure && (!/^\d{4}-\d{2}-\d{2}$/.test(schedule.closure.from) || !/^\d{4}-\d{2}-\d{2}$/.test(schedule.closure.to) || schedule.closure.from > schedule.closure.to)) {
    return 'A temporary closure needs a start date and an end date.';
  }
  return null;
}

function windowFor(schedule: HoursSchedule, date: string, day: DayKey) {
  if (schedule.closure && schedule.closure.from && schedule.closure.to && schedule.closure.from <= date && date <= schedule.closure.to) return null;
  const holiday = schedule.holidays.find((item) => item.date === date);
  if (holiday?.closed) return null;
  if (holiday && !holiday.closed) {
    const open = parseClock(holiday.open);
    const close = parseClock(holiday.close);
    return open == null || close == null ? null : { open, close, breakStart: null, breakEnd: null };
  }
  const row = schedule.days[day];
  if (!row || row.closed) return null;
  const open = parseClock(row.open);
  const close = parseClock(row.close);
  if (open == null || close == null) return null;
  return { open, close, breakStart: parseClock(row.breakStart), breakEnd: parseClock(row.breakEnd) };
}

function hardClosed(schedule: HoursSchedule, date: string) {
  if (schedule.closure && schedule.closure.from <= date && date <= schedule.closure.to) return 'closure' as const;
  const holiday = schedule.holidays.find((item) => item.date === date);
  if (holiday?.closed) return 'holiday' as const;
  return null;
}

function nextOpening(schedule: HoursSchedule, now: { date: string; minutes: number }) {
  for (let offset = 0; offset < 8; offset++) {
    const date = shiftDate(now.date, offset);
    const day = weekdayOf(date);
    const window = windowFor(schedule, date, day);
    if (!window) continue;
    if (offset === 0 && now.minutes >= window.open) continue;
    return { date, day, minutes: window.open };
  }
  return null;
}

export function storeStatus(schedule: HoursSchedule, at = new Date()): StoreStatus {
  const now = zonedParts(at, schedule.timezone) ?? zonedParts(at, 'Asia/Karachi');
  if (!now) return { open: false, kind: 'closed', label: 'Closed' };
  const today = windowFor(schedule, now.date, now.day);
  const yesterdayDate = shiftDate(now.date, -1);
  const yesterday = windowFor(schedule, yesterdayDate, weekdayOf(yesterdayDate));
  const todayBlocked = hardClosed(schedule, now.date);
  const fromYesterday = !todayBlocked && !!yesterday && yesterday.close <= yesterday.open && now.minutes < yesterday.close;
  const active = fromYesterday ? yesterday : today && inSpan(today.open, today.close, now.minutes) ? today : null;
  if (active) {
    if (active.breakStart != null && active.breakEnd != null && inSpan(active.breakStart, active.breakEnd, now.minutes)) {
      return { open: false, kind: 'break', label: `On a break · Reopens at ${formatTime(active.breakEnd)}` };
    }
    return { open: true, kind: 'open', label: `Open now · Closes at ${formatTime(active.close)}` };
  }
  if (todayBlocked === 'closure') return { open: false, kind: 'closure', label: schedule.closure?.label ? `Closed · ${schedule.closure.label}` : 'Temporarily closed' };
  if (todayBlocked === 'holiday') {
    const holiday = schedule.holidays.find((item) => item.date === now.date);
    return { open: false, kind: 'holiday', label: holiday?.label ? `Closed · ${holiday.label}` : 'Closed' };
  }
  const next = nextOpening(schedule, now);
  if (!next) return { open: false, kind: 'closed', label: 'Closed' };
  const when = next.date === now.date ? `Opens at ${formatTime(next.minutes)}` : `Opens ${DAY_LABEL[next.day]} at ${formatTime(next.minutes)}`;
  return { open: false, kind: 'closed', label: `Closed · ${when}` };
}

export function weekLines(schedule: HoursSchedule) {
  return WEEK_ORDER.map((day) => {
    const row = schedule.days[day];
    const open = parseClock(row.open);
    const close = parseClock(row.close);
    if (row.closed || open == null || close == null) return `${DAY_LABEL[day]} · Closed`;
    const pause = row.breakStart && row.breakEnd && parseClock(row.breakStart) != null && parseClock(row.breakEnd) != null
      ? ` · break ${formatTime(parseClock(row.breakStart)!)}–${formatTime(parseClock(row.breakEnd)!)}`
      : '';
    return `${DAY_LABEL[day]} · ${formatTime(open)} – ${formatTime(close)}${pause}`;
  });
}

export function scheduleSummary(schedule: HoursSchedule) {
  const holidays = schedule.holidays.filter((item) => item.date).map((item) => `${item.date}${item.label ? ` ${item.label}` : ''}${item.closed ? ' closed' : ''}`);
  return [...weekLines(schedule), ...holidays].join('\n').slice(0, 900);
}
