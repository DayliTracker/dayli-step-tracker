import assert from 'node:assert/strict';
import test from 'node:test';
import { getCopy } from '../src/localization.ts';
import {
  DEFAULT_GOAL, clampRatio, formatRatio, litSegments, progressRatio, todayA11yLabel,
} from '../src/today.ts';

// QA test-gap pass for issue #4 — edges the builder suite did not pin.
// Red-first verified: dropping the Number.isFinite guard in clampRatio turns
// the first test red; changing goalReached >= to > turns the last test red.

test('QA: non-finite and negative step inputs clamp to a dark ring, never NaN segments', () => {
  assert.equal(clampRatio(NaN), 0);
  assert.equal(clampRatio(-Infinity), 0);
  assert.equal(clampRatio(Infinity), 0, 'every non-finite ratio clamps to 0 per src/today.ts:20');
  assert.equal(progressRatio(-100, DEFAULT_GOAL), 0);
  assert.equal(litSegments(NaN, DEFAULT_GOAL), 0);
  assert.equal(litSegments(-100, DEFAULT_GOAL), 0);
});

test('QA: ring stays one segment short immediately before the goal and fills exactly at it', () => {
  assert.equal(litSegments(7999, DEFAULT_GOAL), 47);
  assert.equal(litSegments(8000, DEFAULT_GOAL), 48);
});

test('QA: exactly-at-goal ratio renders the integer 1× path in both locales', () => {
  assert.equal(formatRatio(progressRatio(8000, DEFAULT_GOAL), 'en'), '1×');
  assert.equal(formatRatio(progressRatio(8000, DEFAULT_GOAL), 'vi'), '1×');
});

test('QA: Vietnamese goal-reached assistive label names the cheer and the source', () => {
  const vi = todayA11yLabel(
    { kind: 'loaded', steps: 8000, source: 'health' }, DEFAULT_GOAL, 'vi', getCopy('vi'),
  );
  assert.match(vi, /8\.000 bước/);
  assert.match(vi, /Hoàn thành mục tiêu!/);
  assert.match(vi, /Sức khỏe/);
});
