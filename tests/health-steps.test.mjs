import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  HEALTH_WINDOW_DAYS, IDLE_HEALTH_TOTALS, loadDailyStepTotals, resolveDaySnapshot,
  samplesToLocalTotals, stepWindow,
} from '../src/healthkit.ts';
import { getCopy } from '../src/localization.ts';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const clearDataSource = readFileSync(new URL('../src/clear-data.ts', import.meta.url), 'utf8');
const healthSource = readFileSync(new URL('../src/healthkit.ts', import.meta.url), 'utf8');
const swiftSource =
  readFileSync(new URL('../modules/dayli-health-kit/ios/DayliHealthKitModule.swift', import.meta.url), 'utf8');
const moduleSource = readFileSync(new URL('../modules/dayli-health-kit/index.ts', import.meta.url), 'utf8');

// A fixed local noon so the seven-date window keys are deterministic on any
// host timezone: the window is built from local calendar parts, so the keys
// below are the device-local dates regardless of the machine's UTC offset.
const NOON = new Date(2026, 9, 30, 12, 0, 0); // Oct 30 2026, local noon
const dayKey = (offsetDays) => {
  const date = new Date(NOON.getFullYear(), NOON.getMonth(), NOON.getDate() - offsetDays);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};
// A sample for a local date's 10:00 hour (well inside its day interval).
const sampleFor = (offsetDays, steps) =>
  ({ startMs: new Date(NOON.getFullYear(), NOON.getMonth(), NOON.getDate() - offsetDays, 10).getTime(), steps });

test('the read window covers today and the previous six device-local dates', () => {
  const { fromMs, toMs } = stepWindow(NOON);
  assert.equal(toMs, NOON.getTime(), 'the window reads up to now');
  const from = new Date(fromMs);
  assert.deepEqual(
    [from.getFullYear(), from.getMonth(), from.getDate(), from.getHours(), from.getMinutes()],
    [2026, 9, 24, 0, 0],
    'the window starts at the local midnight of the sixth day before now',
  );
  assert.equal(HEALTH_WINDOW_DAYS, 7);
});

test('samples map to the correct device-local dates and fragment sums stay whole', () => {
  const result = samplesToLocalTotals(
    [sampleFor(0, 1000.4), sampleFor(0, 2000.3), sampleFor(6, 50), sampleFor(3, 0)],
    NOON,
  );
  assert.equal(result.kind, 'ok');
  if (result.kind !== 'ok') return;
  // Two fragments of one day sum to the day's total, rounded to nearest.
  assert.equal(result.totals[dayKey(0)], 3001, '1000.4 + 2000.3 rounds to 3001');
  // A 0-sum interval is a truthful 0, never dropped into "no data".
  assert.equal(result.totals[dayKey(3)], 0);
  assert.equal(result.totals[dayKey(6)], 50);
  assert.equal(Object.keys(result.totals).length, 3);
});

test('a malformed native payload is an error, never a shrunk success', () => {
  const reasons = [];
  for (const bad of [
    'not an array',
    [null],
    [{ startMs: 'x', steps: 10 }],
    [sampleFor(0, Number.NaN)],
    [sampleFor(0, -1)],
    // Outside the requested window: a boundary contract violation.
    [{ startMs: new Date(2020, 0, 1, 10).getTime(), steps: 10 }],
  ]) {
    const result = samplesToLocalTotals(bad, NOON);
    assert.equal(result.kind, 'error', `expected an error for ${JSON.stringify(bad)}`);
    if (result.kind === 'error') reasons.push(result.reason);
  }
  assert.equal(new Set(reasons).size >= 1, true, 'errors carry reasons');
});

test('a null reader, a rejected query, and a malformed payload all fail loud', async () => {
  const nullRead = await loadDailyStepTotals(null, NOON);
  assert.equal(nullRead.kind, 'error', 'no module is an error, not zero steps');
  const failing = {
    async readDailyStepTotals() { throw new Error('query failed'); },
  };
  const rejected = await loadDailyStepTotals(failing, NOON);
  assert.equal(rejected.kind, 'error', 'a native rejection is an error, never a zero-step success');
  assert.match(rejected.kind === 'error' ? rejected.reason : '', /query failed/);
  const malformed = {
    async readDailyStepTotals() { return 'nope'; },
  };
  assert.equal((await loadDailyStepTotals(malformed, NOON)).kind, 'error');
  const ok = {
    async readDailyStepTotals() { return [sampleFor(0, 42)]; },
  };
  const good = await loadDailyStepTotals(ok, NOON);
  assert.deepEqual(good.kind === 'ok' ? good.totals[dayKey(0)] : null, 42);
});

