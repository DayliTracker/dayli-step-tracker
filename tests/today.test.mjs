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

test('PixelPet mood machine: walk plays on a rise, celebrate at the goal, both exit when progress falls', () => {
  // Extract the mood-machine effect (the first useEffect in the engine) and
  // drive it through faithful React effect semantics: effects run on mount
  // and re-run across renders when a listed dependency changes (Object.is),
  // refs persist, and a setState to the value already held bails out without
  // a re-render. Regression pin for review round 1 (R1): keying the machine
  // on `mood` re-ran it one render after it entered walk, where no fresh rise
  // was visible and the burst self-canceled straight back to idle.
  const machine = engineSource.match(/useEffect\(\(\) => \{([\s\S]*?)\}, \[([^\]]*)\]\);/);
  assert.ok(machine, 'the mood machine must be the first useEffect in PixelPet.tsx');
  const deps = machine[2].split(',').map((d) => d.trim()).filter(Boolean);
  assert.deepEqual(deps, ['progress'],
    'mood decisions come from progress transitions only; a mood dependency re-runs the machine and self-cancels walk');
  const drive = (script) => {
    let mood = script.start >= 1 ? 'celebrate' : 'idle'; // the useState initializer
    let progress = script.start;
    const prevProgress = { current: progress };
    const runEffect = () => {
      let next = null;
      new Function('progress', 'mood', 'setMood', 'prevProgress', machine[1])(
        progress, mood, (m) => { next = m; }, prevProgress,
      );
      return next;
    };
    const settle = () => {
      for (let i = 0; i < 20; i += 1) {
        const next = runEffect();
        if (next === null || next === mood) return mood;
        mood = next;
        if (!deps.includes('mood')) return mood; // mood is not a dependency: no re-run
      }
      throw new Error('mood machine never settles');
    };
    settle(); // mount pass: effects run once
    const moods = [];
    for (const step of script.then) {
      if (step === progress) { moods.push(mood); continue; } // dep held: no re-run
      progress = step;
      moods.push(settle());
    }
    return moods;
  };
  assert.deepEqual(drive({ start: 0, then: [0.5] }), ['walk'],
    'a rising progress must enter walk and hold it (R1: the burst self-canceled)');
  assert.deepEqual(drive({ start: 0, then: [0.5, 1] }), ['walk', 'celebrate'],
    'progress reaching the goal celebrates');
  assert.deepEqual(drive({ start: 0, then: [0.5, 1, 0] }), ['walk', 'celebrate', 'idle'],
    'a new-day reset must exit celebrate, or the pet celebrates forever');
  assert.deepEqual(drive({ start: 0, then: [0.4, 0.2] }), ['walk', 'idle'],
    'a falling progress exits walk too');
  assert.deepEqual(drive({ start: 1, then: [0.5] }), ['idle'],
    'a pet mounted at the goal exits celebrate when progress falls');
  assert.deepEqual(drive({ start: 0, then: [0.5, 0.5] }), ['walk', 'walk'],
    'held progress must not re-run the machine and must hold walk');
});

test('PixelPet walk bursts settle back to idle and a mood change resets the idle face', () => {
  // The WALK_MS timer is the only exit from walk after a rise; the frame-timer
  // cleanup resets the idle face so a mood change firing mid-blink or
  // mid-look cannot leave idle holding the wrong face.
  assert.match(engineSource, /setTimeout\(\(\) => setMood\('idle'\), WALK_MS\)/,
    'walk must settle back to idle on its own timer');
  assert.match(engineSource, /setIdleFrame\('idle'\)/,
    'a mood change mid-blink or mid-look must not leave idle holding the wrong face');
});

test('the mascot slot reserves headroom for the poke heart, so no pet state covers the labels', () => {
  // The engine lifts the poke heart at most 0.6 × size above the pet box
  // (PixelPet.tsx), and the Today slot reserves exactly that much headroom
  // above the pet (App.tsx). Pin both numbers: if either drifts, the heart
  // or the celebrate sparkles would draw over the step total or source label.
  assert.match(engineSource, /-size \* 0\.6/,
    'engine poke heart must rise no further than 0.6 × size above the pet box');
  assert.match(appSource, /PET_SLOT_HEADROOM = PET_SIZE \* 0\.6/,
    'slot headroom must stay at 0.6 × PET_SIZE to cover the heart rise');
  assert.match(appSource, /height: PET_SIZE \+ PET_SLOT_HEADROOM, justifyContent: 'flex-end'/,
    'the pet sits at the slot bottom with the headroom free above it');
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
