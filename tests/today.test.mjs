import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { getCopy } from '../src/localization.ts';
import {
  DEFAULT_GOAL, RING_SEGMENTS, formatNumber, formatRatio, goalReached, litSegments,
  progressRatio, segmentAngle, todayA11yLabel,
} from '../src/today.ts';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const engineSource = readFileSync(new URL('../components/PixelPet.tsx', import.meta.url), 'utf8');
const registrySource = readFileSync(new URL('../components/pets.ts', import.meta.url), 'utf8');

test('ring fills toward the goal and visually caps there without passing it', () => {
  assert.equal(litSegments(0, DEFAULT_GOAL), 0);
  assert.equal(litSegments(4000, DEFAULT_GOAL), RING_SEGMENTS / 2);
  assert.ok(litSegments(7900, DEFAULT_GOAL) < RING_SEGMENTS, 'ring must not show full before the goal');
  assert.equal(litSegments(8000, DEFAULT_GOAL), RING_SEGMENTS);
  assert.equal(litSegments(16000, DEFAULT_GOAL), RING_SEGMENTS, 'ring caps at the goal');
  assert.equal(litSegments(100, DEFAULT_GOAL), 1);
  assert.equal(litSegments(2000, 0), 0, 'a zero goal lights nothing');
});

test('segment angles step clockwise from 12 oclock and the view rotates each segment', () => {
  assert.equal(segmentAngle(0), 0);
  assert.equal(segmentAngle(RING_SEGMENTS / 4), 90);
  assert.equal(segmentAngle(RING_SEGMENTS / 2), 180);
  assert.ok(appSource.includes(
    '{ rotate: `${segmentAngle(index)}deg` }, { translateY: -RING_RADIUS }',
  ));
});

test('ratio text keeps the uncapped value with per-locale separators', () => {
  assert.equal(progressRatio(16000, DEFAULT_GOAL), 2);
  assert.equal(formatRatio(progressRatio(3200, DEFAULT_GOAL), 'en'), '0.4×');
  assert.equal(formatRatio(progressRatio(12000, DEFAULT_GOAL), 'en'), '1.5×');
  assert.equal(formatRatio(progressRatio(16000, DEFAULT_GOAL), 'en'), '2×');
  assert.equal(formatRatio(progressRatio(12000, DEFAULT_GOAL), 'vi'), '1,5×');
  assert.equal(formatNumber(DEFAULT_GOAL, 'en'), '8,000');
  assert.equal(formatNumber(DEFAULT_GOAL, 'vi'), '8.000');
});

test('goal reached is exact and only true for loaded snapshots', () => {
  assert.ok(goalReached({ kind: 'loaded', steps: 8000, source: 'health' }, DEFAULT_GOAL));
  assert.ok(!goalReached({ kind: 'loaded', steps: 7999, source: 'manual' }, DEFAULT_GOAL));
  assert.ok(!goalReached({ kind: 'unavailable' }, DEFAULT_GOAL));
});

test('loading, empty, unavailable, and error presentations are distinct and never imply denied permission', () => {
  const stateKeys = ['todayLoading', 'todayEmpty', 'todayError', 'stepsUnavailable'];
  for (const locale of ['en', 'vi']) {
    const copy = getCopy(locale);
    const texts = stateKeys.map((key) => copy[key]);
    assert.equal(new Set(texts).size, stateKeys.length, `${locale} state copy must be distinct`);
    for (const key of stateKeys) {
      assert.doesNotMatch(copy[key], /permission|denied|quyền|từ chối/i);
    }
  }
});

test('loaded summary exposes exact count, goal, uncapped ratio, and source to assistive tech', () => {
  const en = todayA11yLabel(
    { kind: 'loaded', steps: 12300, source: 'health' }, DEFAULT_GOAL, 'en', getCopy('en'),
  );
  assert.match(en, /12,300 steps/);
  assert.match(en, /Daily goal: 8,000 steps/);
  assert.match(en, /1\.5× of goal/);
  assert.match(en, /Goal reached!/);
  assert.match(en, /Source: Health/);
  const vi = todayA11yLabel(
    { kind: 'loaded', steps: 1000, source: 'manual' }, DEFAULT_GOAL, 'vi', getCopy('vi'),
  );
  assert.match(vi, /1\.000 bước/);
  assert.match(vi, /0,1× của mục tiêu/);
  assert.match(vi, /Source: Thủ công|Nguồn: Thủ công/);
  assert.doesNotMatch(vi, /Goal reached/);
  for (const kind of ['loading', 'empty', 'unavailable', 'error']) {
    const label = todayA11yLabel({ kind }, DEFAULT_GOAL, 'en', getCopy('en'));
    assert.match(label, /Daily goal: 8,000 steps/, `${kind} keeps the goal available`);
  }
});

