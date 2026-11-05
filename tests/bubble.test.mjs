import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  bubbleLines, dateIdleLine, eventLine, getCopy, idleLine,
} from '../src/localization.ts';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const bubbleSource = readFileSync(new URL('../components/ChatBubble.tsx', import.meta.url), 'utf8');
const engineSource = readFileSync(new URL('../components/PixelPet.tsx', import.meta.url), 'utf8');

const CATEGORIES = [
  'cute', 'nudge', 'poke', 'walk', 'cheer', 'dizzy', 'stroll', 'lead', 'homecome',
];
const EVENT_CATEGORIES = CATEGORIES.filter((c) => c !== 'cute' && c !== 'nudge');
const IDLE_POOL = [...bubbleLines('cute', 'en'), ...bubbleLines('nudge', 'en')];

/** A fake rng with a fixed sequence, so picks are reproducible in tests. */
const fakeRandom = (sequence) => {
  let i = 0;
  return () => sequence[(i++) % sequence.length];
};

test('mascot voice pools are complete in en and vi with the prototype v4 shape', () => {
  // Pool sizes verbatim from prototype/textless-shell prototype-merged-shell.html v4.
  const expectedSizes = {
    cute: 5, nudge: 5, poke: 3, walk: 3, cheer: 3, dizzy: 1, stroll: 1, lead: 3, homecome: 3,
  };
  for (const locale of ['en', 'vi']) {
    for (const category of CATEGORIES) {
      const lines = bubbleLines(category, locale);
      assert.equal(lines.length, expectedSizes[category], `${locale} ${category} pool size`);
      for (const line of lines) {
        assert.ok(line.trim().length > 0, `${locale} ${category} lines must be non-empty`);
      }
      assert.equal(new Set(lines).size, lines.length, `${locale} ${category} must not repeat a line`);
    }
  }
  // Verbatim prototype wording survives in both languages.
  assert.ok(bubbleLines('cute', 'en').includes('quack. just quack.'));
  assert.ok(bubbleLines('cheer', 'en').includes('WE DID IT!'));
  assert.ok(bubbleLines('lead', 'vi').includes('đi hướng này!'));
  assert.ok(bubbleLines('homecome', 'vi').includes('về nhà rồi!'));
});

test('no mascot line duplicates UI copy — the bubble is the duck’s voice, not UI text', () => {
  for (const locale of ['en', 'vi']) {
    const uiCopy = new Set(Object.values(getCopy(locale)));
    for (const category of CATEGORIES) {
      for (const line of bubbleLines(category, locale)) {
        assert.ok(!uiCopy.has(line), `"${line}" (${locale} ${category}) must not duplicate UI copy`);
      }
    }
  }
});

test('the day’s first idle line is date-deterministic with no persisted state', () => {
  // Pure pick: the date key alone decides — same day, same line, forever.
  for (const locale of ['en', 'vi']) {
    const line = dateIdleLine('2026-11-06', locale);
    assert.equal(dateIdleLine('2026-11-06', locale), line);
    assert.ok(IDLE_POOL.includes(dateIdleLine('2026-11-06', 'en')),
      'the first idle line comes from the cute/nudge pools');
  }
  // Deterministic ≠ constant: different dates speak different lines.
  const acrossDays = new Set(
    Array.from({ length: 30 }, (_, i) => dateIdleLine(`2026-10-${String(i + 1).padStart(2, '0')}`, 'en')),
  );
  assert.ok(acrossDays.size > 1, 'different dates must be able to speak different lines');
});

test('idle and event picks stay inside their pools', () => {
  const rng = fakeRandom([0.1, 0.9, 0.5, 0.2, 0.8, 0.3, 0.7, 0.4, 0.6]);
  for (let i = 0; i < 20; i += 1) {
    assert.ok(IDLE_POOL.includes(idleLine('en', rng)), 'idle lines come from cute/nudge');
  }
  for (const category of EVENT_CATEGORIES) {
    const pool = bubbleLines(category, 'en');
    for (let i = 0; i < 10; i += 1) {
      assert.ok(pool.includes(eventLine(category, 'en', rng)));
    }
  }
});

