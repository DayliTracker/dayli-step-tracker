import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  DEFAULT_MANUAL_TOTALS, MANUAL_TOTALS_KEY, MAX_MANUAL_TOTAL, MIN_MANUAL_TOTAL,
  isInSevenDateWindow, isValidManualTotal, loadManualTotals, manualTotalForDate,
  parseManualTotalInput, removeManualTotal, saveManualTotals, setManualTotal,
} from '../src/manual-totals.ts';
import { clearLocalData, LOCAL_DATA_KEYS } from '../src/clear-data.ts';
import { PREFERENCES_KEY, loadPreferences } from '../src/preferences.ts';
import { GOALS_KEY, loadGoalHistory } from '../src/goals.ts';
import { DEFAULT_GOAL } from '../src/today.ts';
import { localDateKey, lastSevenLocalDates } from '../src/progress.ts';
import { createNavigationState, navigate } from '../src/navigation.ts';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

// In-memory backend standing in for AsyncStorage. `store` is exposed so
// round-trip and clear-data tests can assert the exact stored keys.
const memoryBackend = (initial = {}) => {
  const store = new Map(Object.entries(initial));
  return {
    store,
    async getItem(key) { return store.has(key) ? store.get(key) : null; },
    async setItem(key, value) { store.set(key, value); },
    async removeItem(key) { store.delete(key); },
  };
};

// Every call rejects — the simulated persistence failure for the error path.
const failingBackend = () => ({
  async getItem() { throw new Error('disk unavailable'); },
  async setItem() { throw new Error('disk unavailable'); },
  async removeItem() { throw new Error('disk unavailable'); },
});

// A backend whose removals fail but whose reads still work: the partial
// clear-data failure path.
const failingRemoveBackend = (initial = {}) => {
  const inner = memoryBackend(initial);
  return {
    store: inner.store,
    async getItem(key) { return inner.getItem(key); },
    async setItem(key, value) { return inner.setItem(key, value); },
    async removeItem() { throw new Error('disk unavailable'); },
  };
};

// A fixed "now": 2026-11-01 local noon. The seven window dates are 11-01 back
// to 10-26; 10-25 is outside, as is any future date.
const NOW = new Date(2026, 10, 1, 12, 0, 0);
const WINDOW_KEYS = [
  '2026-11-01', '2026-10-31', '2026-10-30', '2026-10-29', '2026-10-28', '2026-10-27', '2026-10-26',
];

test('manual total bounds: 0 and 100,000 are valid; 100,001 and fractions are not', () => {
  assert.equal(MIN_MANUAL_TOTAL, 0);
  assert.equal(MAX_MANUAL_TOTAL, 100000);
  assert.ok(isValidManualTotal(0), 'a rest day records a genuine zero');
  assert.ok(isValidManualTotal(1));
  assert.ok(isValidManualTotal(100000));
  assert.ok(!isValidManualTotal(100001));
  assert.ok(!isValidManualTotal(8000.5));
  assert.ok(!isValidManualTotal(-1));
  assert.ok(!isValidManualTotal('8000'));
  assert.ok(!isValidManualTotal(NaN));
});

test('text validation accepts 0 and rejects blank, fractional, and malformed input', () => {
  assert.deepEqual(parseManualTotalInput('0'), { kind: 'ok', value: 0 });
  assert.deepEqual(parseManualTotalInput('12300'), { kind: 'ok', value: 12300 });
  assert.deepEqual(parseManualTotalInput(' 4800 '), { kind: 'ok', value: 4800 });
  for (const [raw, reason] of [
    ['100001', 'out-of-range'],
    ['-1', 'malformed'],
    ['8000.5', 'malformed'],
    ['8,000', 'malformed'],
    ['1e4', 'malformed'],
    ['', 'blank'],
    ['   ', 'blank'],
    [null, 'blank'],
    [undefined, 'blank'],
    ['steps', 'malformed'],
  ]) {
    const result = parseManualTotalInput(raw);
    assert.equal(result.kind, 'error', `expected error for input: ${String(raw)}`);
    assert.equal(result.reason, reason, `reason for input: ${String(raw)}`);
  }
});

test('the seven-date window is exactly the dates Progress shows', () => {
  const dates = lastSevenLocalDates(NOW);
  assert.deepEqual(dates.map(localDateKey), WINDOW_KEYS);
  for (const key of WINDOW_KEYS) {
    assert.ok(isInSevenDateWindow(key, NOW), `${key} is inside the window`);
  }
  assert.ok(!isInSevenDateWindow('2026-10-25', NOW), 'eight days back is outside');
  assert.ok(!isInSevenDateWindow('2026-11-02', NOW), 'a future date is outside');
  assert.ok(!isInSevenDateWindow('20261101', NOW), 'a non-key is outside');
});

