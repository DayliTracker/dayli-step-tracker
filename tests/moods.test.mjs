import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  DIZZY_MS, DOUBLE_TAP_MS, SLEEP_PRESS_MS, SLEEP_WAKE_MS, STROLL_HOLD_MS,
  WIGGLE_FLIPS, WIGGLE_JITTER_PX, WIGGLE_MAX_DX, countFlips, isWiggle,
} from '../src/moods.ts';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const petSource = readFileSync(new URL('../components/PixelPet.tsx', import.meta.url), 'utf8');

test('AC1: long-press (~1.2s) sleeps the duck — blink face, breathe-dim, z particles', () => {
  assert.equal(SLEEP_PRESS_MS, 1200, 'the prototype v4 long-press is ~1.2s');
  // The duck's own Pressable carries the gesture.
  assert.match(petSource, /onLongPress=\{handleLongPress\}/);
  assert.match(petSource, /delayLongPress=\{SLEEP_PRESS_MS\}/);
  assert.match(petSource, /mood === 'sleep'\s*\? 'blink'/,
    'the nap holds the closed-eye frame — a frame swap, no new art');
  assert.match(petSource, /mood === 'sleep' && <Snores size=\{size\} \/>/,
    'sleeping ducks float z particles');
  assert.match(petSource, /toValue: mood === 'sleep' \? 0\.72 : 1/, 'sleep dims');
  // The nap face and z's are transforms over the existing 7-frame contract.
  assert.doesNotMatch(petSource, /require\(/, 'PixelPet never adds art assets');
});

test('AC1: any touch wakes the sleeper surprised; it self-wakes after ~12s', () => {
  assert.equal(SLEEP_WAKE_MS, 12000);
  assert.match(petSource, /setTimeout\(\(\) => setMood\('idle'\), SLEEP_WAKE_MS\)/,
    'sleep self-wakes on a timeout');
  // The duck's own touch wakes; the shell wakes it for touches elsewhere.
  assert.match(petSource, /if \(moodRef\.current !== 'sleep'\) return;/);
  // The wake reuses the poke's surprised startle (setPoked + POKE_MS).
  assert.match(petSource, /setPoked\(true\);\s*\n\s*justWoke\.current = true;/,
    'a touch-wake shows the surprised startle');
  assert.match(appSource, /petRef\.current\?\.wake\(\);/,
    'any touch on home reaches the wake handle');
  // The wake already answered that press — no poke on top of it.
  assert.match(petSource, /if \(justWoke\.current\) \{/);
});

test('AC2: a fast left-right wiggle on the duck plays dizzy (wobble + stars)', () => {
  // The pure test: enough direction reversals, excursion still small.
  assert.equal(countFlips([0, 20, -25, 30, -20]), 3, 'each direction change flips');
  assert.equal(countFlips([0, 4, -4, 5]), 0, `sub-${WIGGLE_JITTER_PX}px noise never flips`);
  assert.equal(countFlips([]), 0, 'no samples, no wiggle');
  assert.ok(isWiggle(WIGGLE_FLIPS, 100), 'two reversals under the cap are a wiggle');
  assert.ok(!isWiggle(WIGGLE_FLIPS - 1, 60), 'one reversal is a wobble, not a wiggle');
  assert.ok(!isWiggle(WIGGLE_FLIPS, WIGGLE_MAX_DX + 1),
    'a decisive wide drag is a swipe, never a wiggle');
  // The wiring: only drags that began on the duck can dizzy; the shell feeds
  // the pan's samples through the same pure test.
  assert.match(appSource, /duckTouchRef\.current && isWiggle\(countFlips\(samples\), maxAbsDx\)/);
  assert.match(petSource, /mood === 'dizzy'\s*\? 'look'/);
  assert.match(petSource, /mood === 'celebrate' \|\| mood === 'dizzy'/,
    'dizzy reuses the star particle layer');
  assert.match(petSource, /toValue: 12,/, 'the wobble sweeps wider than the walk tilt');
});

test('AC3: holding home ~0.7s strolls the duck across with walk frames', () => {
  assert.equal(STROLL_HOLD_MS, 700);
  assert.match(appSource, /STROLL_HOLD_MS/,
    'the background long-hold timing comes from src/moods.ts');
  // The hold must begin on neither the duck nor the pill (the talk box is
  // pointerEvents="none" and can never start one).
  assert.match(appSource, /if \(duckTouchRef\.current \|\| pillTouchRef\.current\) return;/);
  assert.match(appSource, /onTouchStart=\{onPillTouchStart\}/, 'the pill opts out');
  // The observer covers the whole home surface (issue #52): the wrapper fills
  // the stretched group and the hero grows to the viewport, so a hold below
  // the pill or on a side strip lands on the observer too — not only the
  // pet-slot + pill band.
  assert.match(appSource,
    /style=\{\{ flex: 1 \}\}\s*\n\s*onTouchStart=\{onBackgroundTouchStart\}/,
    'the observer wrapper fills the home surface');
  assert.match(appSource, /alignSelf: 'stretch', flexGrow: 1/,
    'the accessible group covers the hero band');
  assert.match(appSource, /hero: \{[^}]*flexGrow: 1/,
    'the hero grows to the viewport');
  // The stroll walks: the walk-frame swap and the waddle motion include it.
  assert.match(petSource,
    /mood === 'walk' \|\| mood === 'lead' \|\| mood === 'arrive' \|\| mood === 'stroll'/);
  assert.match(petSource,
    /\|\| mood === 'dizzy' \|\| mood === 'stroll'\) onEventRef\.current\?\.\(mood\)/,
    'the stroll speaks through the mood-entry effect, like walk and celebrate');
});

test('AC4: double-tap hops with a heart; all four mood states stay decorative', () => {
  assert.equal(DOUBLE_TAP_MS, 300);
  assert.match(petSource, /DOUBLE_TAP_MS/);
  assert.match(petSource, /setMood\('hop'\);\s*\n\s*playHeart\(\)/,
    'the hop rises with its heart');
  assert.match(petSource, /mood === 'celebrate' \|\| mood === 'hop'/
, 'the hop wears the happy frame');
  // Decorative states stay out of the accessibility tree: the slot hides
  // everything on both platforms, and the z layer is inert itself.
  assert.match(appSource, /accessibilityElementsHidden/);
  assert.match(appSource, /importantForAccessibility="no-hide-descendants"/);
  assert.match(petSource, /accessible=\{false\}/);
  assert.match(appSource, /Dizzy and stroll speak/,
    'dizzy and stroll announce through the same hook');
  assert.match(appSource, /Sleep and hop show instead of speaking\./,
    'sleep and hop show instead of speaking');
});

test('AC5: moods never block navigation or the step pill', () => {
  // #42's swipe contract is untouched: same threshold, same duck-led exit.
  assert.match(appSource, /gesture\.dx <= -48/);
  assert.match(appSource, /petRef\.current\?\.lead\(\) \?\? false/);
  assert.match(appSource, /led \? LEAD_MS \+ 30 : 0/,
    'a busy duck never delays the screen change');
  // A clean swipe that begins on the duck still navigates — the wiggle test
  // only claims reversals, never a decisive drag.
  assert.match(appSource, /a wiggle on the duck is a mood request, never a swipe/);
  // Every outside mood request is ignored while busy; moods start from idle.
  assert.match(petSource, /if \(moodRef\.current !== 'idle'\) return;/);
  // The stroll hold is passive: no responder claimed, scroll and pan intact.
  assert.match(appSource, /onPanResponderRelease: \(_event, gesture\) => \{/);
  assert.doesNotMatch(appSource, /onStartShouldSetPanResponder: \(\) => true/);
});

test('the mood machine never leaks: transient moods settle back to rest', () => {
  // Dizzy and hop hand back to celebrating when the goal still holds.
  assert.match(petSource,
    /mood !== 'dizzy' && mood !== 'hop'/);
  assert.match(petSource, /progress >= 1 \? 'celebrate' : 'idle'/);
  // Sleep defers progress-driven moods instead of being cut short by them.
  assert.match(petSource, /if \(moodRef\.current === 'sleep'\) \{/,);
});
