import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkDump } from '../scripts/qa-a11y-check.mjs';

// QA evidence test for issue #6 (accessibility + device layouts), AC2/AC3.
// Asserts the simulator accessibility dumps captured in
// docs/super-board/runs/issue-6-qa-v1/a11y/ — screen-reader semantics,
// touch-target sizes, and geometry — independently of screenshots.
// The dumps were captured with `idb ui describe-all` on an iOS 27 Simulator
// development build of this branch (iPhone 17 402x874, iPhone 17e 390x844).

const DIR = 'docs/super-board/runs/issue-6-qa-v1/a11y';
const load = (name) => JSON.parse(readFileSync(`${DIR}/${name}.json`, 'utf8'));

const selected = (element) => (element.traits ?? []).includes('Selected');
const byLabel = (elements, label, type) =>
  elements.filter((e) => e.AXLabel === label && (type ? e.type === type : true));
const dumpNames = [
  '01-today-en', '02-settings-from-today', '03-progress-tab-en',
  '04-settings-from-progress', '05-language-en', '06-language-vi-selected',
  '07-settings-vi', '08-progress-vi', '09-today-vi', '10-today-vi-ax5',
  '11-progress-vi-ax5', '12-settings-vi-ax5', '13-today-vi-narrow-17e',
  '14-progress-vi-narrow-17e', '15-settings-vi-ax5-narrow-17e',
  '16-manual-entry-alert-vi', '17-clear-data-alert-vi',
];

test('every captured dump passes the geometric a11y checks (43pt floor)', () => {
  for (const name of dumpNames) {
    const result = checkDump(load(name), { minTarget: 43 });
    assert.deepEqual(result.failures, [], `${name}: ${result.failures.join('; ')}`);
  }
});

// Known defect, tracked in the touch-target bug filed from this QA run:
// the header action button has no minWidth (App.tsx:322), so its rendered
// width is content-driven — 43.33pt with short labels, under the 44pt HIG
// minimum, in dumps 01/03/08/09/13/14. When the fix lands (minWidth: 44),
// raise the floor in the test above to 44 and delete this pin.
test('the only sub-44pt touch target is the header action (known defect pin)', () => {
  for (const name of dumpNames) {
    for (const button of load(name).filter((e) => e.type === 'Button' && e.frame)) {
      const tooSmall = button.frame.width < 44 || button.frame.height < 44;
      const isHeaderAction = ['Open Settings', 'Mở Cài đặt'].includes(button.AXLabel);
      // The header action is sub-44 only at default/medium text sizes; Dynamic
      // Type scales it past the minimum at larger sizes. Every other control
      // must clear 44pt everywhere.
      assert.ok(
        !tooSmall || isHeaderAction,
        `${name}: unexpected sub-44pt target "${button.AXLabel}" ${button.frame.width.toFixed(1)}x${button.frame.height.toFixed(1)}`);
    }
  }
});

test('Today (en): ring group hides the center, carries the truthful placeholder label', () => {
  const d = load('01-today-en');
  assert.ok(byLabel(d, 'Open Settings', 'Button').length === 1);
  assert.ok(byLabel(d, 'Today', 'GenericElement').some(selected));
  assert.ok(!byLabel(d, 'Progress', 'GenericElement').some(selected));
  // The '—' count and 'steps' unit are decorative (accessible={false}) and
  // must not appear as their own screen-reader elements.
  assert.equal(byLabel(d, '—').length, 0);
  assert.equal(byLabel(d, 'steps', 'StaticText').length, 0);
  const ring = d.find((e) => e.type === 'GenericElement' && e.frame?.width === 190);
  assert.match(ring.AXLabel, /will appear when step data is connected/);
  assert.match(ring.AXLabel, /Daily goal: 8,000 steps\./);
});

test('Settings opens with origin-aware back labels and full row sentences', () => {
  const fromToday = load('02-settings-from-today');
  assert.equal(byLabel(fromToday, 'Back to Today', 'Button').length, 1);
  for (const row of ['Daily step goal.', 'Language.', 'Health access.', 'Clear app data.']) {
    assert.ok(fromToday.some((e) => e.type === 'Button' && e.AXLabel?.startsWith(row)), row);
  }
  const fromProgress = load('04-settings-from-progress');
  assert.equal(byLabel(fromProgress, 'Back to Progress', 'Button').length, 1);
});

