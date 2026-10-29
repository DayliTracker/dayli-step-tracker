import assert from 'node:assert/strict';
import test from 'node:test';
import { getCopy } from '../src/localization.ts';
import { createNavigationState, navigate } from '../src/navigation.ts';

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
