/**
 * calendar.js — renders Anno Dario calendars into host elements.
 *
 * Two entry points:
 *   mountCalendar(el)    — a single plain AD month grid (embed widget).
 *   mountComparison(el)  — AD and Gregorian side by side, linked by a picked
 *                          physical day, with a date box and conversion line.
 *
 * Both render each calendar NATIVELY: an AD month is a real AD month (its own
 * leap days, its own day-of-week alignment), not a relabelled Gregorian month.
 * The two calendars are linked only by the physical day a cell stands for.
 */

import {
  gregToAD,
  adToGreg,
  todayAD,
  formatAD,
  formatMonthYear,
  daysInMonth,
  dayOfWeek,
  prevMonth,
  nextMonth,
} from './anno-dario.js';

const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Astronomical year for an AD view {year, era}. */
function astroYearOf(view) {
  const astro = view.era === 'AD' ? view.year : 1 - view.year;
  return astro;
}

/** True if two {y,m,d} Gregorian dates are the same physical day. */
function sameGreg(a, b) {
  const eq = a.y === b.y && a.m === b.m && a.d === b.d;
  return eq;
}

/**
 * Build a 6x7 month <table>.
 *
 * @param {object} cfg
 * @param {string} cfg.caption    - table caption text
 * @param {number} cfg.firstDow   - weekday (0=Sun) of day 1 of this month
 * @param {number} cfg.totalDays  - number of days in this month
 * @param {number} cfg.prevTotal  - number of days in the previous month (for leading greys)
 * @param {(d:number)=>{isToday:boolean,isSelected:boolean,onPick?:()=>void}} cfg.decorate
 */
function buildGrid({ caption, firstDow, totalDays, prevTotal, decorate }) {
  const table = document.createElement('table');
  table.className = 'ad-grid';
  table.setAttribute('role', 'grid');

  const cap = document.createElement('caption');
  cap.textContent = caption;
  table.appendChild(cap);

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const h of DAY_HEADERS) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // Flat cell list: leading overflow, this month, trailing overflow → 42 cells.
  const cells = [];
  for (let i = 0; i < firstDow; i++) {
    cells.push({ d: prevTotal - firstDow + 1 + i, outside: true });
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ d, outside: false });
  }
  let nextD = 1;
  while (cells.length < 42) {
    cells.push({ d: nextD++, outside: true });
  }

  const tbody = document.createElement('tbody');
  for (let row = 0; row < 6; row++) {
    const tr = document.createElement('tr');
    for (let col = 0; col < 7; col++) {
      const cell = cells[row * 7 + col];
      const td = document.createElement('td');
      const span = document.createElement('span');
      span.className = 'ad-cell';
      if (cell.outside) {
        span.classList.add('is-outside');
      } else {
        const meta = decorate(cell.d);
        if (meta.isToday) {
          span.classList.add('is-today');
          span.setAttribute('aria-current', 'date');
        }
        if (meta.isSelected && !meta.isToday) {
          span.classList.add('is-selected');
        }
        if (meta.onPick) {
          span.classList.add('is-clickable');
          span.setAttribute('role', 'button');
          span.setAttribute('tabindex', '0');
          span.setAttribute('aria-pressed', String(meta.isSelected));
          span.addEventListener('click', meta.onPick);
          span.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              meta.onPick();
            }
          });
        }
      }
      span.textContent = cell.d;
      td.appendChild(span);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

