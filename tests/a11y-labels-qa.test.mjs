import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { getCopy } from '../src/localization.ts';
import { DEFAULT_GOAL, todayA11yLabel } from '../src/today.ts';
import { sentenceSlot } from '../src/a11y-text.ts';

// QA test-gap pass for issue #27 — edges the builder suite did not pin.
// Mutation-verified red-first: reverting sentenceSlot to the old always-append
// variant turns the first two tests red (`Goal reached!.` reappears in the
// Today summary); reintroducing a private `replace(/\.+$…` copy in any other
// src file turns the last test red. Both mutations were run and reverted.

test('QA: no Today summary ever places a period after a kept !, ? or … terminator', () => {
  const snapshots = [
    { kind: 'loading' },
    { kind: 'empty' },
    { kind: 'unavailable' },
    { kind: 'error' },
    { kind: 'loaded', steps: 12300, source: 'health' },
    { kind: 'loaded', steps: 8000, source: 'health' },
    { kind: 'loaded', steps: 16000, source: 'manual' },
  ];
  for (const locale of ['en', 'vi']) {
    for (const snapshot of snapshots) {
      const label = todayA11yLabel(snapshot, DEFAULT_GOAL, locale, getCopy(locale));
      assert.doesNotMatch(
        label, /[!?…]\./,
        `${locale} ${snapshot.kind}: a kept terminator never gains a period`,
      );
    }
  }
});

test('QA: goal-reached slot keeps its own ! in the Today summary in both locales', () => {
  const en = todayA11yLabel(
    { kind: 'loaded', steps: 8000, source: 'health' }, DEFAULT_GOAL, 'en', getCopy('en'),
  );
  assert.match(en, /Goal reached! Source: Health\.$/);
  const vi = todayA11yLabel(
    { kind: 'loaded', steps: 8000, source: 'health' }, DEFAULT_GOAL, 'vi', getCopy('vi'),
  );
  assert.match(vi, /Hoàn thành mục tiêu! Nguồn: Sức khỏe\.$/);
});

test('QA: a terminator already trailed by periods still collapses to the kept terminator', () => {
  assert.equal(sentenceSlot('Goal reached!.'), 'Goal reached!');
  assert.equal(sentenceSlot('Clear app data?.'), 'Clear app data?');
  assert.equal(sentenceSlot('Loading today’s steps….'), 'Loading today’s steps…');
});

test('QA: src/a11y-text.ts stays the only period-strip normalizer in the whole src tree', () => {
  const srcDir = new URL('../src/', import.meta.url);
  const offenders = readdirSync(srcDir)
    .filter((name) => name.endsWith('.ts') && name !== 'a11y-text.ts')
    .filter((name) => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8')
      .includes('replace(/\\.+$'));
  assert.deepEqual(
    offenders, [],
    'a second sentence normalizer re-creates the divergent-copy defect this card fixed',
  );
});
