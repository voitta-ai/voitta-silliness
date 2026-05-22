/**
 * Unit tests for anno-dario.js. Run with: node --test tests/anno-dario.test.js
 *
 * These tests assume YEAR_STARTS_ON_EPOCH_DAY = true (Option A).
 * If you flip the constant to false (Option B), the "anchor" cases will fail
 * and you'll need to replace them with the Option B-aligned expectations.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EPOCH,
  YEAR_STARTS_ON_EPOCH_DAY,
  gregToAD,
  adToGreg,
  daysInMonth,
  dayOfWeek,
  formatAD,
  formatMonthYear,
  prevMonth,
  nextMonth,
} from '../src/anno-dario.js';

// ---------- daysInMonth ----------

test('daysInMonth: January has 31', () => {
  assert.equal(daysInMonth(2024, 1), 31);
});

test('daysInMonth: February 2024 (leap) has 29', () => {
  assert.equal(daysInMonth(2024, 2), 29);
});

test('daysInMonth: February 2023 (non-leap) has 28', () => {
  assert.equal(daysInMonth(2023, 2), 28);
});

test('daysInMonth: February 2000 (leap by div-400) has 29', () => {
  assert.equal(daysInMonth(2000, 2), 29);
});

test('daysInMonth: February 1900 (NOT leap by div-100 rule) has 28', () => {
  assert.equal(daysInMonth(1900, 2), 28);
});

// ---------- dayOfWeek ----------

test('dayOfWeek: epoch March 14, 2023 is a Tuesday (2)', () => {
  assert.equal(dayOfWeek(2023, 3, 14), 2);
});

test('dayOfWeek: today May 21, 2026 — Thursday (4)', () => {
  assert.equal(dayOfWeek(2026, 5, 21), 4);
});

// ---------- gregToAD (Option A) ----------

if (YEAR_STARTS_ON_EPOCH_DAY) {
  test('gregToAD: epoch day → 1 AD March 14', () => {
    assert.deepEqual(
      gregToAD({ y: 2023, m: 3, d: 14 }),
      { year: 1, era: 'AD', m: 3, d: 14 }
    );
  });

  test('gregToAD: day before epoch → 1 BC March 13', () => {
    assert.deepEqual(
      gregToAD({ y: 2023, m: 3, d: 13 }),
      { year: 1, era: 'BC', m: 3, d: 13 }
    );
  });

  test('gregToAD: Jan 1, 2024 falls in year 1 AD (year started Mar 14, 2023)', () => {
    assert.deepEqual(
      gregToAD({ y: 2024, m: 1, d: 1 }),
      { year: 1, era: 'AD', m: 1, d: 1 }
    );
  });

  test('gregToAD: March 13, 2024 = last day of year 1 AD', () => {
    assert.deepEqual(
      gregToAD({ y: 2024, m: 3, d: 13 }),
      { year: 1, era: 'AD', m: 3, d: 13 }
    );
  });

  test('gregToAD: March 14, 2024 = first day of year 2 AD', () => {
    assert.deepEqual(
      gregToAD({ y: 2024, m: 3, d: 14 }),
      { year: 2, era: 'AD', m: 3, d: 14 }
    );
  });

  test('gregToAD: today May 21, 2026 → 4 AD May 21', () => {
    assert.deepEqual(
      gregToAD({ y: 2026, m: 5, d: 21 }),
      { year: 4, era: 'AD', m: 5, d: 21 }
    );
  });

  test('gregToAD: Jan 1, 2026 → year 3 AD (rolls over Mar 14, 2026)', () => {
    assert.deepEqual(
      gregToAD({ y: 2026, m: 1, d: 1 }),
      { year: 3, era: 'AD', m: 1, d: 1 }
    );
  });

  test('gregToAD: BC side — March 14, 2022 = year 1 BC March 14', () => {
    assert.deepEqual(
      gregToAD({ y: 2022, m: 3, d: 14 }),
      { year: 1, era: 'BC', m: 3, d: 14 }
    );
  });

  test('gregToAD: BC side — Jan 1, 2022 = year 2 BC (year 2 BC started Mar 14, 2021)', () => {
    assert.deepEqual(
      gregToAD({ y: 2022, m: 1, d: 1 }),
      { year: 2, era: 'BC', m: 1, d: 1 }
    );
  });

  test('gregToAD: Nov 21, 2021 (Anthropic founding) = year 2 BC Nov 21', () => {
    assert.deepEqual(
      gregToAD({ y: 2021, m: 11, d: 21 }),
      { year: 2, era: 'BC', m: 11, d: 21 }
    );
  });
}

// ---------- round trip ----------

test('round trip: epoch day', () => {
  const greg = { y: 2023, m: 3, d: 14 };
  assert.deepEqual(adToGreg(gregToAD(greg)), greg);
});

test('round trip: today', () => {
  const greg = { y: 2026, m: 5, d: 21 };
  assert.deepEqual(adToGreg(gregToAD(greg)), greg);
});

test('round trip: leap day Feb 29, 2024', () => {
  const greg = { y: 2024, m: 2, d: 29 };
  assert.deepEqual(adToGreg(gregToAD(greg)), greg);
});

test('round trip: deep past Jan 1, 1000', () => {
  const greg = { y: 1000, m: 1, d: 1 };
  assert.deepEqual(adToGreg(gregToAD(greg)), greg);
});

test('round trip: far future Dec 31, 3000', () => {
  const greg = { y: 3000, m: 12, d: 31 };
  assert.deepEqual(adToGreg(gregToAD(greg)), greg);
});

test('round trip: every first-of-month for 10 years', () => {
  for (let y = 2020; y <= 2030; y++) {
    for (let m = 1; m <= 12; m++) {
      const greg = { y, m, d: 1 };
      assert.deepEqual(adToGreg(gregToAD(greg)), greg, `failed at ${y}-${m}-01`);
    }
  }
});

// ---------- adToGreg edge cases ----------

test('adToGreg: year zero is forbidden', () => {
  assert.throws(() => adToGreg({ year: 0, era: 'AD', m: 1, d: 1 }));
  assert.throws(() => adToGreg({ year: 0, era: 'BC', m: 1, d: 1 }));
});

// ---------- formatting ----------

test('formatAD: long form', () => {
  assert.equal(
    formatAD({ year: 4, era: 'AD', m: 5, d: 21 }),
    'May 21, 4 AD'
  );
});

test('formatAD: short form', () => {
  assert.equal(
    formatAD({ year: 4, era: 'AD', m: 5, d: 21 }, { long: false }),
    'May 21, 4 AD'
  );
});

test('formatMonthYear', () => {
  assert.equal(
    formatMonthYear({ year: 4, era: 'AD', m: 5, d: 21 }),
    'May 4 AD'
  );
});

// ---------- month navigation ----------

test('prevMonth: from March 4 AD → February 4 AD', () => {
  const view = { year: 4, era: 'AD', m: 3, d: 1 };
  const prev = prevMonth(view);
  assert.equal(prev.m, 2);
  assert.equal(prev.year, 4);
  assert.equal(prev.era, 'AD');
});

test('prevMonth: from Jan 3 AD → Dec 3 AD', () => {
  // Jan 2026 is year 3 AD, Dec 2025 is also year 3 AD (year 3 = Mar 14 '25 → Mar 13 '26).
  const view = gregToAD({ y: 2026, m: 1, d: 1 });
  const prev = prevMonth(view);
  assert.equal(prev.m, 12);
  assert.equal(prev.year, 3);
  assert.equal(prev.era, 'AD');
});

test('nextMonth: from Feb 4 AD → March 4 AD (year rolls)', () => {
  // Feb 2027 is year 4 AD (year 4 = Mar 14 '26 → Mar 13 '27).
  // March 2027 is year 5 AD.
  const view = gregToAD({ y: 2027, m: 2, d: 1 });
  assert.equal(view.year, 4);
  const next = nextMonth(view);
  // March 1, 2027 is still year 4 AD (year doesn't roll until Mar 14).
  assert.equal(next.year, 4);
  assert.equal(next.m, 3);
});

test('nextMonth: crossing Dec → Jan keeps the same AD year', () => {
  // Dec 2025 is year 3 AD. Jan 2026 is also year 3 AD.
  const view = gregToAD({ y: 2025, m: 12, d: 1 });
  assert.equal(view.year, 3);
  const next = nextMonth(view);
  assert.equal(next.m, 1);
  assert.equal(next.year, 3);
});