/** Build one labelled panel with prev/next nav around a grid. */
function buildPanel({ label, title, tooltip, grid, onPrev, onNext }) {
  const widget = document.createElement('div');
  widget.className = 'ad-widget';

  if (label) {
    const labelEl = document.createElement('div');
    labelEl.className = 'ad-panel-label';
    labelEl.textContent = label;
    widget.appendChild(labelEl);
  }

  const header = document.createElement('div');
  header.className = 'ad-header';

  const prev = document.createElement('button');
  prev.className = 'ad-nav';
  prev.type = 'button';
  prev.setAttribute('aria-label', 'Previous month');
  prev.textContent = '‹';
  prev.addEventListener('click', onPrev);

  const titleEl = document.createElement('div');
  titleEl.className = 'ad-title';
  titleEl.textContent = title;
  if (tooltip) {
    titleEl.setAttribute('tabindex', '0');
    titleEl.setAttribute('role', 'button');
    titleEl.setAttribute('data-tooltip', tooltip);
  }

  const next = document.createElement('button');
  next.className = 'ad-nav';
  next.type = 'button';
  next.setAttribute('aria-label', 'Next month');
  next.textContent = '›';
  next.addEventListener('click', onNext);

  header.append(prev, titleEl, next);
  widget.appendChild(header);
  widget.appendChild(grid);
  return widget;
}

// ---------------------------------------------------------------------------
// Grid builders for each calendar system. Both return a <table>.
// ---------------------------------------------------------------------------

/**
 * AD month grid for view {year, era, m}.
 * Day-of-week and highlighting are computed via the physical Gregorian day
 * each AD date maps to, so the AD calendar aligns with real weekdays.
 */
function buildADGrid(view, todayGreg, selectedGreg, onPickGreg) {
  const astroY = astroYearOf(view);
  const totalDays = daysInMonth(astroY, view.m);

  // First day-of-week from the physical day AD (m, 1) maps to.
  const firstGreg = adToGreg({ year: view.year, era: view.era, m: view.m, d: 1 });
  const firstDow = dayOfWeek(firstGreg.y, firstGreg.m, firstGreg.d);

  // Previous AD month's length, for leading grey cells.
  const prev = prevMonth(view);
  const prevTotal = daysInMonth(astroYearOf(prev), prev.m);

  const grid = buildGrid({
    caption: `Anno Dario calendar for ${formatMonthYear(view)}`,
    firstDow,
    totalDays,
    prevTotal,
    decorate: (d) => {
      const greg = adToGreg({ year: view.year, era: view.era, m: view.m, d });
      const meta = {
        isToday: sameGreg(greg, todayGreg),
        isSelected: sameGreg(greg, selectedGreg),
        onPick: onPickGreg ? () => onPickGreg(greg) : undefined,
      };
      return meta;
    },
  });
  return grid;
}

/** Gregorian month grid for view {y, m}. */
function buildGregGrid(view, todayGreg, selectedGreg, onPickGreg) {
  const totalDays = daysInMonth(view.y, view.m);
  const firstDow = dayOfWeek(view.y, view.m, 1);
  const prevGreg = view.m === 1 ? { y: view.y - 1, m: 12 } : { y: view.y, m: view.m - 1 };
  const prevTotal = daysInMonth(prevGreg.y, prevGreg.m);

  const grid = buildGrid({
    caption: `Gregorian calendar for ${MONTH_NAMES[view.m - 1]} ${view.y}`,
    firstDow,
    totalDays,
    prevTotal,
    decorate: (d) => {
      const greg = { y: view.y, m: view.m, d };
      const meta = {
        isToday: sameGreg(greg, todayGreg),
        isSelected: sameGreg(greg, selectedGreg),
        onPick: onPickGreg ? () => onPickGreg(greg) : undefined,
      };
      return meta;
    },
  });
  return grid;
}

// ---------------------------------------------------------------------------
// Embed widget: a single, plain, read-only AD month.
// ---------------------------------------------------------------------------

export function mountCalendar(root) {
  if (!root) throw new Error('mountCalendar: root element required');

  const today = todayAD();
  const todayGreg = adToGreg(today);
  let view = { year: today.year, era: today.era, m: today.m };

  function render() {
    root.innerHTML = '';
    root.classList.add('ad-widget');

    const panel = buildPanel({
      label: null,
      title: formatMonthYear(view),
      tooltip: `Anno Dario · anchored at Gregorian March 14, 2023`,
      grid: buildADGrid(view, todayGreg, todayGreg, null),
      onPrev: () => { view = prevMonth(view); render(); },
      onNext: () => { view = nextMonth(view); render(); },
    });
    // buildPanel wraps its own widget; unwrap into root to keep one .ad-widget.
    while (panel.firstChild) root.appendChild(panel.firstChild);
  }

  render();
  return { rerender: render };
}

