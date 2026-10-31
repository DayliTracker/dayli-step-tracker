import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolveDeviceLocale, resolveInitialLocale } from '../src/localization.ts';
import {
  DEFAULT_PREFERENCES, PREFERENCES_KEY, loadPreferences, savePreferences,
} from '../src/preferences.ts';

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

test('device locale: Vietnamese preferred locale → vi, otherwise en', () => {
  assert.equal(resolveDeviceLocale(['vi-VN']), 'vi');
  assert.equal(resolveDeviceLocale(['vi']), 'vi');
  assert.equal(resolveDeviceLocale(['en-US']), 'en');
  assert.equal(resolveDeviceLocale([]), 'en');
  // Vietnamese anywhere in the preferred languages counts as detected.
  assert.equal(resolveDeviceLocale(['fr-FR', 'vi-VN']), 'vi');
  // No Vietnamese anywhere, even with other non-English locales.
  assert.equal(resolveDeviceLocale(['en-US', 'ja-JP']), 'en');
  // Matching is on the language subtag, case-insensitive.
  assert.equal(resolveDeviceLocale(['VI-vn']), 'vi');
});

test('initial locale: the saved override wins, otherwise the device decides', () => {
  assert.equal(resolveInitialLocale('vi', null), 'vi');
  assert.equal(resolveInitialLocale('en', null), 'en');
  assert.equal(resolveInitialLocale('vi', 'en'), 'en');
  assert.equal(resolveInitialLocale('en', 'vi'), 'vi');
});

test('a device with no stored preferences reads the defaults', async () => {
  const backend = memoryBackend();
  const result = await loadPreferences(backend);
  assert.deepEqual(result, { kind: 'ok', value: DEFAULT_PREFERENCES });
  assert.deepEqual(DEFAULT_PREFERENCES, { languageOverride: null });
});

test('a saved override survives a restart (save, then read back)', async () => {
  const backend = memoryBackend();
  const saved = await savePreferences(backend, { languageOverride: 'vi' });
  assert.deepEqual(saved, { kind: 'ok', value: { languageOverride: 'vi' } });
  assert.equal(JSON.parse(backend.store.get(PREFERENCES_KEY)).languageOverride, 'vi');
  const reloaded = await loadPreferences(backend);
  assert.deepEqual(reloaded, { kind: 'ok', value: { languageOverride: 'vi' } });
});

test('clearing the override stores null, so the next launch is device-derived', async () => {
  const backend = memoryBackend();
  await savePreferences(backend, { languageOverride: 'vi' });
  const cleared = await savePreferences(backend, { languageOverride: null });
  assert.deepEqual(cleared, { kind: 'ok', value: { languageOverride: null } });
  const reloaded = await loadPreferences(backend);
  assert.deepEqual(reloaded, { kind: 'ok', value: { languageOverride: null } });
});

test('a read failure is an error result, not success-shaped defaults', async () => {
  const result = await loadPreferences(failingBackend());
  assert.equal(result.kind, 'error');
  assert.match(result.reason, /read failed/);
});

test('a write failure is an error result, not a fake save', async () => {
  const result = await savePreferences(failingBackend(), { languageOverride: 'en' });
  assert.equal(result.kind, 'error');
  assert.match(result.reason, /write failed/);
});

test('malformed or unrecognized stored payloads are errors, never silent resets', async () => {
  for (const raw of [
    'not json at all',
    '{"languageOverride":"fr"}',
    '{"languageOverride":123}',
    '{}',
    '["en"]',
    '',
  ]) {
    const result = await loadPreferences(memoryBackend({ [PREFERENCES_KEY]: raw }));
    assert.equal(result.kind, 'error', `expected error for payload: ${raw}`);
  }
});

test('the shell wires the preference lifecycle: resolve device, load, save, clear', () => {
  // Launch: device locale from expo-localization, then the stored override.
  assert.match(appSource, /resolveDeviceLocale\(\s*getLocales\(\)/);
  assert.match(appSource, /loadPreferences\(AsyncStorage\)/);
  assert.match(appSource, /resolveInitialLocale\(prefs\.deviceLocale, prefs\.prefs\?\.languageOverride \?\? null\)/);
  // The language page persists the override and can clear it back to device.
  assert.match(appSource, /savePreferences\(AsyncStorage, \{ languageOverride: override \}\)/);
  assert.match(appSource, /onPress=\{\(\) => onLanguage\(null\)\}/);
  // The first paint waits for preferences, so a relaunch never flashes en.
  assert.match(appSource, /if \(prefs\.kind !== 'ready'\) return null;/);
  // A storage failure is surfaced on the language page, not swallowed.
  assert.match(appSource, /storageError && <Text style=\{s\.languageError\}>/);
});
