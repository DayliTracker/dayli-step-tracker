import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { sentenceSlot } from '../src/a11y-text.ts';

const todaySource = readFileSync(new URL('../src/today.ts', import.meta.url), 'utf8');
const progressSource = readFileSync(new URL('../src/progress.ts', import.meta.url), 'utf8');

test('sentenceSlot ends every slot with exactly one terminator', () => {
  assert.equal(sentenceSlot('No steps recorded yet today.'), 'No steps recorded yet today.');
  assert.equal(sentenceSlot('No steps recorded yet today..'), 'No steps recorded yet today.');
  assert.equal(sentenceSlot('12,300 steps'), '12,300 steps.');
  assert.equal(sentenceSlot('Daily goal: 8,000 steps'), 'Daily goal: 8,000 steps.');
  assert.equal(sentenceSlot(''), '.', 'an empty slot still carries exactly one terminator');
});

test('a slot ending in !, ? or … keeps its own terminator and gains none', () => {
  assert.equal(sentenceSlot('Goal reached!'), 'Goal reached!');
  assert.equal(sentenceSlot('Clear app data?'), 'Clear app data?');
  assert.equal(sentenceSlot('Loading today’s steps…'), 'Loading today’s steps…');
  assert.doesNotMatch(sentenceSlot('Goal reached!'), /[!?…]\./, 'no period after a kept !');
  assert.doesNotMatch(sentenceSlot('Clear app data?'), /[!?…]\./, 'no period after a kept ?');
  assert.doesNotMatch(sentenceSlot('Loading today’s steps…'), /[!?…]\./, 'no period after a kept …');
});

test('exactly one sentence normalizer exists and both label builders import it', () => {
  for (const [name, source] of [['src/today.ts', todaySource], ['src/progress.ts', progressSource]]) {
    assert.match(
      source, /import \{ sentenceSlot \} from '\.\/a11y-text\.ts';/,
      `${name} must import the shared normalizer`,
    );
    assert.doesNotMatch(
      source, /const sentence =/,
      `${name} must not keep a private sentence copy`,
    );
  }
});
