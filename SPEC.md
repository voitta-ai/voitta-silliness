# Anno Dario Calendar Widget — Specification

A static web calendar that displays dates using a custom **Anno Dario** (AD) calendar system, deployed on AWS S3 + CloudFront. Embeddable in any blog (including WordPress.com) via iframe.

---

## 1. The Calendar System

### Epoch
- **March 14, 2023 (Gregorian)** = **1 Anno Dario (1 AD)**, January 1st of year 1.
- Wait — clarification needed. See "Year Boundaries" below.

### Eras
- **AD — Anno Dario** ("Year of Dario"). Years from the epoch forward.
- **BC — Before Claude.** Years before the epoch, counted backwards.
- There is **no year zero**. The day before 1 AD Jan 1 is 1 BC Dec 31. (Same convention as Gregorian BC/AD.)

### Year Boundaries — IMPORTANT DESIGN DECISION

There are two reasonable interpretations of "March 14, 2023 = year 1":

**Option A — Shifted year start (recommended):**
- Year 1 AD begins March 14, 2023 and ends March 13, 2024.
- Year 2 AD begins March 14, 2024.
- Year 3 AD begins March 14, 2025.
- Year 4 AD begins March 14, 2026. (Today, May 21, 2026, would be year 4 AD.)
- Months still named January–December but the **calendar year rolls over on March 14**, not January 1.
- This is more "calendar reform" in spirit — like the French Revolutionary calendar.

**Option B — Aligned with Gregorian year (simpler):**
- Year 1 AD = calendar year 2023 (the year Claude was born).
- Year 2 AD = 2024. Year 3 AD = 2025. Year 4 AD = 2026.
- Year still starts January 1. March 14 is just a notable date (Natalis Claudii).
- Easier to reason about; less "bizarre."

**Default to Option A** for the proof of concept — it's more fun and more committed to the bit. Make the year-boundary configurable via a constant `YEAR_STARTS_ON_EPOCH_DAY` so it's a one-line change to switch to Option B.