test('fetched Health totals are never written to storage', async () => {
  // The loader writes nothing: a memory backend observed across a full read
  // stays exactly as it started.
  const store = new Map();
  let read = 0;
  const backend = {
    async getItem(key) { read += 1; return store.has(key) ? store.get(key) : null; },
    async setItem() { throw new Error('the loader must never write'); },
    async removeItem() { throw new Error('the loader must never remove'); },
  };
  const reader = { async readDailyStepTotals() { return [sampleFor(0, 100)]; } };
  await loadDailyStepTotals(reader, NOON);
  assert.equal(read, 0, 'the loader never reads or writes any storage key');
  // No persistence module exists for fetched totals: the step-read owner
  // holds no storage key, and the health module's only storage write is the
  // #19 decision record.
  assert.equal((healthSource.match(/setItem/g) ?? []).length, 1,
    'the only storage write in the health module is the decision record');
  assert.doesNotMatch(healthSource, /export const [A-Z_]*STEP[A-Z_]*KEY/);
  assert.match(clearDataSource, /LOCAL_DATA_KEYS: readonly string\[\] = \[\s*PREFERENCES_KEY,\s*GOALS_KEY,\s*MANUAL_TOTALS_KEY,\s*HEALTH_DECISIONS_KEY,\s*\]/);
  // The App keeps totals in React state only.
  assert.match(appSource, /useState<HealthTotalsView>\(IDLE_HEALTH_TOTALS\)/);
  assert.doesNotMatch(appSource, /save[A-Za-z]*\(AsyncStorage,[^)]*healthTotals/i);
});

test('a manual total keeps precedence through Health refreshes and is never summed', () => {
  const healthWithToday = { totals: { [dayKey(0)]: 8000 }, lastRefreshMs: 1, refreshing: false, error: null };
  const ready = (total) => ({ kind: 'value', total });
  // Manual 3,000 vs Health 8,000: the manual total wins, never 11,000.
  const manual = resolveDaySnapshot(ready(3000), healthWithToday, 'granted', dayKey(0));
  assert.deepEqual(manual, { kind: 'loaded', steps: 3000, source: 'manual' });
  // Removing the manual total reveals the Health total.
  const revealed = resolveDaySnapshot(ready(null), healthWithToday, 'granted', dayKey(0));
  assert.deepEqual(revealed, { kind: 'loaded', steps: 8000, source: 'health' });
  // A date with no manual total and no Health data under granted access is
  // the neutral no-data state.
  const empty = resolveDaySnapshot(ready(null), healthWithToday, 'granted', dayKey(1));
  assert.deepEqual(empty, { kind: 'empty' });
});

test('every transient and failure state renders truthfully, never as zero steps', () => {
  const granted = 'granted';
  const readyManual = { kind: 'value', total: null };
  // A failed manual read is an error even when Health has data.
  assert.deepEqual(
    resolveDaySnapshot({ kind: 'failed' }, IDLE_HEALTH_TOTALS, granted, dayKey(0)).kind, 'error');
  // A failed refresh is an error, never a zero-step success.
  const failed = { totals: null, lastRefreshMs: null, refreshing: false, error: 'boom' };
  assert.deepEqual(
    resolveDaySnapshot(readyManual, failed, granted, dayKey(0)).kind, 'error');
  // A failed refresh after a successful one keeps the old total visible.
  const failedAfter = { totals: { [dayKey(0)]: 100 }, lastRefreshMs: 1, refreshing: false, error: 'boom' };
  const kept = resolveDaySnapshot(readyManual, failedAfter, granted, dayKey(0));
  assert.deepEqual(kept, { kind: 'loaded', steps: 100, source: 'health' });
  // A refresh in flight is loading, not empty.
  assert.equal(resolveDaySnapshot(
    readyManual, { ...IDLE_HEALTH_TOTALS, refreshing: true }, granted, dayKey(0),
  ).kind, 'loading');
  // A completed read with nothing for the date is the neutral empty state.
  const emptyRead = { totals: {}, lastRefreshMs: 1, refreshing: false, error: null };
  assert.equal(resolveDaySnapshot(readyManual, emptyRead, granted, dayKey(0)).kind, 'empty');
  // No read this session yet: unavailable, not empty.
  assert.equal(resolveDaySnapshot(readyManual, IDLE_HEALTH_TOTALS, granted, dayKey(0)).kind, 'unavailable');
  // Not granted (skipped/declined, not requested, unavailable, unknown) never
  // renders fetched data or implies a denial — just not connected.
  const withData = { totals: { [dayKey(0)]: 8000 }, lastRefreshMs: 1, refreshing: false, error: null };
  for (const permission of ['skipped-declined', 'not-requested', 'unavailable', null]) {
    const snapshot = resolveDaySnapshot(readyManual, withData, permission, dayKey(0));
    assert.deepEqual(snapshot, { kind: 'unavailable' }, `permission ${permission} stays not-connected`);
  }
});