test('a manual total can be created, edited, and removed on each of the seven dates', () => {
  let record = DEFAULT_MANUAL_TOTALS;
  for (const [index, key] of WINDOW_KEYS.entries()) {
    record = setManualTotal(record, key, 1000 + index, NOW);
    assert.equal(manualTotalForDate(record, key), 1000 + index, `created on ${key}`);
    record = setManualTotal(record, key, 2000 + index, NOW);
    assert.equal(manualTotalForDate(record, key), 2000 + index, `edited on ${key}`);
    record = removeManualTotal(record, key);
    assert.equal(manualTotalForDate(record, key), null, `removed on ${key}`);
  }
  assert.deepEqual(record, DEFAULT_MANUAL_TOTALS, 'no residue after removing all seven');
});

test('writing a date that already has a total replaces it — never more than one per date, never summed', () => {
  let record = setManualTotal(DEFAULT_MANUAL_TOTALS, '2026-11-01', 5000, NOW);
  record = setManualTotal(record, '2026-11-01', 7500, NOW);
  assert.equal(record.totals['2026-11-01'], 7500, 'the new total replaces the old one');
  assert.equal(Object.keys(record.totals).length, 1, 'exactly one total for the date');
  assert.equal(
    record.totals['2026-11-01'], 7500, 'not 5000 + 7500 — the sources never add',
  );
});

test('an invalid value or an out-of-window date never changes the record', () => {
  const record = setManualTotal(DEFAULT_MANUAL_TOTALS, '2026-11-01', 5000, NOW);
  for (const bad of [-1, 100001, 8000.5]) {
    assert.equal(setManualTotal(record, '2026-10-31', bad, NOW), record,
      `value ${bad} is refused`);
  }
  assert.equal(setManualTotal(record, '2026-10-25', 9000, NOW), record,
    'a date outside the window is refused');
  assert.equal(setManualTotal(record, '2026-11-02', 9000, NOW), record,
    'a future date is refused');
  assert.equal(removeManualTotal(record, '2026-10-25'), record,
    'removing an absent date leaves the record alone');
});

test('removing one date leaves the other dates untouched', () => {
  let record = setManualTotal(DEFAULT_MANUAL_TOTALS, '2026-11-01', 5000, NOW);
  record = setManualTotal(record, '2026-10-31', 6000, NOW);
  record = removeManualTotal(record, '2026-11-01');
  assert.equal(manualTotalForDate(record, '2026-11-01'), null);
  assert.equal(manualTotalForDate(record, '2026-10-31'), 6000, 'the neighbor survives');
});

test('a saved manual total survives a restart (save, then read back)', async () => {
  const backend = memoryBackend();
  const record = setManualTotal(DEFAULT_MANUAL_TOTALS, '2026-11-01', 7500, NOW);
  const saved = await saveManualTotals(backend, record);
  assert.deepEqual(saved, { kind: 'ok', value: record });
  assert.equal(JSON.parse(backend.store.get(MANUAL_TOTALS_KEY)).totals['2026-11-01'], 7500);
  const reloaded = await loadManualTotals(backend);
  assert.deepEqual(reloaded, { kind: 'ok', value: record });
  if (reloaded.kind === 'ok') {
    assert.equal(manualTotalForDate(reloaded.value, '2026-11-01'), 7500);
  }
});

test('a device with no stored manual totals reads the defaults', async () => {
  const result = await loadManualTotals(memoryBackend());
  assert.deepEqual(result, { kind: 'ok', value: DEFAULT_MANUAL_TOTALS });
});

test('a read or write failure is an error result, never success-shaped', async () => {
  const read = await loadManualTotals(failingBackend());
  assert.equal(read.kind, 'error');
  assert.match(read.reason, /read failed/);
  const write = await saveManualTotals(failingBackend(), DEFAULT_MANUAL_TOTALS);
  assert.equal(write.kind, 'error');
  assert.match(write.reason, /write failed/);
});

test('malformed or unrecognized stored payloads are errors, never silent resets', async () => {
  for (const raw of [
    'not json at all',
    '{"totals":"nope"}',
    '{"totals":[]}',
    '{}',
    '[{"totals":{}}]',
    '{"totals":{"2026-11-01":-1}}',
    '{"totals":{"2026-11-01":100001}}',
    '{"totals":{"2026-11-01":8000.5}}',
    '{"totals":{"1-11-2026":9000}}',
    '{"totals":{"20261101":9000}}',
    '',
  ]) {
    const result = await loadManualTotals(memoryBackend({ [MANUAL_TOTALS_KEY]: raw }));
    assert.equal(result.kind, 'error', `expected error for payload: ${raw}`);
  }
});

test('LOCAL_DATA_KEYS is exactly the three stored documents', () => {
  assert.deepEqual(LOCAL_DATA_KEYS, [PREFERENCES_KEY, GOALS_KEY, MANUAL_TOTALS_KEY]);
});

