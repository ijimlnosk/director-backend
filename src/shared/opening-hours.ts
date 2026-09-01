import { z } from 'zod';

const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/**
 * Compact weekly opening hours.
 * - `weekly` keys are weekday indices "0"(Sun)..."6"(Sat); the value is a list
 *   of [open, close] "HH:MM" ranges. A range whose close <= open wraps past
 *   midnight into the next day.
 * - A weekday present with an empty list means "closed that day".
 * - A weekday absent from `weekly` means "closed that day" too.
 * - `weekly` itself absent/empty => hours unknown.
 */
export const openHoursSchema = z.object({
  tz: z.string().min(1).default('Asia/Seoul'),
  weekly: z.record(z.string().regex(/^[0-6]$/), z.array(z.tuple([HHMM, HHMM]))).optional(),
  closedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

export type OpenHours = z.infer<typeof openHoursSchema>;

export type OpenState = 'open' | 'closed' | 'unknown';

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

interface LocalNow {
  date: string;
  weekday: number;
  minutes: number;
}

function localNow(at: Date, tz: string): LocalNow {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(at);
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
    minutes: Number(hour) * 60 + Number(get('minute')),
  };
}

function rangesFor(hours: OpenHours, weekday: number): [string, string][] {
  return hours.weekly?.[String(weekday)] ?? [];
}

/** Whether a place with these hours is open at `at`. */
export function openStateAt(hours: OpenHours | null | undefined, at: Date): OpenState {
  if (!hours?.weekly || Object.keys(hours.weekly).length === 0) return 'unknown';

  const now = localNow(at, hours.tz);
  if (hours.closedDates?.includes(now.date)) return 'closed';

  for (const [open, close] of rangesFor(hours, now.weekday)) {
    const openM = toMin(open);
    const closeM = toMin(close);
    if (closeM > openM) {
      if (now.minutes >= openM && now.minutes < closeM) return 'open';
    } else if (now.minutes >= openM) {
      return 'open'; // wraps past midnight, still open tonight
    }
  }
  // A range that started yesterday and wraps into today.
  const yesterday = (now.weekday + 6) % 7;
  for (const [open, close] of rangesFor(hours, yesterday)) {
    const openM = toMin(open);
    const closeM = toMin(close);
    if (closeM <= openM && now.minutes < closeM) return 'open';
  }
  return 'closed';
}
