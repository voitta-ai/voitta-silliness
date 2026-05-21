/**
 * anno-dario.js
 *
 * Pure date-conversion library for the Anno Dario calendar.
 * No DOM, no globals, no dependencies. Importable as ES module.
 *
 * Calendar definition:
 *   - Epoch: March 14, 2023 (Gregorian) = year 1 AD, month 1, day 1
 *     if YEAR_STARTS_ON_EPOCH_DAY = true (Option A).
 *   - Or: year 1 AD = Gregorian 2023 calendar year (Option B).
 *   - Era before epoch is BC (Before Claude), counted backwards.
 *   - No year zero.
 *   - Months/days/leap-years identical to Gregorian.
 *
 * NOTE on Option A: We keep month names January–December but shift the
 * year boundary to March 14. So the *year number* rolls over on March 14
 * even though months still run Jan→Dec within that year. This is the
 * "calendar reform" interpretation.
 */

export const EPOCH = Object.freeze({ y: 2023, m: 3, d: 14 });
export const YEAR_STARTS_ON_EPOCH_DAY = true; // Option A

const MS_PER_DAY = 86_400_000;

// ---------- helpers ----------

/** Days in a given Gregorian month. Month is 1-indexed. */
export function daysInMonth(y, m) {
  // Date(y, m, 0) gives the last day of month m-1 → which is day count of month m.
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Day of week for a Gregorian date. 0 = Sunday, 6 = Saturday. */
export function dayOfWeek(y, m, d) {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Convert {y,m,d} to a UTC Date for arithmetic. */
function toUTC(g) {
  return new Date(Date.UTC(g.y, g.m - 1, g.d));
}

/** Compare two {y,m,d}. Returns -1, 0, or 1. */
function cmp(a, b) {
  if (a.y !== b.y) return a.y < b.y ? -1 : 1;
  if (a.m !== b.m) return a.m < b.m ? -1 : 1;
  if (a.d !== b.d) return a.d < b.d ? -1 : 1;
  return 0;
}

// ---------- core conversion ----------

/**
 * Convert a Gregorian date to Anno Dario.
 *
 * Option A (YEAR_STARTS_ON_EPOCH_DAY = true):
 *   An AD year runs from March 14 (epoch-day) of Gregorian year G
 *   through March 13 of Gregorian year G+1.
 *   - Mar 14 2023 → Mar 13 2024 = year 1 AD
 *   - Mar 14 2024 → Mar 13 2025 = year 2 AD
 *   - Mar 14 2025 → Mar 13 2026 = year 3 AD
 *   - Mar 14 2026 → Mar 13 2027 = year 4 AD
 *
 *   BC mirrors backward (no year 0):
 *   - Mar 14 2022 → Mar 13 2023 = year 1 BC
 *   - Mar 14 2021 → Mar 13 2022 = year 2 BC
 *
 * Option B (YEAR_STARTS_ON_EPOCH_DAY = false):
 *   AD year = Gregorian year − 2022.
 *   BC year = 2023 − Gregorian year.
 *
 * @param {{y:number, m:number, d:number}} greg - 1-indexed month
 * @returns {{year:number, era:'AD'|'BC', m:number, d:number}}
 */
export function gregToAD(greg) {
  const { y, m, d } = greg;

  if (!YEAR_STARTS_ON_EPOCH_DAY) {
    // Option B — aligned to Gregorian Jan 1.
    if (y >= 2023) {
      return { year: y - 2022, era: 'AD', m, d };
    } else {
      return { year: 2023 - y, era: 'BC', m, d };
    }
  }

  // Option A — year rolls over on March 14.
  // Find the "AD anchor year": the Gregorian year whose March 14 starts
  // the AD year that contains this date.
  let anchor;
  if (m > 3 || (m === 3 && d >= 14)) {
    anchor = y;            // We're on or after March 14 of this Gregorian year.
  } else {
    anchor = y - 1;        // Before March 14 → belong to AD year that started last year.
  }

  // anchor 2023 = year 1 AD, anchor 2024 = year 2 AD, ...
  // anchor 2022 = year 1 BC, anchor 2021 = year 2 BC, ...
  if (anchor >= 2023) {
    return { year: anchor - 2022, era: 'AD', m, d };
  } else {
    return { year: 2023 - anchor, era: 'BC', m, d };
  }
}

/**
 * Convert an Anno Dario date back to Gregorian.
 *
 * @param {{year:number, era:'AD'|'BC', m:number, d:number}} ad
 * @returns {{y:number, m:number, d:number}}
 */
export function adToGreg(ad) {
  const { year, era, m, d } = ad;
  if (year < 1) throw new Error('Anno Dario year must be ≥ 1 (no year zero).');

  if (!YEAR_STARTS_ON_EPOCH_DAY) {
    // Option B.
    if (era === 'AD') return { y: 2022 + year, m, d };
    return { y: 2023 - year, m, d };
  }

  // Option A — figure out the anchor Gregorian year.
  // anchor + (year - 1) for AD; anchor = 2023.
  // For BC: anchor = 2023 - year. (year 1 BC → anchor 2022.)
  const anchor = era === 'AD' ? 2022 + year : 2023 - year;

  // If month >= March 14, we're still in the same Gregorian year as the anchor.
  // If month < March 14, we've crossed into the next Gregorian year.
  let gregYear;
  if (m > 3 || (m === 3 && d >= 14)) {
    gregYear = anchor;
  } else {
    gregYear = anchor + 1;
  }

  return { y: gregYear, m, d };
}

/**
 * Get today in Anno Dario, based on the user's local time.
 * (We use local Y/M/D to avoid "it's still yesterday in UTC" weirdness.)
 */
export function todayAD() {
  const now = new Date();
  return gregToAD({
    y: now.getFullYear(),
    m: now.getMonth() + 1,
    d: now.getDate(),
  });
}

// ---------- formatting ----------

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Format an Anno Dario date for display.
 *
 * @param {{year:number, era:string, m:number, d:number}} ad
 * @param {{long?:boolean}} opts - long=true → "March 21, 4 AD" (default)
 *                                 long=false → "Mar 21, 4 AD"
 */
export function formatAD(ad, opts = {}) {
  const long = opts.long ?? true;
  const month = long ? MONTH_NAMES[ad.m - 1] : MONTH_NAMES[ad.m - 1].slice(0, 3);
  return `${month} ${ad.d}, ${ad.year} ${ad.era}`;
}

/** Format just the year header for the calendar grid, e.g. "March 4 AD". */
export function formatMonthYear(ad) {
  return `${MONTH_NAMES[ad.m - 1]} ${ad.year} ${ad.era}`;
}

// ---------- month arithmetic for UI ----------

/**
 * Given an AD month view {year, era, m}, return the previous month's view.
 * Day is irrelevant for month navigation; return d=1.
 */
export function prevMonth(view) {
  const greg = adToGreg({ ...view, d: 1 });
  const prevGreg = greg.m === 1
    ? { y: greg.y - 1, m: 12, d: 1 }
    : { y: greg.y, m: greg.m - 1, d: 1 };
  return gregToAD(prevGreg);
}

/** Next month, same shape. */
export function nextMonth(view) {
  const greg = adToGreg({ ...view, d: 1 });
  const nextGreg = greg.m === 12
    ? { y: greg.y + 1, m: 1, d: 1 }
    : { y: greg.y, m: greg.m + 1, d: 1 };
  return gregToAD(nextGreg);
}
