import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getCopy } from '../src/localization.ts';
import { createNavigationState, navigate } from '../src/navigation.ts';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const navSource = readFileSync(new URL('../src/navigation.ts', import.meta.url), 'utf8');

test('home is the only root: settings opens from home and returns through settings', () => {
  const initial = createNavigationState();
  assert.equal(initial.screen, 'today');
  const settings = navigate(initial, { type: 'open-settings' });
  assert.deepEqual(settings, { screen: 'settings' });
  const goal = navigate(settings, { type: 'open-destination', destination: 'goal' });
  assert.equal(navigate(goal, { type: 'back' }).screen, 'settings');
  assert.equal(navigate(navigate(goal, { type: 'back' }), { type: 'back' }).screen, 'today');
  // The tab bar's navigation action is gone: no case handles it any more.
  assert.equal(navigate(initial, { type: 'select-tab', tab: 'progress' }), undefined);
});

test('the tab bar and its navigation action are gone everywhere', () => {
  assert.doesNotMatch(navSource, /select-tab|PrimaryTab|settingsOrigin/);
  assert.doesNotMatch(appSource, /select-tab|function Tabs\(|accessibilityRole="tab"/);
  // Settings' back control is the labeled real button home (issue #42:
  // screen readers keep real buttons — the swipe is the extra affordance).
  assert.match(appSource, /action=\{back\} label=\{back\}/);
});

test('home opens Settings through the duck-led swipe; the transition never traps navigation', () => {
  const panStart = appSource.indexOf('PanResponder.create');
  assert.ok(panStart >= 0, 'home carries a PanResponder swipe (no new dependency)');
  const pan = appSource.slice(panStart, appSource.indexOf('swipe.panHandlers'));
  // Horizontal pans only, so the swipe never fights the ScrollView, and a
  // motionless tap stays the duck's poke. The release needs a decisive,
  // leftward drag — the prototype's 48px horizontal-only rule.
  assert.match(pan, /Math\.abs\(gesture\.dx\) > Math\.abs\(gesture\.dy\)/);
  assert.match(pan, /gesture\.dx <= -48/);
  // The duck leads when it can; a busy duck changes screens immediately.
  assert.match(appSource, /petRef\.current\?\.lead\(\) \?\? false/);
  assert.match(appSource, /led \? LEAD_MS \+ 30 : 0/,
    'a busy duck never delays the screen change');
  // Screen readers keep a labeled path: the open-settings custom action.
  assert.match(appSource,
    /accessibilityActions=\{\[\{ name: 'openSettings', label: copy\.openSettings \}\]\}/);
  // Returning home plays the arrival waddle.
  assert.match(appSource, /petRef\.current\?\.arrive\(\)/);
});

test('shell labels are translated and complete in both supported locales', () => {
  assert.equal(getCopy('en').settingsTitle, 'Settings');
  assert.equal(getCopy('vi').settingsTitle, 'Cài đặt');
  assert.equal(getCopy('en').backToToday, 'Back to Today');
  assert.equal(getCopy('vi').backToToday, 'Quay lại Hôm nay');
  assert.equal(getCopy('en').openSettings, 'Open Settings');
  assert.equal(getCopy('vi').openSettings, 'Mở Cài đặt');
  assert.equal(getCopy('en').progressIntro, 'Today and your previous six local days.');
  assert.equal(getCopy('vi').progressIntro, 'Hôm nay và sáu ngày gần nhất theo giờ địa phương.');
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
  // 4 shell controls (the header back actions, the settings rows, and the
  // device-language row on the language page)
  // + the seven tappable date rows (one Pressable in source) and the stepper
  // popup's five controls (−, +, Cancel, Save, and Remove when the date holds
  // a manual total) — issue #44, Remove in phase 3's AC4
  // + the header's mini duck
  // + the goal editor's save control.
  // + the Health page's two actions (enable, open iOS Settings) and the
  // explanation sheet's two (not now, continue) — issue #19.
  assert.equal(pressables.length, 16);
  for (const pressable of pressables) {
    assert.match(pressable, /accessibilityRole=/);
    assert.match(pressable, /accessibilityLabel=/);
  }

  for (const styleName of ['headerAction', 'settingsRow', 'languageRow', 'progressRow',
    'stepButton', 'stepperAction', 'goalSave']) {
    const style = appSource.match(new RegExp(`${styleName}:\\s*\\{[^}]*minHeight:\\s*(\\d+)`));
    assert.ok(style, `${styleName} must declare a touch target`);
    assert.ok(Number(style[1]) >= 48, `${styleName} must be at least 48 points high`);
  }

  // The mini duck sizes through the MINI_DUCK_SIZE constant (48pt, past the
  // 44pt HIG minimum) rather than a literal in the style sheet.
  const miniDuck = appSource.match(/miniDuck:\s*\{[^}]*\}/);
  assert.ok(miniDuck, 'the mini duck style exists');
  assert.match(miniDuck[0], /width: MINI_DUCK_SIZE, height: MINI_DUCK_SIZE/);
  assert.match(appSource, /const MINI_DUCK_SIZE = 48;/,
    'the mini duck clears the 44pt HIG minimum');

  // Header actions clear the 44pt width minimum too (issue #42 supersedes #24).
  const headerAction = appSource.match(/headerAction:\s*\{[^}]*\}/);
  assert.ok(headerAction, 'the header action style exists');
  assert.match(headerAction[0], /minWidth:\s*44/, 'header actions are at least 44 points wide');
});

