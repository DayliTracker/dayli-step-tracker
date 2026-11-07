import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getCopy } from '../src/localization.ts';
import {
  formatRowDate, lastSevenLocalDates, localDateKey, progressRowA11yLabel,
} from '../src/progress.ts';
import { DEFAULT_GOAL } from '../src/today.ts';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

test('Progress window is today plus the previous six device-local dates, newest first', () => {
  const dates = lastSevenLocalDates(new Date(2026, 0, 1, 21, 30));
  assert.equal(dates.length, 7);
  assert.deepEqual(
    dates.map(localDateKey),
    ['2026-01-01', '2025-12-31', '2025-12-30', '2025-12-29', '2025-12-28', '2025-12-27', '2025-12-26'],
    'rolls back across the month and year boundaries on local day parts',
  );
  const keys = new Set(dates.map(localDateKey));
  assert.equal(keys.size, 7, 'every row needs a unique React key');
});

test('localDateKey pads month and day and never day-shifts like toISOString', () => {
  assert.equal(localDateKey(new Date(2026, 2, 3)), '2026-03-03');
  assert.equal(localDateKey(new Date(2026, 10, 27)), '2026-11-27');
  const late = new Date(2026, 4, 2, 23, 30);
  assert.equal(localDateKey(late), '2026-05-02');
});

test('row labels carry the day number in both locales and stay non-empty', () => {
  const date = new Date(2026, 0, 15);
  const en = formatRowDate(date, 'en');
  const vi = formatRowDate(date, 'vi');
  assert.match(en, /15/);
  assert.match(vi, /15/);
  assert.ok(en.trim() && vi.trim());
  assert.notEqual(en, vi, 'the active locale decides the row label');
});

test('row a11y label mirrors the three slots and never announces an absent total as a value', () => {
  const en = getCopy('en');
  const unavailable = progressRowA11yLabel(
    'Today', { kind: 'unavailable' }, DEFAULT_GOAL, 'en', en,
  );
  assert.match(unavailable, /^Today\. /);
  assert.match(unavailable, /Daily goal: 8,000 steps/);
  assert.match(unavailable, /No step data for this date yet/);
  assert.match(unavailable, /step total will appear/);
  assert.doesNotMatch(unavailable, /\b0 steps\b/, 'an absent total is never a zero');
  assert.doesNotMatch(unavailable, /\.\./, 'slot copy never doubles the sentence period');
  assert.match(unavailable, /yet\.$/, 'the sentence ends with exactly one period');

  const loaded = { kind: 'loaded', steps: 12300, source: 'health' };
  const health = progressRowA11yLabel('Wed, Oct 28', loaded, DEFAULT_GOAL, 'en', en);
  assert.match(health, /12,300 steps/);
  assert.match(health, /Source: Health\.$/, 'the sentence ends with exactly one period');
  assert.doesNotMatch(health, /\.\./, 'slot copy never doubles the sentence period');

  const vi = getCopy('vi');
  const manual = progressRowA11yLabel(
    'Th 4, 28 thg 10', { kind: 'loaded', steps: 1000, source: 'manual' }, DEFAULT_GOAL, 'vi', vi,
  );
  assert.match(manual, /1\.000 bước/);
  assert.match(manual, /Nguồn: Thủ công/);
  assert.doesNotMatch(manual, /\.\./, 'slot copy never doubles the sentence period');

  const viUnavailable = progressRowA11yLabel(
    'Hôm nay', { kind: 'unavailable' }, DEFAULT_GOAL, 'vi', vi,
  );
  assert.match(viUnavailable, /cho ngày này\.$/, 'the sentence ends with exactly one period');
  assert.doesNotMatch(viUnavailable, /\.\./, 'slot copy never doubles the sentence period');
});

test('a row slot ending in !, ? or … keeps its own terminator and gains no doubled one', () => {
  const en = getCopy('en');
  const bang = progressRowA11yLabel('Today!', { kind: 'unavailable' }, DEFAULT_GOAL, 'en', en);
  assert.match(bang, /^Today! /, 'a slot ending in ! keeps its own terminator');
  assert.doesNotMatch(bang, /!\./, 'no period is appended after a kept !');
  assert.doesNotMatch(bang, /\.\./, 'slot copy never doubles the sentence period');

  const vi = getCopy('vi');
  const dots = progressRowA11yLabel('Hôm nay…', { kind: 'unavailable' }, DEFAULT_GOAL, 'vi', vi);
  assert.match(dots, /^Hôm nay… /, 'a slot ending in … keeps its own terminator');
  assert.doesNotMatch(dots, /…\./, 'no period is appended after a kept …');
  assert.doesNotMatch(dots, /\.\./, 'slot copy never doubles the sentence period');

  const query = progressRowA11yLabel('Thứ 4?', { kind: 'unavailable' }, DEFAULT_GOAL, 'vi', vi);
  assert.match(query, /^Thứ 4\? /, 'a slot ending in ? keeps its own terminator');
  assert.doesNotMatch(query, /\?\./, 'no period is appended after a kept ?');
  assert.doesNotMatch(query, /\.\./, 'slot copy never doubles the sentence period');
});

