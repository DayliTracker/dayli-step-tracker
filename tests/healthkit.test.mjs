import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  DEFAULT_HEALTH_DECISIONS, HEALTH_DECISIONS_KEY, loadHealthDecisions,
  permissionState, saveHealthDecisions, shouldShowFirstLaunchExplanation,
} from '../src/healthkit.ts';
import { clearLocalData, LOCAL_DATA_KEYS } from '../src/clear-data.ts';
import { PREFERENCES_KEY } from '../src/preferences.ts';
import { getCopy } from '../src/localization.ts';
import { createNavigationState, navigate } from '../src/navigation.ts';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const swiftSource =
  readFileSync(new URL('../modules/dayli-health-kit/ios/DayliHealthKitModule.swift', import.meta.url), 'utf8');
const moduleConfig =
  readFileSync(new URL('../modules/dayli-health-kit/expo-module.config.json', import.meta.url), 'utf8');
const podspecSource =
  readFileSync(new URL('../modules/dayli-health-kit/ios/DayliHealthKit.podspec', import.meta.url), 'utf8');
const appConfig = readFileSync(new URL('../app.json', import.meta.url), 'utf8');

// In-memory backend standing in for AsyncStorage (tests/manual-totals.test.mjs
// shape): `store` is exposed so round-trip and clear-data tests can assert the
// exact stored keys.
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
const failingBackend = {
  async getItem() { throw new Error('disk unavailable'); },
  async setItem() { throw new Error('disk unavailable'); },
  async removeItem() { throw new Error('disk unavailable'); },
};

test('the decision document round-trips and a missing document is the defaults', async () => {
  const backend = memoryBackend();
  const first = await loadHealthDecisions(backend);
  assert.deepEqual(first, { kind: 'ok', value: DEFAULT_HEALTH_DECISIONS });
  const saved = await saveHealthDecisions(backend, { decision: 'skipped' });
  assert.deepEqual(saved, { kind: 'ok', value: { decision: 'skipped' } });
  assert.deepEqual(JSON.parse(backend.store.get(HEALTH_DECISIONS_KEY)), { decision: 'skipped' });
  const reread = await loadHealthDecisions(backend);
  assert.deepEqual(reread, { kind: 'ok', value: { decision: 'skipped' } });
});

test('a malformed decision document is an error, never a silent reset', async () => {
  for (const raw of ['not json', '[]', '{"decision":"maybe"}', '{"other":1}']) {
    const result = await loadHealthDecisions(memoryBackend({ [HEALTH_DECISIONS_KEY]: raw }));
    assert.equal(result.kind, 'error', `expected error for payload: ${raw}`);
  }
  const failed = await loadHealthDecisions(failingBackend);
  assert.equal(failed.kind, 'error');
});

test('a failed decision write is an error result, never a fake save', async () => {
  const result = await saveHealthDecisions(failingBackend, { decision: 'requested' });
  assert.equal(result.kind, 'error');
});

test('the four permission states are distinct and typed', () => {
  // Unavailable native module or HealthKit — never a guess about the record.
  assert.equal(permissionState(false, { decision: null }), 'unavailable');
  assert.equal(permissionState(false, { decision: 'requested' }), 'unavailable');
  // A confirmed fresh record is not-requested.
  assert.equal(permissionState(true, { decision: null }), 'not-requested');
  // The user's own recorded paths.
  assert.equal(permissionState(true, { decision: 'requested' }), 'granted');
  assert.equal(permissionState(true, { decision: 'skipped' }), 'skipped-declined');
});

test('the first-launch explanation opens only on a confirmed fresh record', () => {
  assert.equal(shouldShowFirstLaunchExplanation('not-requested', false), true);
  // An unreadable record is unknown: it must never auto-open (that could
  // re-ask someone whose stored skip is unreadable).
  assert.equal(shouldShowFirstLaunchExplanation('not-requested', true), false);
  assert.equal(shouldShowFirstLaunchExplanation('granted', false), false);
  assert.equal(shouldShowFirstLaunchExplanation('skipped-declined', false), false);
  assert.equal(shouldShowFirstLaunchExplanation('unavailable', false), false);
});

test('clear-data removes the decision record and nothing else', async () => {
  const backend = memoryBackend({
    [PREFERENCES_KEY]: '{"languageOverride":"vi"}',
    [HEALTH_DECISIONS_KEY]: '{"decision":"skipped"}',
    'some.other.key': 'untouched',
  });
  const result = await clearLocalData(backend);
  assert.deepEqual(result, { kind: 'ok', value: undefined });
  assert.equal(backend.store.has(HEALTH_DECISIONS_KEY), false, 'the decision record is gone');
  assert.equal(backend.store.get('some.other.key'), 'untouched');
});

test('the permission states are localized in English and Vietnamese, all distinct', () => {
  for (const locale of ['en', 'vi']) {
    const copy = getCopy(locale);
    const lines = [
      copy.healthPermNotRequested, copy.healthPermGranted,
      copy.healthPermSkipped, copy.healthPermUnavailable,
    ];
    for (const line of lines) {
      assert.ok(line.trim().length > 0, `${locale} state copy is non-empty`);
    }
    assert.equal(new Set(lines).size, 4, `${locale} renders four distinct state lines`);
  }
  assert.match(getCopy('en').healthPermGranted, /Apple Health/);
  assert.match(getCopy('en').healthPermUnavailable, /Manual entry|manual entry/i);
  assert.match(getCopy('vi').healthPermUnavailable, /thủ công/);
});

