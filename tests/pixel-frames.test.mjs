import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// The pixel duck (mascots#2's switchable fallback): the original PixelPet
// pack, rendered by the vendored zero-dependency pixel engine
// (scripts/mascots/engine.mjs from scripts/mascots/packs/duck.mjs) into
// assets/mascots/pixel-duck/. The pack source is byte-identical to
// DayliTracker/mascots@516a5b7's skills/mascot/scripts/packs/duck.mjs. These
// tests pin the fallback contract: the validator PASS, the filenames
// components/pets.ts requires, and the registry shape (the smooth duck ships
// first as the default; the pixel duck resolves from a stored preference).
const PACK_DIR = new URL('../assets/mascots/pixel-duck/', import.meta.url);
const PETS_SOURCE = readFileSync(new URL('../components/pets.ts', import.meta.url), 'utf8');

const FRAMES = [
  'duck_idle', 'duck_blink', 'duck_look', 'duck_walk_a', 'duck_walk_b',
  'duck_happy', 'duck_surprised',
];
const PARTICLES = ['particle_heart', 'particle_star'];

test('the pixel validator PASSES on the shipped fallback pack (palette, silhouette, registration, determinism)', () => {
  const out = execFileSync('node', [
    'scripts/mascots/validate-frames.mjs',
    'scripts/mascots/packs/duck.mjs',
    '--out', 'assets/mascots/pixel-duck',
  ], { encoding: 'utf8', cwd: new URL('..', import.meta.url).pathname });
  assert.match(out, /PASS — 0 problem/, 'the pixel validator must pass with zero problems');
});

test('every fallback frame and particle ships, and pets.ts requires them by literal filename', () => {
  for (const name of [...FRAMES, ...PARTICLES]) {
    const png = join(PACK_DIR.pathname, `${name}.png`);
    assert.equal(existsSync(png), true, `fallback PNG missing: pixel-duck/${name}.png`);
    assert.match(
      PETS_SOURCE,
      new RegExp(`require\\('\\.\\./assets/mascots/pixel-duck/${name}\\.png'\\)`),
      `pets.ts must require assets/mascots/pixel-duck/${name}.png by its literal filename`,
    );
  }
  assert.equal(existsSync(join(PACK_DIR.pathname, 'contact_sheet.png')), true,
    'the pixel engine contact sheet must ship with the fallback pack');
});

test('the registry ships the smooth duck first (default) and keeps the pixel duck selectable', () => {
  const ids = [...PETS_SOURCE.matchAll(/id: '([a-z-]+)'/g)].map((match) => match[1]);
  assert.deepEqual(ids, ['smooth-duck', 'pixel-duck'],
    'PETS[0] is the shipped default — the smooth duck, Gate 1 approved (mascots#3)');
  assert.match(PETS_SOURCE, /export const DEFAULT_PET_ID = PETS\[0\]\.id;/);
  // An id the registry no longer knows falls back to the default, never a crash.
  assert.match(PETS_SOURCE, /PETS\.find\(\(pet\) => pet\.id === petId\) \?\? PETS\[0\]/);
});
