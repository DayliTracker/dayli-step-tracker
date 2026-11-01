import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getCopy } from '../src/localization.ts';
import { createNavigationState, navigate } from '../src/navigation.ts';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

test('tabs, Settings origins, and Settings destinations navigate correctly', () => {
  const initial = createNavigationState();
  assert.equal(initial.screen, 'today');
  assert.equal(navigate(navigate(initial, { type: 'open-settings' }), { type: 'back' }).screen, 'today');
  const progress = navigate(initial, { type: 'select-tab', tab: 'progress' });
  const settings = navigate(progress, { type: 'open-settings' });
  assert.deepEqual(settings, { screen: 'settings', settingsOrigin: 'progress' });
  const goal = navigate(settings, { type: 'open-destination', destination: 'goal' });
  assert.equal(navigate(goal, { type: 'back' }).screen, 'settings');
  assert.equal(navigate(navigate(goal, { type: 'back' }), { type: 'back' }).screen, 'progress');
});

test('shell labels are translated and complete in both supported locales', () => {
  assert.equal(getCopy('en').todayTitle, 'Today');
  assert.equal(getCopy('vi').todayTitle, 'Hôm nay');
  assert.equal(getCopy('en').progressTitle, 'Progress');
  assert.equal(getCopy('vi').progressTitle, 'Tiến độ');
  assert.equal(getCopy('en').settingsTitle, 'Settings');
  assert.equal(getCopy('vi').settingsTitle, 'Cài đặt');
  assert.equal(Object.keys(getCopy('en')).length, Object.keys(getCopy('vi')).length);
  assert.ok(Object.values(getCopy('en')).every((value) => value.trim()));
  assert.ok(Object.values(getCopy('vi')).every((value) => value.trim()));
});

test('Settings lists all destinations and clear-data actions are preview-only', () => {
  for (const destination of ['goal', 'language', 'health']) {
    assert.ok(appSource.includes(`destination: '${destination}'`));
  }
  assert.match(appSource, /title: copy\.clearTitle, subtitle: copy\.clearSubtitle, clear: true/);
  assert.match(appSource, /Alert\.alert\(copy\.clearConfirmTitle, copy\.clearConfirmMessage/);
  assert.match(appSource, /\{ text: copy\.cancel, style: 'cancel' \}, \{ text: copy\.gotIt \}/);
  assert.match(getCopy('en').clearConfirmMessage, /no app data will be cleared/i);
  assert.match(getCopy('vi').clearConfirmMessage, /không bị xóa/i);
});

test('interactive controls have accessible names and at least 48-point touch targets', () => {
  const pressables = Array.from(appSource.matchAll(/<Pressable\b([\s\S]*?)>/g), (match) => match[1]);
  // 5 shell controls (including the device-language row on the language page)
  // + the per-date manual-entry control in the Progress rows.
  assert.equal(pressables.length, 6);
  for (const pressable of pressables) {
    assert.match(pressable, /accessibilityRole=/);
    assert.match(pressable, /accessibilityLabel=/);
  }

  for (const styleName of ['headerAction', 'settingsRow', 'languageRow', 'tab', 'manualAction']) {
    const style = appSource.match(new RegExp(`${styleName}:\\s*\\{[^}]*minHeight:\\s*(\\d+)`));
    assert.ok(style, `${styleName} must declare a touch target`);
    assert.ok(Number(style[1]) >= 48, `${styleName} must be at least 48 points high`);
  }
});
