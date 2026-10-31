import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getCopy } from '../src/localization.ts';
import {
  DEFAULT_GOAL, RING_SEGMENTS, formatNumber, formatRatio, goalReached, litSegments,
  progressRatio, segmentAngle, todayA11yLabel,
} from '../src/today.ts';
import { DUCK_CHEER, DUCK_IDLE, DUCK_PALETTE, DUCK_SIZE } from '../src/duck.ts';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

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

test('duck artwork is complete, palette-bound, and changes pose on goal reach', () => {
  for (const art of [DUCK_IDLE, DUCK_CHEER]) {
    assert.equal(art.length, DUCK_SIZE);
    for (const row of art) {
      assert.equal(row.length, DUCK_SIZE);
      for (const pixel of row) {
        assert.ok(pixel === '.' || pixel in DUCK_PALETTE, `unknown pixel '${pixel}'`);
      }
    }
  }
  assert.notEqual(DUCK_IDLE.join(''), DUCK_CHEER.join(''));
});

test('Today wires every state, the ring fill, the source, and the character art', () => {
  assert.match(appSource, /todayA11yLabel\(snapshot/);
  assert.match(appSource, /litSegments\(loaded\.steps, DEFAULT_GOAL\)/);
  assert.match(appSource, /copy\.sourceHealth/);
  assert.match(appSource, /copy\.sourceManual/);
  assert.match(appSource, /goalReached\(snapshot, DEFAULT_GOAL\)/);
  assert.match(appSource, /cheer \? DUCK_CHEER : DUCK_IDLE/);
  for (const kind of ['loading', 'empty', 'unavailable', 'error', 'loaded']) {
    assert.ok(appSource.includes(`'${kind}'`), `state ${kind} must appear in the Today presentation`);
  }
  assert.ok(appSource.includes('importantForAccessibility="no-hide-descendants"'),
    'decorative art and ring internals stay out of the screen-reader order');
});
