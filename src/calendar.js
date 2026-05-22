/**
 * calendar.js — renders the Anno Dario month grid into a host element.
 *
 * Usage:
 *   import { mountCalendar } from './calendar.js';
 *   mountCalendar(document.getElementById('calendar'));
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

export function mountCalendar(root, opts = {}) {
  if (!root) throw new Error('mountCalendar: root element required');

  const today = todayAD();
  // The "view" is which month is currently shown. Start on today's month.
  let view = { ...today, d: 1 };

  function render() {
    root.innerHTML = '';
    root.classList.add('ad-widget');

    // --- header ---
    const header = document.createElement('div');
    header.className = 'ad-header';

    const prev = document.createElement('button');
    prev.className = 'ad-nav';
    prev.type = 'button';
    prev.setAttribute('aria-label', 'Previous month');
    prev.textContent = '‹';
    prev.addEventListener('click', () => {
      view = { ...prevMonth(view), d: 1 };
      render();
    });

    const title = document.createElement('div');
    title.className = 'ad-title';
    title.textContent = formatMonthYear(view);
    title.setAttribute('tabindex', '0');
    title.setAttribute('role', 'button');
    // Tooltip shows the Gregorian equivalent of the FIRST day of this AD month view.
    const gregFirst = adToGreg({ ...view, d: 1 });
    title.setAttribute(
      'data-tooltip',
      `Anno Dario · Gregorian ${gregFirst.y}`
    );

    const next = document.createElement('button');
    next.className = 'ad-nav';
    next.type = 'button';
    next.setAttribute('aria-label', 'Next month');
    next.textContent = '›';
    next.addEventListener('click', () => {
      view = { ...nextMonth(view), d: 1 };
      render();
    });

    header.append(prev, title, next);
    root.appendChild(header);

    // --- grid ---
    const table = document.createElement('table');
    table.className = 'ad-grid';
    table.setAttribute('role', 'grid');

    const caption = document.createElement('caption');
    caption.textContent = `Calendar for ${formatMonthYear(view)}`;
    table.appendChild(caption);

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

    const tbody = document.createElement('tbody');

    // We render the calendar grid using GREGORIAN day-of-week math,
    // since months still have Gregorian shapes.
    const greg = adToGreg({ ...view, d: 1 });
    const firstDow = dayOfWeek(greg.y, greg.m, 1);   // 0=Sun
    const totalDays = daysInMonth(greg.y, greg.m);

    // Previous month overflow (greyed-out leading days).
    const prevGreg = greg.m === 1
      ? { y: greg.y - 1, m: 12 }
      : { y: greg.y, m: greg.m - 1 };
    const prevTotal = daysInMonth(prevGreg.y, prevGreg.m);

    // Build a flat array of cells, then chunk into rows of 7.
    const cells = [];
    for (let i = 0; i < firstDow; i++) {
      cells.push({
        d: prevTotal - firstDow + 1 + i,
        outside: true,
      });
    }
    for (let d = 1; d <= totalDays; d++) {
      cells.push({ d, outside: false, y: greg.y, m: greg.m });
    }
    // Pad to 6 full rows (42 cells) so the grid height never jumps.
    let nextD = 1;
    while (cells.length < 42) {
      cells.push({ d: nextD++, outside: true });
    }

    // Today comparison — in Gregorian terms, since we're laying out Gregorian months.
    const todayGreg = adToGreg(today);

    for (let row = 0; row < 6; row++) {
      const tr = document.createElement('tr');
      for (let col = 0; col < 7; col++) {
        const cell = cells[row * 7 + col];
        const td = document.createElement('td');
        const span = document.createElement('span');
        span.className = 'ad-cell';
        if (cell.outside) {
          span.classList.add('is-outside');
        } else if (
          cell.y === todayGreg.y &&
          cell.m === todayGreg.m &&
          cell.d === todayGreg.d
        ) {
          span.classList.add('is-today');
          span.setAttribute('aria-current', 'date');
        }
        span.textContent = cell.d;
        td.appendChild(span);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    root.appendChild(table);

    // Optional fact slot, if facts.json data has been passed in opts.
    if (opts.factsByMonthDay) {
      const todayKey = `${String(todayGreg.m).padStart(2, '0')}-${String(todayGreg.d).padStart(2, '0')}`;
      const fact = opts.factsByMonthDay[todayKey];
      if (fact) {
        const factEl = document.createElement('div');
        factEl.className = 'fact';
        factEl.textContent = `On this day: ${fact}`;
        root.appendChild(factEl);
      }
    }
  }

  render();
  return { rerender: render };
}

// ---------------------------------------------------------------------------
// Side-by-side comparison view (standalone page only).
//
// Renders the Anno Dario calendar next to a plain Gregorian one for the same
// month, with a date picker that jumps both and prints the conversion. The
// embed widget stays deliberately plain; this is the explorable version.
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Build the 6x7 day grid <table> for a Gregorian month, highlighting today and the selected day. */
function buildGrid(greg, selected, today) {
  const table = document.createElement('table');
  table.className = 'ad-grid';
  table.setAttribute('role', 'grid');

  const caption = document.createElement('caption');
  caption.textContent = `Calendar for ${MONTH_NAMES[greg.m - 1]} ${greg.y}`;
  table.appendChild(caption);

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

  const firstDow = dayOfWeek(greg.y, greg.m, 1);
  const totalDays = daysInMonth(greg.y, greg.m);
  const prevGreg = greg.m === 1
    ? { y: greg.y - 1, m: 12 }
    : { y: greg.y, m: greg.m - 1 };
  const prevTotal = daysInMonth(prevGreg.y, prevGreg.m);

  const cells = [];
  for (let i = 0; i < firstDow; i++) {
    cells.push({ d: prevTotal - firstDow + 1 + i, outside: true });
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ d, outside: false, y: greg.y, m: greg.m });
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
        const isToday = cell.y === today.y && cell.m === today.m && cell.d === today.d;
        const isSelected = cell.y === selected.y && cell.m === selected.m && cell.d === selected.d;
        if (isToday) {
          span.classList.add('is-today');
          span.setAttribute('aria-current', 'date');
        }
        if (isSelected && !isToday) {
          span.classList.add('is-selected');
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

/** Build one labelled calendar panel with its own prev/next nav. */
function buildPanel({ label, title, tooltip, grid, onPrev, onNext }) {
  const widget = document.createElement('div');
  widget.className = 'ad-widget';

  const labelEl = document.createElement('div');
  labelEl.className = 'ad-panel-label';
  labelEl.textContent = label;
  widget.appendChild(labelEl);

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

export function mountComparison(root) {
  if (!root) throw new Error('mountComparison: root element required');

  const todayGreg = adToGreg(todayAD());
  let view = { y: todayGreg.y, m: todayGreg.m };  // Gregorian month on display.
  let selected = { ...todayGreg };                // Selected Gregorian date (default: today).

  function shiftView(deltaMonths) {
    let { y, m } = view;
    m += deltaMonths;
    while (m < 1) { m += 12; y -= 1; }
    while (m > 12) { m -= 12; y += 1; }
    view = { y, m };
    render();
  }

  function render() {
    root.innerHTML = '';
    root.classList.add('ad-compare');

    // --- date picker ---
    const controls = document.createElement('div');
    controls.className = 'ad-controls';

    const pickerLabel = document.createElement('label');
    pickerLabel.className = 'ad-picker';
    pickerLabel.textContent = 'Pick a date: ';
    const picker = document.createElement('input');
    picker.type = 'date';
    picker.value = `${selected.y}-${String(selected.m).padStart(2, '0')}-${String(selected.d).padStart(2, '0')}`;
    picker.addEventListener('change', () => {
      const [yy, mm, dd] = picker.value.split('-').map(Number);
      if (!yy || !mm || !dd) return;
      selected = { y: yy, m: mm, d: dd };
      view = { y: yy, m: mm };
      render();
    });
    pickerLabel.appendChild(picker);
    controls.appendChild(pickerLabel);

    const conversion = document.createElement('div');
    conversion.className = 'ad-conversion';
    const selAD = gregToAD(selected);
    conversion.textContent =
      `${MONTH_NAMES[selected.m - 1]} ${selected.d}, ${selected.y}  =  ${formatAD(selAD)}`;
    controls.appendChild(conversion);

    root.appendChild(controls);

    // --- panels ---
    const panels = document.createElement('div');
    panels.className = 'ad-panels';

    const viewAD = gregToAD({ ...view, d: 1 });
    const adPanel = buildPanel({
      label: 'Anno Dario',
      title: formatMonthYear(viewAD),
      tooltip: `Anno Dario · Gregorian ${view.y}`,
      grid: buildGrid(view, selected, todayGreg),
      onPrev: () => shiftView(-1),
      onNext: () => shiftView(1),
    });

    const gregPanel = buildPanel({
      label: 'Gregorian',
      title: `${MONTH_NAMES[view.m - 1]} ${view.y}`,
      tooltip: null,
      grid: buildGrid(view, selected, todayGreg),
      onPrev: () => shiftView(-1),
      onNext: () => shiftView(1),
    });

    panels.append(adPanel, gregPanel);
    root.appendChild(panels);
  }

  render();
  return { rerender: render };
}
