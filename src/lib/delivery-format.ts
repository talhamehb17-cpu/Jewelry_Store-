export function minutesToDays(minutes: number) {
  return Math.round((minutes / 1440) * 10) / 10;
}

export function daysToMinutes(days: number) {
  if (!Number.isFinite(days) || days <= 0) return 0;
  return Math.max(1, Math.round(days * 1440));
}

export function formatDuration(minutes: number | null | undefined) {
  if (!minutes || minutes <= 0) return 'Estimate set by the atelier';
  const days = minutesToDays(minutes);
  return `${days} day${days === 1 ? '' : 's'}`;
}