test('the bubble ignores touches and stays out of the accessibility order', () => {
  assert.match(bubbleSource, /pointerEvents="none"/,
    'the talk box must never intercept a touch');
  assert.match(bubbleSource, /accessible=\{false\}/);
  assert.match(bubbleSource, /accessibilityElementsHidden/);
  assert.match(bubbleSource, /importantForAccessibility="no-hide-descendants"/);
  assert.doesNotMatch(bubbleSource, /Pressable|Touchable/,
    'the bubble is decoration — it opens no control');
});

test('the bubble docks above the duck inside the hidden pet slot', () => {
  const todaySource = appSource.slice(
    appSource.indexOf('function Today('),
    appSource.indexOf('function Progress('),
  );
  const bubbleAt = todaySource.indexOf('<ChatBubble');
  // Space-anchored: the Today props type mentions PixelPetHandle, which
  // would match the un-anchored lookup before the JSX does.
  const petAt = todaySource.indexOf('<PixelPet ');
  assert.ok(bubbleAt !== -1, 'Today renders the talk box');
  assert.ok(petAt > bubbleAt, 'the bubble sits above the pet in the slot');
  assert.match(todaySource, /style=\{s\.petSlot\}[\s\S]*<ChatBubble[\s\S]*<PixelPet/,
    'both the bubble and the pet live inside the hidden decorative slot');
});

test('the duck tap target is labeled while the slot keeps it decorative', () => {
  assert.match(engineSource, /accessibilityRole="button"/);
  assert.match(engineSource, /accessibilityLabel=\{accessibilityLabel\}/,
    'the pet’s Pressable carries the label prop');
  assert.match(appSource, /accessibilityLabel=\{copy\.petPoke\}/);
  assert.equal(getCopy('en').petPoke, 'Poke the duck');
  assert.equal(getCopy('vi').petPoke, 'Chạm vào vịt');
  // The home slot still hides itself and the poke control from VoiceOver —
  // the group label stays the screen-reader source (today.test.mjs pins this).
  assert.match(appSource, /importantForAccessibility="no-hide-descendants"/);
});

test('mascot events surface their line; the engine fires poke, walk, and celebrate', () => {
  assert.match(engineSource,
    /export type PixelPetEvent = 'poke' \| 'walk' \| 'celebrate' \| 'lead' \| 'homecome'/);
  // Poke fires from the poke handler itself.
  assert.match(engineSource, /const handlePoke = useCallback\(\(\) => \{\s*\n\s*onEventRef\.current\?\.\('poke'\)/);
  // Walk and celebrate fire once per mood entry, from an effect that keys on
  // mood — not the mood machine (tests/today.test.mjs pins that machine as
  // the first effect keyed on progress alone).
  assert.match(engineSource, /useEffect\(\(\) => \{\s*\n\s*if \(mood === 'walk' \|\| mood === 'celebrate'\) onEventRef\.current\?\.\(mood\);\s*\n\s*\}, \[mood\]\)/);
  // Today wires the hook through a bumped nonce so repeats still speak.
  const todaySource = appSource.slice(
    appSource.indexOf('function Today('),
    appSource.indexOf('function Progress('),
  );
  assert.match(todaySource, /onEvent=\{say\}/);
  assert.match(todaySource, /nonce: \(prev\?\.nonce \?\? 0\) \+ 1/);
  // Issue #42: the duck-led navigation speaks through the same hook — the
  // exit dash says a lead line, the arrival waddle a homecome greeting.
  assert.match(engineSource, /onEventRef\.current\?\.\('lead'\)/);
  assert.match(engineSource, /onEventRef\.current\?\.\('homecome'\)/);
});

test('the bubble speaks the day’s first line, then idles every ~18–25s with ~4s holds', () => {
  assert.match(bubbleSource, /const HOLD_MS = 4000;/);
  assert.match(bubbleSource, /const CHATTER_MIN_MS = 18000;/);
  assert.match(bubbleSource, /const CHATTER_VARIANCE_MS = 7000;/,
    'cadence is 18s + 0–7s → a line every ~18–25s');
  assert.match(bubbleSource, /speak\(dateIdleLine\(dateKey, locale\)\)/,
    'the first line is the date-deterministic pick');
  assert.match(bubbleSource, /speak\(idleLine\(locale\)\)/,
    'later chatter is random');
  assert.match(bubbleSource, /speak\(eventLine\(event\.category, locale\)\)/,
    'events speak their own pool');
});