// ---------------------------------------------------------------------------
// Side-by-side comparison: AD and Gregorian, linked by a picked physical day.
// ---------------------------------------------------------------------------

export function mountComparison(root) {
  if (!root) throw new Error('mountComparison: root element required');

  const todayGreg = adToGreg(todayAD());
  let selectedGreg = { ...todayGreg };               // The picked physical day.
  let viewGreg = { y: todayGreg.y, m: todayGreg.m };  // Gregorian panel's month.
  const startAD = gregToAD(selectedGreg);
  let viewAD = { year: startAD.year, era: startAD.era, m: startAD.m }; // AD panel's month.

  // Picking any physical day selects it and snaps both panels to show it.
  function pickGreg(greg) {
    selectedGreg = { ...greg };
    viewGreg = { y: greg.y, m: greg.m };
    const ad = gregToAD(greg);
    viewAD = { year: ad.year, era: ad.era, m: ad.m };
    render();
  }

  function shiftGreg(delta) {
    let { y, m } = viewGreg;
    m += delta;
    while (m < 1) { m += 12; y -= 1; }
    while (m > 12) { m -= 12; y += 1; }
    viewGreg = { y, m };
    render();
  }

  function render() {
    root.innerHTML = '';
    root.classList.add('ad-compare');

    // --- date picker + conversion line ---
    const controls = document.createElement('div');
    controls.className = 'ad-controls';

    const pickerLabel = document.createElement('label');
    pickerLabel.className = 'ad-picker';
    pickerLabel.textContent = 'Pick a date: ';
    const picker = document.createElement('input');
    picker.type = 'date';
    picker.value = `${selectedGreg.y}-${String(selectedGreg.m).padStart(2, '0')}-${String(selectedGreg.d).padStart(2, '0')}`;
    picker.addEventListener('change', () => {
      const [yy, mm, dd] = picker.value.split('-').map(Number);
      if (!yy || !mm || !dd) return;
      pickGreg({ y: yy, m: mm, d: dd });
    });
    pickerLabel.appendChild(picker);
    controls.appendChild(pickerLabel);

    const conversion = document.createElement('div');
    conversion.className = 'ad-conversion';
    const selAD = gregToAD(selectedGreg);
    conversion.textContent =
      `${MONTH_NAMES[selectedGreg.m - 1]} ${selectedGreg.d}, ${selectedGreg.y}  =  ${formatAD(selAD)}`;
    controls.appendChild(conversion);

    root.appendChild(controls);

    // --- panels ---
    const panels = document.createElement('div');
    panels.className = 'ad-panels';

    const adPanel = buildPanel({
      label: 'Anno Dario',
      title: formatMonthYear(viewAD),
      tooltip: `Anno Dario · anchored at Gregorian March 14, 2023`,
      grid: buildADGrid(viewAD, todayGreg, selectedGreg, pickGreg),
      onPrev: () => { viewAD = prevMonth(viewAD); render(); },
      onNext: () => { viewAD = nextMonth(viewAD); render(); },
    });

    const gregPanel = buildPanel({
      label: 'Gregorian',
      title: `${MONTH_NAMES[viewGreg.m - 1]} ${viewGreg.y}`,
      tooltip: null,
      grid: buildGregGrid(viewGreg, todayGreg, selectedGreg, pickGreg),
      onPrev: () => shiftGreg(-1),
      onNext: () => shiftGreg(1),
    });

    panels.append(adPanel, gregPanel);
    root.appendChild(panels);
  }

  render();
  return { rerender: render };
}
