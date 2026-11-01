import assert from 'node:assert/strict';
import test from 'node:test';
import { getCopy } from '../src/localization.ts';
import { DEFAULT_GOAL, RING_SEGMENTS, goalReached, litSegments, todayA11yLabel } from '../src/today.ts';
import { goalForDate, parseGoalInput } from '../src/goals.ts';

// QA test-gap pass for issue #17 — edges the builder suite did not pin.
// Red-first verified (mutations run and reverted, never committed):
//   goalReached `>=` → `>` turns the at-custom-goal assertions red;
//   dropping parseGoalInput's `.trim()` turns the trailing-newline assertions red;
//   `value >= MIN_GOAL` → `value >= 0` in isValidGoal turns the 0-padded witnesses red;
//   the Today a11y goal line pinned to DEFAULT_GOAL turns the custom-goal label test red.

test('QA: ring fill and goal-reached follow a custom goal, not the 8,000 default', () => {
  const goal = 4000;
  assert.equal(litSegments(0, goal), 0);
  assert.equal(litSegments(1000, goal), RING_SEGMENTS / 4);
  assert.equal(litSegments(3999, goal), RING_SEGMENTS - 1,
    'one segment short immediately before the custom goal');
  assert.equal(litSegments(4000, goal), RING_SEGMENTS,
    'the ring fills exactly at the custom goal');
  assert.equal(litSegments(8000, goal), RING_SEGMENTS, 'the ring caps at the custom goal');
  assert.equal(goalReached({ kind: 'loaded', steps: 3999, source: 'health' }, goal), false);
  assert.equal(goalReached({ kind: 'loaded', steps: 4000, source: 'health' }, goal), true,
    'exact steps at the custom goal are goal-reached');
  assert.equal(goalReached({ kind: 'loaded', steps: 4001, source: 'manual' }, goal), true);
  assert.equal(goalReached({ kind: 'unavailable' }, goal), false,
    'a snapshot without data is never goal-reached');
  assert.equal(goalReached({ kind: 'loaded', steps: 4000, source: 'health' }, DEFAULT_GOAL), false,
    'the same steps do not reach the default — the saved goal decides, not the constant');
});

test('QA: the Today screen-reader goal line announces the custom goal in both locales', () => {
  const en = todayA11yLabel({ kind: 'unavailable' }, 4000, 'en', getCopy('en'));
  assert.match(en, /4,000/, 'en label carries the custom goal');
  assert.doesNotMatch(en, /8,000/, 'the 8,000 default must not leak into a custom-goal label');
  const vi = todayA11yLabel({ kind: 'unavailable' }, 4000, 'vi', getCopy('vi'));
  assert.match(vi, /4\.000/, 'vi label carries the custom goal with its own grouping');
});

test('QA: input edges — zero-padded zero, non-ASCII digits, spaced groups, trailing newline', () => {
  assert.deepEqual(parseGoalInput('00'), { kind: 'error', reason: 'out-of-range' });
  assert.deepEqual(parseGoalInput('000000'), { kind: 'error', reason: 'out-of-range' });
  assert.deepEqual(parseGoalInput('١٢٣'), { kind: 'error', reason: 'malformed' },
    'non-ASCII digits are malformed — Number() would silently accept them if the digit guard widened');
  assert.deepEqual(parseGoalInput('8 000'), { kind: 'error', reason: 'malformed' });
  assert.deepEqual(parseGoalInput('8000\n'), { kind: 'ok', value: 8000 },
    'trailing whitespace is trimmed, not rejected');
  assert.deepEqual(parseGoalInput('1\n'), { kind: 'ok', value: 1 });
});

test('QA: carry-forward reads the latest earlier change, never an older or a later one', () => {
  const history = { goals: { '2026-10-28': 7000, '2026-10-30': 9000 } };
  assert.equal(goalForDate(history, '2026-10-27'), DEFAULT_GOAL, 'before every change → default');
  assert.equal(goalForDate(history, '2026-10-28'), 7000, 'a date keeps its own entry');
  assert.equal(goalForDate(history, '2026-10-29'), 7000, 'carries the latest earlier change');
  assert.equal(goalForDate(history, '2026-10-31'), 9000, 'passes over the older 10-28 entry');
  assert.equal(goalForDate(history, '2026-11-05'), 9000, 'carries forward indefinitely');
});