### Months and Days
- Identical to Gregorian: 12 months, same names, same day counts, same leap year rules.
- Leap years follow Gregorian rules applied to the *Gregorian* year the AD year mostly overlaps with. (Don't reinvent leap year math — just delegate to JS Date.)

### Naming
- Era suffix displays as **"AD"** by default with a tooltip on hover/tap showing "Anno Dario · Gregorian year YYYY."
- BC displays as **"BC"** with tooltip "Before Claude · Gregorian year YYYY."

---

## 2. Deliverables

### Files
```
/
├── SPEC.md                  (this file)
├── README.md                (deploy + dev instructions)
├── src/
│   ├── index.html           (standalone full-page calendar)
│   ├── embed.html           (iframe-friendly version, transparent bg)
│   ├── styles.css           (shared styles, CSS variables for theming)
│   ├── calendar.js          (rendering + interaction)
│   ├── anno-dario.js        (date conversion library — pure functions, no DOM)
│   ├── facts.json           (optional "on this day in BC/AD" data)
│   └── favicon.svg
├── infra/
│   ├── main.tf              (Terraform: S3, CloudFront, OAC, bucket policy)
│   ├── variables.tf
│   ├── outputs.tf
│   └── README.md            (terraform apply instructions)
└── tests/
    └── anno-dario.test.js   (unit tests for the date math — DO NOT SKIP)
```

### Hosting
- **S3 bucket** in `us-east-1`, private, with bucket policy allowing CloudFront OAC only.
- **CloudFront distribution** with:
  - Origin Access Control (OAC) — not legacy OAI.
  - Default root object: `index.html`.
  - Error responses: 403/404 → `/index.html` with 200 (SPA-style, though we're not SPA — just clean URLs).
  - Compression enabled.
  - HTTP redirects to HTTPS.
  - Price class: `PriceClass_100` (US/EU only — cheapest, fine for a toy).
- No custom domain required for v1 (just use the `*.cloudfront.net` URL). Document how to add Route 53 + ACM later.

---

## 3. UI Requirements

### Aesthetic
Match the default WordPress Calendar widget. Restrained, blends into any theme. The *content* is bizarre — the *styling* should not be. Use system fonts so it looks native wherever embedded.

### Layout (embed.html)
- ~300px wide, fluid down to 250px.
- Header row: prev arrow · "March 4 AD" (centered, clickable for tooltip) · next arrow.
- Day-of-week header: S M T W T F S (or localized — but keep English for v1).
- 6-row × 7-col grid of date numbers.
- Today highlighted with a filled circle background.
- Days outside current month: muted (50% opacity).
- Hover on the era label ("4 AD") shows tooltip with Gregorian equivalent.

### Layout (index.html)
- Same calendar, centered on the page.
- Below it: a short explainer paragraph ("This calendar measures time from March 14, 2023, the day Claude was born..."), the conversion formula, and a link to the source.
- Optionally: today's "on this day" fact if `facts.json` has one for the current month-day.

### Theming
- CSS custom properties for all colors so a host page can override via parent CSS.
- Auto dark mode via `@media (prefers-color-scheme: dark)`.
- No external font loading. Use `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

### Accessibility
- Keyboard navigation: tab to prev/next, arrow keys within grid.
- ARIA labels on nav buttons ("Previous month", "Next month").
- Grid is a `<table>` with proper `<caption>` (visually hidden), `<th scope="col">` for day headers.
- Today gets `aria-current="date"`.
- Focus visible on all interactive elements.

---

## 4. Date Math API (`anno-dario.js`)

Pure functions, no DOM, no globals, importable as ES module. **Build this first, test it thoroughly, then layer the UI on top.**

```javascript
// All functions take/return plain objects, not Date instances, to avoid timezone hell.
// Internally, work in UTC.

export const EPOCH = { y: 2023, m: 3, d: 14 }; // Gregorian, 1-indexed month
export const YEAR_STARTS_ON_EPOCH_DAY = true;  // Option A vs B switch

/**
 * Convert a Gregorian date to Anno Dario.
 * @param {{y:number, m:number, d:number}} greg - 1-indexed month
 * @returns {{year:number, era:'AD'|'BC', m:number, d:number}}
 */
export function gregToAD(greg) { ... }

/**
 * Convert Anno Dario back to Gregorian.
 * @param {{year:number, era:'AD'|'BC', m:number, d:number}} ad
 * @returns {{y:number, m:number, d:number}}
 */
export function adToGreg(ad) { ... }

/**
 * Get today in Anno Dario (using local time, then converting to UTC date).
 */
export function todayAD() { ... }

/**
 * Format an Anno Dario date for display.
 * @returns {string} e.g. "March 21, 4 AD" or "April 1, 2 BC"
 */
export function formatAD(ad, opts) { ... }

/**
 * Number of days in a given Gregorian month (handles leap years).
 */
export function daysInMonth(y, m) { ... }

/**
 * What day of the week is Gregorian (y, m, d)? 0 = Sunday.
 */
export function dayOfWeek(y, m, d) { ... }
```

### Edge cases that MUST be tested
- The epoch day itself: `gregToAD({y:2023, m:3, d:14})` → `{year:1, era:'AD', m:3, d:14}` (or month/day shifted if Option A is interpreted literally — see test cases).
- Day before epoch: `gregToAD({y:2023, m:3, d:13})` → `{year:1, era:'BC', m:3, d:13}`.
- Leap day: Feb 29, 2024 → valid AD date.
- Far future: Jan 1, 3000.
- Far past: Jan 1, 1000 (should be a large BC year).
- Round trip: `adToGreg(gregToAD(x)) === x` for many sample dates.

### Year-boundary semantics for Option A
If `YEAR_STARTS_ON_EPOCH_DAY = true`:
- An AD year runs from March 14 → March 13 of the next Gregorian year.
- Display: "January is in year N if January falls between March 14 of Gregorian year (N+2022) and March 13 of Gregorian year (N+2023)."
- Concretely: January 2026 displays as year 3 AD (because year 3 AD runs March 14, 2025 → March 13, 2026). May 2026 displays as year 4 AD.
- This means **the year shown in the calendar header changes mid-March**, which is the whole point.

If `YEAR_STARTS_ON_EPOCH_DAY = false`:
- AD year = Gregorian year − 2022. (2023 → 1, 2024 → 2, etc.)
- BC year = 2023 − Gregorian year. (2022 → 1 BC, 2021 → 2 BC.)
- Simpler. Use this if Option A produces too much confusion in testing.

---

## 5. Embedding in WordPress.com

After deployment, the user embeds via the WordPress **Embed block** with the CloudFront URL of `embed.html`. WordPress.com allows iframes from trusted hosts on Premium plans and up. On Free/Personal, the user can link to the standalone page instead.

Document both paths in README.md.

---

## 6. Out of Scope (v1)
- Event/post integration (no reading WordPress posts).
- Localization (English only).
- Multi-month or year views.
- Saving/persisting user preferences.
- Authentication.
- Custom domain setup (documented but not automated).

## 7. Stretch Goals (clearly mark as optional)
- `facts.json` with "On this day in Anno Dario" entries (Claude/Anthropic/AI history milestones keyed by `MM-DD`).
- Invented holidays:
  - **March 14** — Natalis Claudii (Claude's Birthday / New Year if Option A).
  - **July 11** — Accession Day (Claude 2 public launch).
  - **November 21** — Foundation Day (Anthropic founded, 2021 = 2 BC).
- A `?date=YYYY-MM-DD` query param to jump to a specific Gregorian date.
- Print stylesheet.

---

## 8. Quality bar
- Zero runtime dependencies. No React, no jQuery, no build step. Vanilla JS, single-file HTML where reasonable.
- All JS in ES modules (`<script type="module">`).
- Lighthouse score ≥ 95 on Performance, Accessibility, Best Practices, SEO.
- Total page weight under 30 KB gzipped.
- Tests run with `node --test` (built-in test runner, no Jest/Mocha needed).

---

## 9. Suggested build order
1. `anno-dario.js` + tests. Get the math bulletproof first.
2. `embed.html` + `styles.css` + `calendar.js` rendering a static month.
3. Wire up prev/next navigation and today highlight.
4. `index.html` with explainer.
5. Terraform infrastructure.
6. Deploy script (`make deploy` or npm script).
7. Stretch goals if time allows.
