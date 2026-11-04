/** Pakistan Standard Time is UTC+5 all year. Delivery maths uses that offset, not the server timezone. */
export const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
export const DELIVERY_TZ = 'Asia/Karachi';

export type ServiceClock = {
  processingMinutes: number;
  shipMinutes: number;
  outMinutes: number;
  expectedMinutes: number;
};

export type StandardClock = {
  processingMinutes: number;
  shipDay: number;
  shipHourPkt: number;
  outMinutes: number;
  expectedMinutes: number;
};

export type TimelineSettings = {
  standard: StandardClock;
  express: ServiceClock;
  notificationDelayMinutes: number;
  popupEnabled: boolean;
  centerEnabled: boolean;
  emailsEnabled: boolean;
};

export const DEFAULT_TIMELINE: TimelineSettings = {
  standard: {
    processingMinutes: 2 * 1440,
    shipDay: 4,
    shipHourPkt: 20,
    outMinutes: Math.round(5.5 * 1440),
    expectedMinutes: 6 * 1440,
  },
  express: {
    processingMinutes: 12 * 60,
    shipMinutes: 24 * 60,
    outMinutes: 36 * 60,
    expectedMinutes: 3 * 1440,
  },
  notificationDelayMinutes: 10,
  popupEnabled: true,
  centerEnabled: true,
  emailsEnabled: true,
};

export type TimelineSnapshot = {
  durationMinutes: number;
  confirmMinutes: null;
  processingMinutes: number;
  shipMinutes: number;
  outMinutes: number;
  notificationDelayMinutes: number;
  timezone: typeof DELIVERY_TZ;
  serviceCode: 'standard' | 'express';
  processingAt: string;
  shipAt: string;
  outAt: string;
  expectedAt: string;
  snapshottedAt: string;
};

export function pktParts(date: Date) {
  const shifted = new Date(date.getTime() + PKT_OFFSET_MS);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
    h: shifted.getUTCHours(),
    min: shifted.getUTCMinutes(),
  };
}

/** Calendar date in Pakistan, plus days, at an exact Pakistan hour. */
export function addDaysPkt(date: Date, days: number, hour: number, minute = 0) {
  const p = pktParts(date);
  return new Date(Date.UTC(p.y, p.m - 1, p.d + days, hour - 5, minute, 0));
}

export function isExpressCode(code: string | null | undefined) {
  return (code || '').toLowerCase().includes('express');
}

export function serviceCodeOf(order: { deliveryCode?: string | null; shippingMethod?: string | null; shippingMethodName?: string | null }) {
  if (isExpressCode(order.deliveryCode) || isExpressCode(order.shippingMethod) || isExpressCode(order.shippingMethodName)) return 'express' as const;
  return 'standard' as const;
}

function finite(n: unknown, fallback: number) {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) ? v : fallback;
}

export function normalizeTimeline(value: unknown): TimelineSettings {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const standard = raw.standard && typeof raw.standard === 'object' ? (raw.standard as Record<string, unknown>) : {};
  const express = raw.express && typeof raw.express === 'object' ? (raw.express as Record<string, unknown>) : {};
  const d = DEFAULT_TIMELINE;
  return {
    standard: {
      processingMinutes: finite(standard.processingMinutes, d.standard.processingMinutes),
      shipDay: finite(standard.shipDay, d.standard.shipDay),
      shipHourPkt: finite(standard.shipHourPkt, d.standard.shipHourPkt),
      outMinutes: finite(standard.outMinutes, d.standard.outMinutes),
      expectedMinutes: finite(standard.expectedMinutes, d.standard.expectedMinutes),
    },
    express: {
      processingMinutes: finite(express.processingMinutes, d.express.processingMinutes),
      shipMinutes: finite(express.shipMinutes, d.express.shipMinutes),
      outMinutes: finite(express.outMinutes, d.express.outMinutes),
      expectedMinutes: finite(express.expectedMinutes, d.express.expectedMinutes),
    },
    notificationDelayMinutes: finite(raw.notificationDelayMinutes, d.notificationDelayMinutes),
    popupEnabled: raw.popupEnabled !== false,
    centerEnabled: raw.centerEnabled !== false,
    emailsEnabled: raw.emailsEnabled !== false,
  };
}