test('each date row is its own labeled control carrying the full sentence', () => {
  const mapStart = appSource.indexOf('dates.map(');
  assert.ok(mapStart >= 0, 'Progress maps the seven dates');
  const block = appSource.slice(mapStart, appSource.indexOf('function SettingsPage'));
  // The row Pressable is the control (prototype v3's role="button" row): the
  // full screen-reader sentence rides the same element that opens the
  // stepper, so no control can be flattened away by an accessible container.
  const pressable = block.indexOf('<Pressable');
  assert.ok(pressable >= 0, 'the date row is a Pressable');
  // The style prop is a pressed-state function now (prototype .row:active),
  // so the slice runs to the style function's closing braces.
  const row = block.slice(pressable, block.indexOf('}>', pressable));
  assert.match(row, /accessibilityRole="button"/);
  assert.match(row, /accessibilityLabel=\{progressRowA11yLabel\(label, snapshot, rowGoal, locale, copy\)\}/);
  assert.match(row, /onPress=\{\(\) => onOpenStepper\(dateKey\)\}/);
});

test('stepper copy exists in both locales and no preview or removed-editor language remains', () => {
  for (const locale of ['en', 'vi']) {
    const copy = getCopy(locale);
    assert.ok(copy.manualSave.trim());
    assert.ok(copy.manualInputLabel.trim());
    assert.ok(copy.manualStorageError.trim());
    assert.ok(copy.stepperDecrease.trim());
    assert.ok(copy.stepperIncrease.trim());
    assert.ok(copy.miniDuckPoke.trim());
  }
  assert.notEqual(getCopy('en').manualSave, getCopy('vi').manualSave);
  assert.notEqual(getCopy('en').stepperDecrease, getCopy('vi').stepperDecrease);
  // The manual editor page is gone: its page copy went with it.
  for (const key of ['manualTitle', 'manualReplaces', 'manualRemove', 'manualSaved',
    'manualRemoved', 'manualInvalid', 'addManualTotal', 'editManualTotal']) {
    assert.equal(getCopy('en')[key], undefined, `${key} left with the manual editor`);
    assert.equal(getCopy('vi')[key], undefined, `${key} left with the manual editor`);
  }
  // The phase-1 preview strings are gone from every surface.
  assert.ok(!Object.keys(getCopy('en')).some((key) => key.startsWith('manualPreview')));
  assert.ok(!Object.values(getCopy('en')).some((value) => /nothing was saved/i.test(value)));
  assert.ok(!Object.values(getCopy('vi')).some((value) => /chưa có gì được lưu/i.test(value)));
});

test('Progress wires the seven local dates, the stepper affordance, and truthful slots', () => {
  assert.match(appSource, /lastSevenLocalDates\(new Date\(\)\)/);
  assert.match(appSource, /key=\{dateKey\}/);
  assert.match(
    appSource,
    /progressRowA11yLabel\(label, snapshot, rowGoal, locale, copy\)/,
    'each row announces its own snapshot and per-date goal, not a constant',
  );
  // Issue #20: each row derives its snapshot through the single
  // truthful-state rule — manual precedence first, then Health, then the
  // explicit refreshing/failed/no-data states (src/healthkit.ts).
  assert.match(appSource, /resolveDaySnapshot\(/,
    'a row renders through the single truthful-state rule');
  assert.doesNotMatch(appSource, /\{ kind: 'unavailable' \}/,
    'no ad-hoc snapshot literal bypasses the resolver');
  assert.match(appSource, /\? formatNumber\(total, locale\) : '—'/,
    'an absent total renders the em-dash slot, not a number');
  assert.doesNotMatch(appSource, /manualPreview/, 'the preview alert is gone');
  // The draft starts from the saved total, or a truthful 0 for an empty date.
  assert.match(appSource, /manualTotalForDate\(manual\.totals, dateKey\)/);
});

test('rows wrap at narrow widths and the date row keeps a 48-point target', () => {
  const rowTop = appSource.match(/rowTop:\s*\{[^}]*\}/);
  assert.ok(rowTop, 'rowTop style must exist');
  assert.match(rowTop[0], /flexWrap:\s*'wrap'/, 'long bilingual labels wrap instead of clipping');
  const progressRow = appSource.match(/progressRow:\s*\{[^}]*minHeight:\s*(\d+)/);
  assert.ok(progressRow, 'progressRow must declare a touch target');
  assert.ok(Number(progressRow[1]) >= 48, 'progressRow must be at least 48 points high');
  const stepButton = appSource.match(/stepButton:\s*\{[^}]*minHeight:\s*(\d+)/);
  assert.ok(stepButton, 'stepButton must declare a touch target');
  assert.ok(Number(stepButton[1]) >= 48, 'stepButton must be at least 48 points high');
});