test('a11y label never doubles a period in any snapshot kind or locale', () => {
  const snapshots = [
    { kind: 'loading' },
    { kind: 'empty' },
    { kind: 'unavailable' },
    { kind: 'error' },
    { kind: 'loaded', steps: 12300, source: 'health' },
  ];
  for (const locale of ['en', 'vi']) {
    for (const snapshot of snapshots) {
      const label = todayA11yLabel(snapshot, DEFAULT_GOAL, locale, getCopy(locale));
      assert.doesNotMatch(
        label, /\.\./,
        `${locale} ${snapshot.kind} label must carry one period, never two`,
      );
    }
  }
  const unavailable = todayA11yLabel({ kind: 'unavailable' }, DEFAULT_GOAL, 'en', getCopy('en'));
  assert.match(unavailable, /connected\. Daily goal: 8,000 steps\.$/);
  const loading = todayA11yLabel({ kind: 'loading' }, DEFAULT_GOAL, 'en', getCopy('en'));
  assert.doesNotMatch(loading, /…\./, 'an ellipsis slot must not gain a period after it');
});

test('mascot pack ships every frame and particle, and the registry mounts the duck', () => {
  for (const frame of [
    'duck_idle', 'duck_blink', 'duck_look', 'duck_walk_a', 'duck_walk_b',
    'duck_happy', 'duck_surprised', 'particle_heart', 'particle_star',
  ]) {
    assert.ok(
      existsSync(new URL(`../assets/mascots/duck/${frame}.png`, import.meta.url)),
      `${frame}.png must ship in the pack`,
    );
  }
  assert.match(registrySource, /id: 'duck'/);
  for (const frame of ['duck_idle', 'duck_surprised', 'particle_heart', 'particle_star']) {
    assert.match(registrySource, new RegExp(`require\\('\\.\\./assets/mascots/duck/${frame}\\.png'\\)`));
  }
});

test('PixelPet engine exits celebrate when progress falls and resets the idle face on a mood change', () => {
  // New-day reset: progress below 1 must leave celebrate (not only walk), or
  // the pet celebrates forever — the upstream fix this vendored copy carries.
  assert.match(engineSource, /mood === 'walk' \|\| mood === 'celebrate'/);
  // A mood change firing mid-blink or mid-look must not leave idle holding
  // the wrong face — the engine resets the idle frame on mood change.
  assert.match(engineSource, /setIdleFrame\('idle'\)/);
});

test('Today wires the animated pet: mood-driving progress, decorative slot, and the cheer text', () => {
  assert.match(appSource, /todayA11yLabel\(snapshot/);
  assert.match(appSource, /litSegments\(loaded\.steps, DEFAULT_GOAL\)/);
  assert.match(appSource, /copy\.sourceHealth/);
  assert.match(appSource, /copy\.sourceManual/);
  assert.match(appSource, /goalReached\(snapshot, DEFAULT_GOAL\)/);
  assert.match(appSource, /<PixelPet frames=\{pet\.frames\} particles=\{pet\.particles\} progress=\{progress\}/);
  assert.match(appSource, /Math\.min\(progressRatio\(loaded\.steps, DEFAULT_GOAL\), 1\)/,
    'today progress is capped at 1 before it reaches the mood machine');
  assert.match(appSource, /accessibilityElementsHidden/,
    'the pet slot must hide itself and its poke control from VoiceOver');
  assert.match(appSource, /copy\.goalReached/, 'the goal-reached cheer text stays in the flow');
  for (const kind of ['loading', 'empty', 'unavailable', 'error', 'loaded']) {
    assert.ok(appSource.includes(`'${kind}'`), `state ${kind} must appear in the Today presentation`);
  }
  assert.ok(appSource.includes('importantForAccessibility="no-hide-descendants"'),
    'decorative art and ring internals stay out of the screen-reader order');
});
