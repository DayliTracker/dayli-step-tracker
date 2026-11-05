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
  assert.deepEqual(settings, { screen: 'settings', settingsOrigin: 'progress', manualDate: null });
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

test('Settings lists all destinations and clear-data is a confirmed destructive action', () => {
  for (const destination of ['goal', 'language', 'health']) {
    assert.ok(appSource.includes(`destination: '${destination}'`));
  }
  assert.match(appSource, /title: copy\.clearTitle, subtitle: copy\.clearSubtitle, clear: true/);
  // The confirmation carries a destructive confirm button, not a got-it note.
  assert.match(appSource, /Alert\.alert\(copy\.clearConfirmTitle, copy\.clearConfirmMessage/);
  assert.match(appSource, /\{ text: copy\.cancel, style: 'cancel' \}/);
  assert.match(appSource, /\{ text: copy\.clearConfirm, style: 'destructive', onPress: applyClearData \}/);
  // The copy names what is removed, what resets, and that Health permissions
  // stay unchanged.
  assert.match(getCopy('en').clearConfirmMessage, /preferences, goal history, manual totals/);
  assert.match(getCopy('en').clearConfirmMessage, /Health permissions remain unchanged/);
  assert.match(getCopy('vi').clearConfirmMessage, /Quyền truy cập Sức khỏe vẫn giữ nguyên/);
  // The Settings row describes the reset instead of the old preview line.
  assert.match(getCopy('en').clearSubtitle, /Removes preferences/);
  assert.doesNotMatch(getCopy('en').clearSubtitle, /preview/i);
  assert.doesNotMatch(getCopy('vi').clearSubtitle, /xem trước/i);
});

test('interactive controls have accessible names and at least 48-point touch targets', () => {
  const pressables = Array.from(appSource.matchAll(/<Pressable\b([\s\S]*?)>/g), (match) => match[1]);
  // 5 shell controls (including the device-language row on the language page)
  // + the per-date manual-entry control in the Progress rows
  // + the goal editor's save control
  // + the manual editor's save and remove controls.
  assert.equal(pressables.length, 9);
  for (const pressable of pressables) {
    assert.match(pressable, /accessibilityRole=/);
    assert.match(pressable, /accessibilityLabel=/);
  }

  for (const styleName of ['headerAction', 'settingsRow', 'languageRow', 'tab', 'manualAction',
    'manualRemove', 'goalSave']) {
    const style = appSource.match(new RegExp(`${styleName}:\\s*\\{[^}]*minHeight:\\s*(\\d+)`));
    assert.ok(style, `${styleName} must declare a touch target`);
    assert.ok(Number(style[1]) >= 48, `${styleName} must be at least 48 points high`);
  }
});