test('the date rows open the in-screen stepper; the manual editor navigation is gone', () => {
  // Each date row is its own control opening the stepper for that exact date.
  assert.match(appSource, /onPress=\{\(\) => onOpenStepper\(dateKey\)\}/);
  // The stepper −/+ changes by 100 with a 0 floor and the store's ceiling, so
  // Save always persists a value the data owner accepts.
  assert.match(appSource, /Math\.min\(MAX_MANUAL_TOTAL, Math\.max\(0, current\.value \+ delta\)\)/);
  // Save writes through the manual-totals owner; Cancel throws the draft away.
  assert.match(appSource, /onApply\(stepper\.dateKey, stepper\.value\)/);
  assert.match(appSource, /onPress=\{\(\) => setStepper\(null\)\}/);
  // The popup is in-screen state, not navigation: no manual screen, no editor
  // page, and the ring math never entered the shell.
  assert.doesNotMatch(appSource, /open-manual|ManualPage|manualDate/);
  assert.doesNotMatch(navSource, /'manual'|open-manual|manualDate/);
  assert.doesNotMatch(appSource, /litSegments|segmentAngle|RING_SEGMENTS/,
    'no ring renders anywhere (prototype v3 directive)');
});

test('the stepper removes a manual total through the store when one exists', () => {
  // Remove exists only when the opened date holds a manual total — a manual
  // 0 is a valid rest day that keeps precedence, so removal is never a Save
  // of 0 and never reachable for a date with no manual total.
  assert.match(appSource, /hasManual: existing !== null/);
  assert.match(appSource, /\{stepper\.hasManual && \(/);
  // The popup's Remove ends the date's manual precedence through the owner's
  // removal API — the same confirmed-write contract as Save — and the shell
  // wires it so the rows re-render from what is stored.
  assert.match(appSource, /removeManualTotal\(manual\.totals, dateKey\)/);
  assert.match(appSource, /onRemove\(stepper\.dateKey\)/);
  assert.match(appSource, /onRemove=\{applyManualRemoval\}/);
  // The removal affordance takes the destructive color and is offered in
  // both locales.
  assert.match(appSource, /stepperRemoveText: \{ color: colors\.danger/);
  assert.equal(getCopy('en').manualRemove, 'Remove total');
  assert.equal(getCopy('vi').manualRemove, 'Xóa tổng');
});

test('the mini duck sits in the Settings header and returns home through the back action', () => {
  const settings = appSource.slice(appSource.indexOf('function SettingsPage'),
    appSource.indexOf('function DestinationPage'));
  // The duck rides the header's side slot beside the back action (prototype v5).
  assert.match(settings, /side=\{<MiniDuck /);
  // Its return is the back action, so home's arrival waddle (#42) plays.
  assert.match(settings, /onHome=\{\(\) => onNavigate\(\{ type: 'back' \}\)\}/);
  // The duck plays the poke: the surprised frame, the heart, then home.
  assert.match(appSource, /poked \? frames\.surprised : frames\.idle/);
  assert.match(appSource, /source=\{particles\.heart\}/);
  assert.match(appSource, /MINI_DUCK_HOME_MS\)/);
});
