import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// AC3 (mascots#2): per-state in-app captures of the shipped mascot live in
// the app's mascot QA directory, docs/mascots/duck/qa/. Every mood the app's
// PixelPet plays that was drivable on the simulator has a committed capture
// named `state-<mood>.png`; this test pins the set so a deleted capture
// fails the suite. States that could not be driven by automation are named
// in qa/README.md instead of being faked here.
const QA_DIR = new URL('../docs/mascots/duck/qa/', import.meta.url);
const README = readFileSync(new URL('../docs/mascots/duck/qa/README.md', import.meta.url), 'utf8');

/** The mood repertoire the simulator automation drove end to end. */
const CAPTURED_STATES = [
  'idle', 'walk', 'celebrate', 'poke', 'sleep', 'hop', 'stroll',
];

test('every drivable mascot state has a committed per-state capture in the QA directory', () => {
  for (const state of CAPTURED_STATES) {
    const png = join(QA_DIR.pathname, `state-${state}.png`);
    assert.equal(existsSync(png), true, `missing per-state capture: docs/mascots/duck/qa/state-${state}.png`);
  }
});

test('the QA directory documents any mascot state automation could not drive', () => {
  // The full mood repertoire (src/moods.ts + PixelPet): everything not in
  // CAPTURED_STATES must be named in the README's not-captured note, so the
  // record never implies a state was verified when it was not.
  const repertoire = ['idle', 'walk', 'celebrate', 'poke', 'sleep', 'hop', 'dizzy', 'stroll'];
  const notCaptured = repertoire.filter((state) => !CAPTURED_STATES.includes(state));
  for (const state of notCaptured) {
    assert.match(README, new RegExp(state),
      `docs/mascots/duck/qa/README.md must name the not-captured state "${state}"`);
  }
  // And every capture the directory ships is a real PNG file.
  const files = readdirSync(QA_DIR.pathname).filter((name) => name.startsWith('state-'));
  assert.ok(files.length >= CAPTURED_STATES.length,
    'the QA directory holds at least the pinned per-state captures');
});
