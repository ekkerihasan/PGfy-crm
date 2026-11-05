// All "today" boundaries are computed in IST (Asia/Kolkata, fixed UTC+05:30, no DST).
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfTodayIST(now: Date = new Date()): Date {
  const istMs = now.getTime() + IST_OFFSET_MS;
  const istMidnight = Math.floor(istMs / DAY_MS) * DAY_MS;
  return new Date(istMidnight - IST_OFFSET_MS);
}

export function startOfTomorrowIST(now: Date = new Date()): Date {
  return new Date(startOfTodayIST(now).getTime() + DAY_MS);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/** YYYY-MM-DD in IST, used in CSV filenames. */
export function istDateStamp(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}