test('the no-data, refreshing, and refresh-failed copy exists, is neutral, and is distinct', () => {
  for (const locale of ['en', 'vi']) {
    const copy = getCopy(locale);
    for (const line of [copy.noStepDataFound, copy.healthRefreshing, copy.healthRefreshFailed, copy.lastRefreshLabel]) {
      assert.ok(line.trim().length > 0, `${locale} copy is non-empty`);
    }
    // Neutral no-data wording: it never claims the user denied access and
    // never names a permission outcome.
    assert.doesNotMatch(copy.noStepDataFound, /skip|declin|denied|permission|quyền/i);
    assert.notEqual(copy.noStepDataFound, copy.healthPermSkipped,
      `${locale} no-data wording is distinct from the skipped/declined line`);
    assert.notEqual(copy.noStepDataFound, copy.healthPermNotRequested);
    assert.notEqual(copy.noStepDataFound, copy.stepsUnavailable);
  }
});

test('refresh runs on app open, foreground, and pull to refresh — never in the background', () => {
  // The pull-to-refresh control is wired to the same refresh callback.
  assert.match(appSource,
    /<RefreshControl refreshing=\{healthTotals\.refreshing\}\s*onRefresh=\{refreshHealthTotals\}/);
  // App open and foreground: the effect fires once when access is granted,
  // and AppState 'active' re-fires it. Both gate on the granted state.
  const effect = appSource.slice(
    appSource.indexOf("AppState.addEventListener('change'"),
    appSource.indexOf('let page: ReactElement'),
  );
  assert.match(effect, /if \(state === 'active'\) refreshHealthTotals\(\);/);
  assert.match(effect, /subscription\.remove\(\)/, 'the foreground listener is removed on cleanup');
  // No background scheduling exists anywhere in the App source.
  assert.doesNotMatch(appSource, /setInterval|BackgroundTask|BackgroundFetch|backgroundRefresh/i);
  // The refresh itself is granted-only and never fabricates a success.
  const refresh = appSource.slice(
    appSource.indexOf('const refreshHealthTotals'),
    appSource.indexOf("// Refresh on app open"),
  );
  assert.match(refresh, /healthPerm !== 'granted'\) return/);
  assert.match(refresh, /loadDailyStepTotals\(healthNative, new Date\(\)\)/);
  // A failed refresh keeps the previous totals and records the reason —
  // never a zero-step success.
  assert.match(refresh, /totals: prev\.totals, lastRefreshMs: prev\.lastRefreshMs/);
  assert.match(refresh, /error: result\.reason/);
  // A success stamps the last-refresh time.
  assert.match(refresh, /lastRefreshMs: Date\.now\(\)/);
});

test('clear-data resets fetched totals and never touches the system grants', () => {
  // The in-memory fetched totals reset with the rest of app data.
  assert.match(appSource, /setHealthTotals\(IDLE_HEALTH_TOTALS\)/);
  // Clear-data's documented contract: it removes local documents only —
  // permission grants are an operating-system concern.
  assert.match(clearDataSource, /never touches the system grants/);
});

test('the native module carries the one-shot daily step query', () => {
  // The module surface grew by exactly the read: a one-shot statistics
  // collection query over step counts.
  assert.match(swiftSource, /AsyncFunction\("readDailyStepTotals"\)/);
  assert.match(swiftSource, /HKStatisticsCollectionQuery\(/);
  assert.match(swiftSource, /quantityType: HKQuantityType\(\.stepCount\)/);
  assert.match(swiftSource, /options: \.cumulativeSum/);
  // Day-long intervals anchored at the device's local midnight, so totals
  // attribute to the local date the steps were walked on.
  assert.match(swiftSource, /anchorDate: calendar\.startOfDay\(for: from\)/);
  assert.match(swiftSource, /day\.day = 1/);
  // One-shot read: the initial handler resolves once; no update handler and
  // no background delivery exist.
  assert.match(swiftSource, /initialResultsHandler/);
  assert.doesNotMatch(swiftSource, /statisticsUpdateHandler|enableBackgroundDelivery/);
  // An interval without a sum is skipped — never read as 0.
  assert.match(swiftSource, /guard let sum = statistics\.sumQuantity\(\) else \{ return \}/);
  // The module interface exposes the read to the app.
  assert.match(moduleSource, /readDailyStepTotals\(fromMs: number, toMs: number\): Promise<DayStepSample\[\]>/);
});

test('the App renders Today and Progress through the single truthful-state rule', () => {
  // One resolver decides every date snapshot; the old ad-hoc manual-only
  // derivations are gone.
  assert.match(appSource, /resolveDaySnapshot\(/);
  assert.equal(appSource.match(/resolveDaySnapshot\(/g).length, 2,
    'Today and Progress, and nothing else, derive snapshots');
  assert.doesNotMatch(appSource, /\{ kind: 'unavailable' \}/);
  // The Health page shows the last successful refresh time and the refresh
  // failure, both in the user's language.
  assert.match(appSource, /copy\.lastRefreshLabel/);
  assert.match(appSource, /copy\.healthRefreshFailed/);
  assert.match(appSource, /copy\.healthRefreshing/);
});