test('the explanation sheet explains before any request and never nags', () => {
  // One shared sheet: first launch and any later request from Settings.
  assert.match(appSource, /function HealthExplainModal/);
  assert.match(appSource, /healthExplainTitle/);
  assert.match(appSource, /healthExplainBody/);
  // The sheet has exactly two paths out, and both record a decision — there
  // is no dismiss-without-decision path that could re-open on its own.
  assert.match(appSource, /onContinue=\{requestHealthAccess\} onSkip=\{skipHealthAccess\}/);
  assert.match(appSource, /decision: 'requested'/);
  assert.match(appSource, /decision: 'skipped'/);
  // The auto-open effect is gated on the confirmed fresh record only.
  assert.match(appSource,
    /shouldShowFirstLaunchExplanation\(healthPerm, healthReadFailed\)/);
  // Skip and decline leave manual entry untouched: no code gates the manual
  // editor or the Settings rows on the permission state.
  assert.doesNotMatch(appSource, /healthPerm[^&]*\? disabled|disabled=\{.*health/);
});

test('Settings offers the later request and the system route for the connected state', () => {
  assert.match(appSource, /function HealthPage/);
  assert.match(appSource, /'not-requested': copy\.healthPermNotRequested/);
  assert.match(appSource, /'granted': copy\.healthPermGranted/);
  assert.match(appSource, /'skipped-declined': copy\.healthPermSkipped/);
  assert.match(appSource, /'unavailable': copy\.healthPermUnavailable/);
  // The later request re-runs the explanation sheet (explain before every
  // request), and the connected state offers Apple's own settings route.
  assert.match(appSource, /canRequest = state === 'not-requested' \|\| state === 'skipped-declined'/);
  assert.match(appSource, /void Linking\.openSettings\(\)/);
  // The placeholder "later" line is gone: the real controls arrived.
  assert.doesNotMatch(appSource, /healthLater/);
  assert.doesNotMatch(getCopy('en').healthSubtitle, /later/i);
});

test('native requests fail loud, not as a zero-step success', () => {
  // A failed native request surfaces the error line and records nothing.
  const handler = appSource.slice(appSource.indexOf('const requestHealthAccess'),
    appSource.indexOf('const skipHealthAccess'));
  assert.match(handler, /\.catch\(\(cause: unknown\) => \{\s*setHealthRequestError\(String\(cause\)\);/);
  assert.match(appSource, /copy\.healthRequestError/);
});

test('the native module is read-only HealthKit over the local Expo module', () => {
  // The local module autolinks as an iOS-only Expo module.
  const config = JSON.parse(moduleConfig);
  assert.deepEqual(config, { platforms: ['ios'], ios: { modules: ['DayliHealthKitModule'] } });
  // Autolinking discovers local modules through a podspec inside a
  // subdirectory of the module (expo-modules-autolinking scans only
  // subdirectories for *.podspec).
  assert.match(podspecSource, /s\.name\s+= 'DayliHealthKit'/);
  assert.match(podspecSource, /s\.dependency\s+'ExpoModulesCore'/);
  assert.doesNotMatch(podspecSource, /dependency\s+'HealthKit/);
  // The request carries an EMPTY share set: the app can never write health
  // data (Apple's read-only request).
  assert.match(swiftSource, /requestAuthorization\(toShare: \[\], read: \[stepCount\]\)/);
  assert.match(swiftSource, /import HealthKit/);
  assert.match(swiftSource, /HKHealthStore\.isHealthDataAvailable\(\)/);
  // No write API in the module surface; the one-shot read query is the
  // step-read card's addition (tests/health-steps.test.mjs covers its shape)
  // and no background delivery exists.
  assert.doesNotMatch(swiftSource, /toShare: \[[^\]]/);
  assert.doesNotMatch(swiftSource, /enableBackgroundDelivery/);
  assert.doesNotMatch(swiftSource, /HKSampleQuery|HKQuantityQuery\(/);
});

test('the iOS config carries a real bundle ID, the health entitlement, and the read disclosure', () => {
  const config = JSON.parse(appConfig);
  const ios = config.expo.ios;
  assert.match(ios.bundleIdentifier, /^com\.daylitracker\./,
    'the bundle identifier is a production-app ID, not the scaffold default');
  assert.equal(ios.entitlements['com.apple.developer.healthkit'], true);
  // Read-only proof: the read disclosure is present and the write disclosure
  // is absent — nothing in the config claims write access.
  assert.match(ios.infoPlist.NSHealthShareUsageDescription, /step count/i);
  assert.match(ios.infoPlist.NSHealthShareUsageDescription, /Read-only/i);
  assert.equal(ios.infoPlist.NSHealthUpdateUsageDescription, undefined);
  assert.equal(Object.keys(ios.entitlements).length, 1,
    'the entitlements file grants exactly the HealthKit entitlement');
});

test('the first-launch explanation does not delay navigation or fire from other screens', () => {
  // The auto-open effect runs on the today screen only.
  const effect = appSource.slice(appSource.indexOf('// First launch (phase-03 design 1)'),
    appSource.indexOf('// The request path (phase-03 design 2)'));
  assert.match(effect, /nav\.screen !== 'today'/);
  assert.match(effect, /shouldShowFirstLaunchExplanation\(healthPerm, healthReadFailed\)/);
  // Navigation is untouched by the health flow: the effect only opens a modal.
  assert.equal(navigate(createNavigationState(), { type: 'open-settings' }).screen, 'settings');
});
