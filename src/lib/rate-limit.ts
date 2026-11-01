import { headers } from 'next/headers';

type Bucket = { count: number; reset: number };
const g = globalThis as unknown as { __aurelleRL?: Map<string, Bucket> };
const buckets = (g.__aurelleRL ??= new Map());

/** Best-effort, per-instance fixed-window rate limiter. Returns true when the request is allowed. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'local').trim();
}
