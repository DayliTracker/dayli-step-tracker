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
  assert.match(unavailable, /Step source is not available/);
  assert.match(unavailable, /step total will appear/);
  assert.doesNotMatch(unavailable, /\b0 steps\b/, 'an absent total is never a zero');
  assert.doesNotMatch(unavailable, /\.\./, 'slot copy never doubles the sentence period');
  assert.match(unavailable, /this shell\.$/, 'the sentence ends with exactly one period');

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
  assert.match(viUnavailable, /phiên bản này\.$/, 'the sentence ends with exactly one period');
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

test('manual-entry button stays outside the row a11y group so VoiceOver can focus it', () => {
  const mapStart = appSource.indexOf('dates.map(');
  assert.ok(mapStart >= 0, 'Progress maps the seven dates');
  const block = appSource.slice(mapStart, appSource.indexOf('function SettingsPage'));
  const labelCall = block.indexOf('accessibilityLabel={progressRowA11yLabel(');
  assert.ok(labelCall >= 0, 'the row a11y group exists');
  const groupOpen = block.lastIndexOf('<View', labelCall);

  // Walk the JSX from the accessible group's opening <View to its matching
  // </View>, then require the manual-entry Pressable to live outside it —
  // an accessible container flattens descendants on iOS, so a button inside
  // it disappears from the VoiceOver tree (review finding R1).
  let depth = 0;
  let close = -1;
  for (const token of block.slice(groupOpen).matchAll(/<\/?View\b/g)) {
    depth += token[0].startsWith('</') ? -1 : 1;
    if (depth === 0) {
      close = groupOpen + token.index + token[0].length;
      break;
    }
  }
  assert.ok(close > 0, 'the accessible group closes inside the row block');
  const group = block.slice(groupOpen, close);
  assert.match(group, /accessibilityLabel=\{progressRowA11yLabel\(/);
  assert.doesNotMatch(group, /<Pressable\b/, 'no control is flattened into the a11y group');

  const button = block.indexOf('<Pressable', close);
  assert.ok(button > 0, 'the manual-entry button follows the group as a sibling');
  assert.match(block.slice(button, button + 240), /accessibilityRole="button"/);
  assert.match(block.slice(button, button + 240), /accessibilityLabel=/);
});

test('manual-entry copy exists, is distinct, and admits nothing was saved', () => {
  for (const locale of ['en', 'vi']) {
    const copy = getCopy(locale);
    assert.ok(copy.addManualTotal.trim());
    assert.ok(copy.manualPreviewTitle.trim());
    assert.match(copy.manualPreviewMessage, locale === 'en' ? /nothing was saved/i : /chưa có gì được lưu/i);
  }
  assert.notEqual(getCopy('en').addManualTotal, getCopy('vi').addManualTotal);
});

test('Progress wires the seven local dates, per-date manual affordance, and truthful slots', () => {
  assert.match(appSource, /lastSevenLocalDates\(new Date\(\)\)/);
  assert.match(appSource, /key=\{localDateKey\(date\)\}/);
  assert.match(
    appSource,
    /progressRowA11yLabel\(\s*label, \{ kind: 'unavailable' \}, DEFAULT_GOAL, locale, copy,?\s*\)/,
  );
  assert.match(
    appSource,
    /accessibilityLabel=\{`\$\{copy\.addManualTotal\} — \$\{label\}`\}/,
    'each date carries its own manual-entry control name',
  );
  assert.match(appSource, /Alert\.alert\(\s*copy\.manualPreviewTitle, copy\.manualPreviewMessage/);
  assert.match(appSource, />— \{copy\.steps\}</, 'an absent total renders the em-dash slot, not a number');
  assert.match(appSource, /\{ kind: 'unavailable' \}/, 'rows pass truthful snapshots, not fabricated data');
});

test('rows wrap at narrow widths and the manual control keeps a 48-point target', () => {
  const rowTop = appSource.match(/rowTop:\s*\{[^}]*\}/);
  assert.ok(rowTop, 'rowTop style must exist');
  assert.match(rowTop[0], /flexWrap:\s*'wrap'/, 'long bilingual labels wrap instead of clipping');
  const manual = appSource.match(/manualAction:\s*\{[^}]*minHeight:\s*(\d+)/);
  assert.ok(manual, 'manualAction must declare a touch target');
  assert.ok(Number(manual[1]) >= 48, 'manualAction must be at least 48 points high');
});
