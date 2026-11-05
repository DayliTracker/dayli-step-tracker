import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  DEFAULT_GOAL_HISTORY, GOALS_KEY, MAX_GOAL, MIN_GOAL, goalForDate, isValidGoal,
  loadGoalHistory, parseGoalInput, saveGoalHistory, setGoalForDate,
} from '../src/goals.ts';
import { DEFAULT_GOAL } from '../src/today.ts';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

// In-memory backend standing in for AsyncStorage. `store` is exposed so
// round-trip tests can assert the exact stored payload.
const memoryBackend = (initial = {}) => {
  const store = new Map(Object.entries(initial));
  return {
    store,
    async getItem(key) { return store.has(key) ? store.get(key) : null; },
    async setItem(key, value) { store.set(key, value); },
  };
};

// Every call rejects — the simulated persistence failure for the error path.
const failingBackend = () => ({
  async getItem() { throw new Error('disk unavailable'); },
  async setItem() { throw new Error('disk unavailable'); },
});

const day = (offset) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
};
const key = (date) => {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const dayPart = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${dayPart}`;
};

test('goal bounds: 1 and 100,000 are valid; 0 and 100,001 are not', () => {
  assert.equal(MIN_GOAL, 1);
  assert.equal(MAX_GOAL, 100000);
  assert.ok(isValidGoal(1));
  assert.ok(isValidGoal(100000));
  assert.ok(isValidGoal(8000));
  assert.ok(!isValidGoal(0));
  assert.ok(!isValidGoal(100001));
  assert.ok(!isValidGoal(8000.5));
  assert.ok(!isValidGoal(-1));
  assert.ok(!isValidGoal('8000'));
  assert.ok(!isValidGoal(NaN));
  assert.ok(!isValidGoal(Infinity));
});

test('text validation accepts 1 and 100,000 and the plain digits between', () => {
  assert.deepEqual(parseGoalInput('1'), { kind: 'ok', value: 1 });
  assert.deepEqual(parseGoalInput('100000'), { kind: 'ok', value: 100000 });
  assert.deepEqual(parseGoalInput('8000'), { kind: 'ok', value: 8000 });
  assert.deepEqual(parseGoalInput(' 8000 '), { kind: 'ok', value: 8000 });
  assert.deepEqual(parseGoalInput('008000'), { kind: 'ok', value: 8000 });
});

test('text validation rejects 0, 100,001, fractional, blank, and malformed input', () => {
  for (const [raw, reason] of [
    ['0', 'out-of-range'],
    ['100001', 'out-of-range'],
    ['8000.5', 'malformed'],
    ['12.0', 'malformed'],
    ['', 'blank'],
    ['   ', 'blank'],
    [null, 'blank'],
    [undefined, 'blank'],
    ['8,000', 'malformed'],
    ['-1', 'malformed'],
    ['+8000', 'malformed'],
    ['1e4', 'malformed'],
    ['eight thousand', 'malformed'],
    ['8000 steps', 'malformed'],
    ['9'.repeat(40), 'out-of-range'],
  ]) {
    const result = parseGoalInput(raw);
    assert.equal(result.kind, 'error', `expected error for input: ${String(raw)}`);
    assert.equal(result.reason, reason, `reason for input: ${String(raw)}`);
  }
});

test('an invalid value never changes the saved goal', () => {
  const history = { goals: { '2026-10-30': 9000 } };
  for (const bad of [0, -5, 100001, 8000.5]) {
    const next = setGoalForDate(history, '2026-11-01', bad);
    assert.deepEqual(next, history, `goal must not change for value: ${bad}`);
  }
  assert.deepEqual(setGoalForDate(history, 'not-a-date', 5000), history,
    'a non-date key is refused too');
});

test('recording a goal for today writes today only — a past date is never rewritten', () => {
  const pastKey = '2026-10-30';
  const todayKey = '2026-11-01';
  let history = setGoalForDate(DEFAULT_GOAL_HISTORY, pastKey, 9000);
  history = setGoalForDate(history, todayKey, 12000);
  assert.equal(history.goals[pastKey], 9000, 'the past date keeps its own goal');
  assert.equal(history.goals[todayKey], 12000);
  history = setGoalForDate(history, todayKey, 15000);
  assert.equal(history.goals[pastKey], 9000, 'another change still leaves the past alone');
  assert.equal(history.goals[todayKey], 15000);
});

test('the goal that applies to a date: its own change, else carried forward, else the default', () => {
  const history = { goals: { '2026-10-30': 9000, '2026-11-01': 12000 } };
  assert.equal(goalForDate(history, '2026-11-01'), 12000, 'today uses its own entry');
  assert.equal(goalForDate(history, '2026-10-30'), 9000, 'a past date keeps its own entry');
  assert.equal(goalForDate(history, '2026-10-29'), DEFAULT_GOAL, 'before any change → default');
  assert.equal(goalForDate(history, '2026-10-31'), 9000, 'between changes → the latest earlier change');
  assert.equal(goalForDate(history, '2026-11-02'), 12000, 'after the last change the goal carries forward');
  assert.equal(goalForDate(DEFAULT_GOAL_HISTORY, '2026-11-01'), DEFAULT_GOAL);
});

test('a device with no stored goal history reads the defaults', async () => {
  const backend = memoryBackend();
  const result = await loadGoalHistory(backend);
  assert.deepEqual(result, { kind: 'ok', value: DEFAULT_GOAL_HISTORY });
  assert.deepEqual(DEFAULT_GOAL_HISTORY, { goals: {} });
  assert.equal(goalForDate(DEFAULT_GOAL_HISTORY, '2026-11-01'), DEFAULT_GOAL);
});

test('a saved goal survives a restart (save, then read back)', async () => {
  const backend = memoryBackend();
  const history = setGoalForDate(DEFAULT_GOAL_HISTORY, '2026-11-01', 12000);
  const saved = await saveGoalHistory(backend, history);
  assert.deepEqual(saved, { kind: 'ok', value: history });
  assert.equal(JSON.parse(backend.store.get(GOALS_KEY)).goals['2026-11-01'], 12000);
  const reloaded = await loadGoalHistory(backend);
  assert.deepEqual(reloaded, { kind: 'ok', value: history });
  if (reloaded.kind === 'ok') {
    assert.equal(goalForDate(reloaded.value, '2026-11-01'), 12000);
  }
});

test('a read failure is an error result, not success-shaped defaults', async () => {
  const result = await loadGoalHistory(failingBackend());
  assert.equal(result.kind, 'error');
  assert.match(result.reason, /read failed/);
});

test('a write failure is an error result, not a fake save', async () => {
  const result = await saveGoalHistory(failingBackend(), { goals: { '2026-11-01': 9000 } });
  assert.equal(result.kind, 'error');
  assert.match(result.reason, /write failed/);
});

test('malformed or unrecognized stored payloads are errors, never silent resets', async () => {
  for (const raw of [
    'not json at all',
    '{"goals":"nope"}',
    '{"goals":[]}',
    '{}',
    '[{"goals":{}}]',
    '{"goals":{"2026-11-01":0}}',
    '{"goals":{"2026-11-01":100001}}',
    '{"goals":{"2026-11-01":8000.5}}',
    '{"goals":{"1-11-2026":9000}}',
    '{"goals":{"20261101":9000}}',
    '',
  ]) {
    const result = await loadGoalHistory(memoryBackend({ [GOALS_KEY]: raw }));
    assert.equal(result.kind, 'error', `expected error for payload: ${raw}`);
  }
});

test('the shell wires goal history: load, per-date goals, validate-then-save', () => {
  // Launch loads the goal document next to preferences, through the same
  // storage-error path (history null + surfaced reason, never a fake base).
  assert.match(appSource, /loadGoalHistory\(AsyncStorage\)/);
  assert.match(appSource, /history: null, error: goalsResult\.reason/);
  // Today keys every goal line off the saved value, not the constant.
  assert.match(appSource, /goalForDate\(goalHistory, localDateKey\(new Date\(\)\)\)/);
  assert.doesNotMatch(appSource, /goalReached\(snapshot, DEFAULT_GOAL\)/);
  // Progress renders each date's own goal.
  assert.match(appSource, /goalForDate\(goalHistory, dateKey\)/);
  // The editor validates before applying, and a save refuses without a base.
  assert.match(appSource, /parseGoalInput\(text\)/);
  assert.match(appSource, /if \(result\.kind === 'error'\) \{ setInvalid\(true\); setSavedGoal\(null\); return; \}/);
  assert.match(appSource, /if \(goals\.kind !== 'ready' \|\| goals\.history === null\) return;/);
});
