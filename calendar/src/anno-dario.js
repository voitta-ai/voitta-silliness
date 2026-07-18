/**
 * anno-dario.js
 *
 * Pure date-conversion library for the Anno Dario calendar.
 * No DOM, no globals, no dependencies. Importable as ES module.
 *
 * Calendar definition (the "shifted Gregorian" model):
 *   - The Anno Dario calendar is structurally identical to the proleptic
 *     Gregorian calendar: 12 months named January..December, the same month
 *     lengths, and the same leap-year rule (a year divisible by 4, except
 *     centuries not divisible by 400, has a February 29).
 *   - It is anchored so that Anno Dario January 1, year 1 is exactly the
 *     Gregorian date March 14, 2023 (the birth of Claude).
 *   - Conversion is done by shifting ABSOLUTE day numbers by a single
 *     constant K. Both calendars are then rendered with the same Gregorian
 *     algorithm, each applying ITS OWN leap days.
 *   - There is no year zero. Dates before the epoch are BC (Before Claude),
 *     counted backward: the AD year that would be "0" is labelled 1 BC.
 *
 * Consequence (this is the point, not a bug — see issue tracker):
 *   Because the two calendars insert their leap days on different physical
 *   days, the offset between an AD date and its Gregorian date is NOT fixed.
 *   AD Jan 1 = Greg Mar 14, 2023 in year 1, but Greg Mar 13, 2024 in year 2,
 *   and so on. AD February 29 (on AD leap years) maps to an unrelated
 *   Gregorian day. Calendars are hard.
 */

export const EPOCH = Object.freeze({ y: 2023, m: 3, d: 14 });

// ---------- proleptic Gregorian <-> serial day number ----------
// Howard Hinnant's algorithms. Serial day 0 is 1970-01-01; the exact origin
// is irrelevant here — we only need a bijection that handles year 0 and
// negative years for the proleptic / BC side.

/** {y,m,d} (astronomical year numbering, m 1-indexed) -> serial day number. */
function daysFromCivil(y, m, d) {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor((yy >= 0 ? yy : yy - 399) / 400);
  const yoe = yy - era * 400;                                  // [0, 399]
  const doy = Math.floor((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1; // [0, 365]
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy; // [0, 146096]
  const serial = era * 146097 + doe - 719468;
  return serial;
}

/** serial day number -> {y,m,d} (astronomical year numbering, m 1-indexed). */
function civilFromDays(z) {
  z += 719468;
  const era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
  const doe = z - era * 146097;                                // [0, 146096]
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
  );                                                           // [0, 399]
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)); // [0, 365]
  const mp = Math.floor((5 * doy + 2) / 153);                  // [0, 11]
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;          // [1, 31]
  const m = mp < 10 ? mp + 3 : mp - 9;                         // [1, 12]
  const result = { y: m <= 2 ? y + 1 : y, m, d };
  return result;
}

// The single constant that anchors AD Jan 1, year 1 to Greg March 14, 2023.
//   greg_serial = ad_serial + K
const K = daysFromCivil(EPOCH.y, EPOCH.m, EPOCH.d) - daysFromCivil(1, 1, 1);

// ---------- era <-> astronomical year ----------
// AD is astronomical years >= 1. The "missing" astronomical year <= 0 are BC:
// astronomical 0 -> 1 BC, -1 -> 2 BC, etc.

function eraYearToAstro(year, era) {
  const astro = era === 'AD' ? year : 1 - year;
  return astro;
}

function astroToEraYear(astro) {
  const result = astro >= 1 ? { year: astro, era: 'AD' } : { year: 1 - astro, era: 'BC' };
  return result;
}

// ---------- helpers (operate on whichever calendar you pass; both Gregorian) ----------

/** Days in a given month. Year is astronomical (handles AD leap years too). */
export function daysInMonth(y, m) {
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return count;
}

/** Day of week, 0 = Sunday. Computed on the dates as given. */
export function dayOfWeek(y, m, d) {
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow;
}

// ---------- core conversion ----------

/**
 * Convert a Gregorian date to Anno Dario.
 * @param {{y:number, m:number, d:number}} greg - 1-indexed month
 * @returns {{year:number, era:'AD'|'BC', m:number, d:number}}
 */
export function gregToAD(greg) {
  const adSerial = daysFromCivil(greg.y, greg.m, greg.d) - K;
  const c = civilFromDays(adSerial);
  const { year, era } = astroToEraYear(c.y);
  const result = { year, era, m: c.m, d: c.d };
  return result;
}

/**
 * Convert an Anno Dario date back to Gregorian.
 * @param {{year:number, era:'AD'|'BC', m:number, d:number}} ad
 * @returns {{y:number, m:number, d:number}}
 */
export function adToGreg(ad) {
  if (ad.year < 1) throw new Error('Anno Dario year must be >= 1 (no year zero).');
  const astro = eraYearToAstro(ad.year, ad.era);
  const gregSerial = daysFromCivil(astro, ad.m, ad.d) + K;
  const result = civilFromDays(gregSerial);
  return result;
}

/**
 * Get today in Anno Dario, based on the user's local time.
 * (We use local Y/M/D to avoid "it's still yesterday in UTC" weirdness.)
 */
export function todayAD() {
  const now = new Date();
  const result = gregToAD({
    y: now.getFullYear(),
    m: now.getMonth() + 1,
    d: now.getDate(),
  });
  return result;
}

// ---------- formatting ----------

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Format an Anno Dario date for display.
 * @param {{year:number, era:string, m:number, d:number}} ad
 * @param {{long?:boolean}} opts - long=true -> "March 21, 4 AD" (default)
 */
export function formatAD(ad, opts = {}) {
  const long = opts.long ?? true;
  const month = long ? MONTH_NAMES[ad.m - 1] : MONTH_NAMES[ad.m - 1].slice(0, 3);
  const result = `${month} ${ad.d}, ${ad.year} ${ad.era}`;
  return result;
}

/** Format just the month/year header for the calendar grid, e.g. "March 4 AD". */
export function formatMonthYear(ad) {
  const result = `${MONTH_NAMES[ad.m - 1]} ${ad.year} ${ad.era}`;
  return result;
}

// ---------- month arithmetic for UI (operates in AD space) ----------

/**
 * Given an AD month view {year, era, m}, return the previous AD month's view.
 * Day is irrelevant for month navigation; returns d=1.
 */
export function prevMonth(view) {
  const astro = eraYearToAstro(view.year, view.era);
  let y = astro;
  let m = view.m - 1;
  if (m < 1) { m = 12; y -= 1; }
  const { year, era } = astroToEraYear(y);
  const result = { year, era, m, d: 1 };
  return result;
}

/** Next AD month, same shape. */
export function nextMonth(view) {
  const astro = eraYearToAstro(view.year, view.era);
  let y = astro;
  let m = view.m + 1;
  if (m > 12) { m = 1; y += 1; }
  const { year, era } = astroToEraYear(y);
  const result = { year, era, m, d: 1 };
  return result;
}