test('Progress (en): seven date rows, each with a sibling manual-entry button', () => {
  const d = load('03-progress-tab-en');
  assert.ok(byLabel(d, 'Progress', 'GenericElement').some(selected));
  assert.ok(!byLabel(d, 'Today', 'GenericElement').some(selected));
  const rows = d.filter((e) => e.type === 'GenericElement' && /\. Your step total will appear/.test(e.AXLabel ?? ''));
  assert.equal(rows.length, 7);
  const buttons = d.filter((e) => e.type === 'Button' && e.AXLabel?.startsWith('Add manual total — '));
  assert.equal(buttons.length, 7);
  // Row labels normalize to single periods (the Progress slot normalizer).
  for (const row of rows) assert.doesNotMatch(row.AXLabel, /\.\./);
});

test('Language: radio rows flip the Selected trait when Vietnamese is chosen', () => {
  const before = load('05-language-en');
  assert.ok(byLabel(before, 'English', 'GenericElement').some(selected));
  assert.ok(!byLabel(before, 'Tiếng Việt', 'GenericElement').some(selected));
  const after = load('06-language-vi-selected');
  assert.ok(byLabel(after, 'Tiếng Việt', 'GenericElement').some(selected));
  assert.ok(!byLabel(after, 'English', 'GenericElement').some(selected));
  assert.match(after.find((e) => e.type === 'StaticText' && e.AXLabel === 'Ngôn ngữ').AXLabel, /Ngôn ngữ/);
});

test('Vietnamese strings render across screens (vi is the longer locale)', () => {
  for (const [name, label] of [
    ['07-settings-vi', 'Quay lại Tiến độ'],
    ['08-progress-vi', 'Thêm tổng thủ công — Hôm nay'],
    ['09-today-vi', 'Mở Cài đặt'],
  ]) {
    const d = load(name);
    assert.ok(d.some((e) => e.AXLabel === label), `${name}: ${label}`);
  }
  const ring = load('09-today-vi').find((e) => e.type === 'GenericElement' && e.frame?.width === 190);
  assert.match(ring.AXLabel, /Mục tiêu hằng ngày: 8\.000 bước\./);
  const rows = load('08-progress-vi').filter((e) => e.type === 'GenericElement' && /bước/.test(e.AXLabel ?? '') && e.frame?.width > 300);
  assert.equal(rows.length, 7);
});

test('largest text size (AX5) keeps buttons and geometry inside bounds', () => {
  for (const name of ['10-today-vi-ax5', '11-progress-vi-ax5', '12-settings-vi-ax5']) {
    const result = checkDump(load(name), { minTarget: 43 });
    assert.deepEqual(result.failures, [], name);
    const { stats } = result;
    assert.ok(Number(stats.screen.split('x')[0]) >= 390, name);
  }
});

test('narrow device (iPhone 17e, 390pt) renders the same accessible structure', () => {
  const today = load('13-today-vi-narrow-17e');
  assert.equal(today.find((e) => e.type === 'Application').frame.width, 390);
  assert.ok(today.find((e) => e.type === 'GenericElement' && e.frame?.width === 190 && /bước/.test(e.AXLabel ?? '')));
  const progress = load('14-progress-vi-narrow-17e');
  assert.equal(progress.filter((e) => e.type === 'Button' && e.AXLabel?.startsWith('Thêm tổng thủ công')).length, 7);
  const settings = load('15-settings-vi-ax5-narrow-17e');
  assert.ok(settings.some((e) => e.type === 'Button' && e.AXLabel?.startsWith('Mục tiêu bước chân.')));
});

test('preview alerts say nothing is saved or deleted (AC4 placeholder honesty)', () => {
  const manual = load('16-manual-entry-alert-vi');
  assert.ok(manual.some((e) => /Chưa có gì được lưu/.test(e.AXLabel ?? '')));
  assert.equal(byLabel(manual, 'Đã hiểu', 'Button').length, 1);
  const clear = load('17-clear-data-alert-vi');
  assert.ok(clear.some((e) => /không bị xóa|sẽ không bị xóa/.test(e.AXLabel ?? '')));
  assert.equal(byLabel(clear, 'Hủy', 'Button').length, 1);
  assert.equal(byLabel(clear, 'Đã hiểu', 'Button').length, 1);
});