test('confirmed clear-data removes exactly the local documents and nothing else', async () => {
  const backend = memoryBackend({
    [PREFERENCES_KEY]: '{"languageOverride":"vi"}',
    [GOALS_KEY]: '{"goals":{"2026-11-01":9000}}',
    [MANUAL_TOTALS_KEY]: '{"totals":{"2026-11-01":7500}}',
    'some.other.key': 'untouched',
  });
  const result = await clearLocalData(backend);
  assert.deepEqual(result, { kind: 'ok', value: undefined });
  for (const key of LOCAL_DATA_KEYS) {
    assert.equal(backend.store.has(key), false, `${key} is gone`);
  }
  assert.equal(backend.store.get('some.other.key'), 'untouched',
    'clear-data removes exactly the local documents');
});

test('after clear-data the next launch reads the 8,000 default goal and device-derived language', async () => {
  const backend = memoryBackend({
    [PREFERENCES_KEY]: '{"languageOverride":"vi"}',
    [GOALS_KEY]: '{"goals":{"2026-11-01":9000}}',
    [MANUAL_TOTALS_KEY]: '{"totals":{"2026-11-01":7500}}',
  });
  assert.deepEqual(await clearLocalData(backend), { kind: 'ok', value: undefined });
  const prefs = await loadPreferences(backend);
  assert.deepEqual(prefs, { kind: 'ok', value: { languageOverride: null } },
    'no override → the device decides the language');
  const goals = await loadGoalHistory(backend);
  assert.deepEqual(goals, { kind: 'ok', value: { goals: {} } });
  const manual = await loadManualTotals(backend);
  assert.deepEqual(manual, { kind: 'ok', value: DEFAULT_MANUAL_TOTALS });
  if (goals.kind === 'ok') {
    // No goal changes anywhere → the product default applies to every date.
    assert.equal(goals.value.goals['2026-11-01'], undefined);
    assert.equal(DEFAULT_GOAL, 8000);
  }
});

test('a clear-data removal failure is an error naming the keys, not a fake reset', async () => {
  const backend = failingRemoveBackend({
    [PREFERENCES_KEY]: '{"languageOverride":"vi"}',
    'some.other.key': 'untouched',
  });
  const result = await clearLocalData(backend);
  assert.equal(result.kind, 'error');
  assert.match(result.reason, /clear failed for/);
  assert.match(result.reason, new RegExp(PREFERENCES_KEY));
  assert.equal(backend.store.get('some.other.key'), 'untouched');
});

test('the shell wires manual totals, Today, and the real clear-data flow', () => {
  // Launch loads the manual record next to preferences and goal history.
  assert.match(appSource, /loadManualTotals\(AsyncStorage\)/);
  assert.match(appSource, /totals: null, error: manualResult\.reason/);
  // Today derives its snapshot from the local data owner — the hardcoded
  // unavailable snapshot is gone.
  assert.doesNotMatch(appSource, /useState<TodaySnapshot>\(\{ kind: 'unavailable' \}\)/);
  assert.match(appSource, /manualTotalForDate\(manual\.totals, todayKey\)/);
  assert.match(appSource, /\{ kind: 'loaded', steps: total, source: 'manual' \}/);
  // Manual saves refuse without a loaded base, and the store window guards them.
  assert.match(appSource, /if \(manual\.kind !== 'ready' \|\| manual\.totals === null\) return;/);
  assert.match(appSource, /parseManualTotalInput\(text\)/);
  assert.match(appSource, /setManualTotal\(manual\.totals, dateKey, value, new Date\(\)\)/);
  // Clear-data is real: the confirmation removes the documents behind an
  // explicit destructive confirm, and a failure surfaces on Settings.
  assert.match(appSource, /clearLocalData\(AsyncStorage\)/);
  assert.match(appSource, /\{ text: copy\.clearConfirm, style: 'destructive', onPress: applyClearData \}/);
  assert.match(appSource, /clearError=\{clearError\}/);
  // The uninstall/device-replacement disclosure stays visible in Settings.
  assert.match(appSource, /<Text style=\{s\.disclosure\}>\{copy\.dataDisclosure\}<\/Text>/);
});

test('navigation reaches the manual editor from a Progress row and back', () => {
  const initial = createNavigationState();
  const progress = navigate(initial, { type: 'select-tab', tab: 'progress' });
  const manual = navigate(progress, { type: 'open-manual', dateKey: '2026-10-31' });
  assert.equal(manual.screen, 'manual');
  assert.equal(manual.manualDate, '2026-10-31');
  assert.equal(manual.settingsOrigin, 'progress', 'back returns to the tab that opened it');
  assert.equal(navigate(manual, { type: 'back' }).screen, 'progress');
  // The editor cannot be opened from Settings or its destinations.
  const settings = navigate(progress, { type: 'open-settings' });
  assert.equal(
    navigate(settings, { type: 'open-manual', dateKey: '2026-10-31' }), settings);
  const goal = navigate(settings, { type: 'open-destination', destination: 'goal' });
  assert.equal(navigate(goal, { type: 'open-manual', dateKey: '2026-10-31' }), goal);
});
