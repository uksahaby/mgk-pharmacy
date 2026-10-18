/** Nigeria (West Africa Time) is UTC+1 all year, with no daylight saving. */
const WAT_OFFSET_MS = 3600_000;
const DAY_MS = 24 * 3600_000;

/** Midnight today in Nigeria, whatever time zone the server runs in. */
export function startOfNigerianDay(now = new Date()): Date {
  const local = now.getTime() + WAT_OFFSET_MS;
  return new Date(local - (local % DAY_MS) - WAT_OFFSET_MS);
}