export function snapshotTimeline(code: string, start: Date, settings: TimelineSettings): TimelineSnapshot {
  const express = isExpressCode(code);
  const delay = settings.notificationDelayMinutes;
  if (express) {
    const e = settings.express;
    const at = (minutes: number) => new Date(start.getTime() + minutes * 60_000).toISOString();
    return {
      durationMinutes: e.expectedMinutes,
      confirmMinutes: null,
      processingMinutes: e.processingMinutes,
      shipMinutes: e.shipMinutes,
      outMinutes: e.outMinutes,
      notificationDelayMinutes: delay,
      timezone: DELIVERY_TZ,
      serviceCode: 'express',
      processingAt: at(e.processingMinutes),
      shipAt: at(e.shipMinutes),
      outAt: at(e.outMinutes),
      expectedAt: at(e.expectedMinutes),
      snapshottedAt: start.toISOString(),
    };
  }
  const s = settings.standard;
  const shipAt = addDaysPkt(start, s.shipDay, s.shipHourPkt, 0);
  return {
    durationMinutes: s.expectedMinutes,
    confirmMinutes: null,
    processingMinutes: s.processingMinutes,
    shipMinutes: Math.max(1, Math.round((shipAt.getTime() - start.getTime()) / 60_000)),
    outMinutes: s.outMinutes,
    notificationDelayMinutes: delay,
    timezone: DELIVERY_TZ,
    serviceCode: 'standard',
    processingAt: new Date(start.getTime() + s.processingMinutes * 60_000).toISOString(),
    shipAt: shipAt.toISOString(),
    outAt: new Date(start.getTime() + s.outMinutes * 60_000).toISOString(),
    expectedAt: new Date(start.getTime() + s.expectedMinutes * 60_000).toISOString(),
    snapshottedAt: start.toISOString(),
  };
}

export function validateTimeline(settings: TimelineSettings): string | null {
  if (!Number.isInteger(settings.notificationDelayMinutes) || settings.notificationDelayMinutes < 1 || settings.notificationDelayMinutes > 1440) {
    return 'Notification delay must be a whole number of minutes from 1 to 1440.';
  }
  const e = settings.express;
  const minutes = [e.processingMinutes, e.shipMinutes, e.outMinutes, e.expectedMinutes];
  if (minutes.some((n) => !Number.isFinite(n) || n <= 0 || n > 14 * 1440)) return 'Express delays must be between 1 minute and 14 days.';
  if (!(e.processingMinutes < e.shipMinutes && e.shipMinutes < e.outMinutes && e.outMinutes < e.expectedMinutes)) {
    return 'Express stages must increase: processing, then shipped, then out for delivery, then the expected time.';
  }
  const s = settings.standard;
  if ([s.processingMinutes, s.outMinutes, s.expectedMinutes].some((n) => !Number.isFinite(n) || n <= 0 || n > 21 * 1440)) {
    return 'Standard delays must be between 1 minute and 21 days.';
  }
  if (!Number.isInteger(s.shipDay) || s.shipDay < 1 || s.shipDay > 14) return 'Standard shipped day must be a whole day from 1 to 14.';
  if (!Number.isInteger(s.shipHourPkt) || s.shipHourPkt < 0 || s.shipHourPkt > 23) return 'Standard shipped hour must be 0–23 in Pakistan time.';
  if (!(s.processingMinutes < s.outMinutes && s.outMinutes < s.expectedMinutes)) {
    return 'Standard stages must increase: processing, then out for delivery, then the expected time.';
  }
  for (const hour of [8, 22]) {
    const start = new Date(Date.UTC(2026, 5, 1, hour - 5, 0, 0));
    const snap = snapshotTimeline('standard', start, settings);
    const processing = new Date(snap.processingAt).getTime();
    const ship = new Date(snap.shipAt).getTime();
    const out = new Date(snap.outAt).getTime();
    const expected = new Date(snap.expectedAt).getTime();
    if (!(start.getTime() < processing && processing < ship && ship < out && out < expected)) {
      return 'Standard timeline must stay in order for morning and evening confirmations: processing, shipped evening, out for delivery, then expected delivery.';
    }
  }
  return null;
}

export const STATUS_RANK: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  out_for_delivery: 4,
  awaiting_confirm: 4,
  delivered: 5,
  cancelled: 6,
};

export function nextScheduled(status: string, plan: { snapshottedAt?: string; processingAt?: string; shipAt?: string; outAt?: string } | null | undefined) {
  if (!plan?.snapshottedAt) return null;
  const rank = STATUS_RANK[status] ?? 0;
  const stages = [
    { status: 'processing', at: plan.processingAt },
    { status: 'shipped', at: plan.shipAt },
    { status: 'out_for_delivery', at: plan.outAt },
  ];
  for (const stage of stages) {
    if ((STATUS_RANK[stage.status] ?? 0) > rank && stage.at) return { status: stage.status, at: stage.at };
  }
  return null;
}

export function notificationDueAt(outAt: Date, delayMinutes: number) {
  const delay = Number.isFinite(delayMinutes) && delayMinutes > 0 ? delayMinutes : 10;
  return new Date(outAt.getTime() + delay * 60_000);
}
