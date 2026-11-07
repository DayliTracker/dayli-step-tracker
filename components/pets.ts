import type { PixelPetFrames, PixelPetParticles } from './PixelPet';

export type Pet = {
  id: string;
  frames: PixelPetFrames;
  particles: PixelPetParticles;
};

// require() paths must be literal strings — Metro resolves assets statically.
// Each pet carries its own pack's frames AND particles: the smooth duck keeps
// the prototype-rendered smooth star/heart, the pixel duck the engine's
// pixel-map sprites, so a switch never mixes art styles.

// The smooth duck (mascots#2) — the Gate-1-polished pack rendered by the
// vendored smooth engine (scripts/mascots/smooth-engine.mjs, pinned
// @resvg/resvg-js 2.6.2) from scripts/mascots/packs/smooth-duck.mjs, vendored
// byte-exact from DayliTracker/mascots@516a5b7. Regenerate:
//   node scripts/mascots/smooth-engine.mjs scripts/mascots/packs/smooth-duck.mjs --out assets/mascots/smooth-duck
const smoothDuckFrames: PixelPetFrames = {
  idle: require('../assets/mascots/smooth-duck/smooth-duck_idle.png'),
  blink: require('../assets/mascots/smooth-duck/smooth-duck_blink.png'),
  look: require('../assets/mascots/smooth-duck/smooth-duck_look.png'),
  walkA: require('../assets/mascots/smooth-duck/smooth-duck_walk_a.png'),
  walkB: require('../assets/mascots/smooth-duck/smooth-duck_walk_b.png'),
  happy: require('../assets/mascots/smooth-duck/smooth-duck_happy.png'),
  surprised: require('../assets/mascots/smooth-duck/smooth-duck_surprised.png'),
};

const smoothDuckParticles: PixelPetParticles = {
  star: require('../assets/mascots/smooth-duck/particle_star.png'),
  heart: require('../assets/mascots/smooth-duck/particle_heart.png'),
};

// The pixel duck — the original PixelPet pack, kept selectable as the
// fallback (mascots#2's switcher). Rendered by the vendored zero-dependency
// pixel engine from scripts/mascots/packs/duck.mjs. Regenerate:
//   node scripts/mascots/engine.mjs scripts/mascots/packs/duck.mjs --out assets/mascots/pixel-duck
const pixelDuckFrames: PixelPetFrames = {
  idle: require('../assets/mascots/pixel-duck/duck_idle.png'),
  blink: require('../assets/mascots/pixel-duck/duck_blink.png'),
  look: require('../assets/mascots/pixel-duck/duck_look.png'),
  walkA: require('../assets/mascots/pixel-duck/duck_walk_a.png'),
  walkB: require('../assets/mascots/pixel-duck/duck_walk_b.png'),
  happy: require('../assets/mascots/pixel-duck/duck_happy.png'),
  surprised: require('../assets/mascots/pixel-duck/duck_surprised.png'),
};

const pixelDuckParticles: PixelPetParticles = {
  star: require('../assets/mascots/pixel-duck/particle_star.png'),
  heart: require('../assets/mascots/pixel-duck/particle_heart.png'),
};

/**
 * The character registry the Settings switcher reads (mascots#2). The first
 * entry is the shipped default; the switcher persists an id in preferences
 * and `petForId` resolves it — an id the registry no longer knows (a pack
 * retired on a later release) falls back to the default, never to a crash.
 */
export const PETS: Pet[] = [
  {
    id: 'smooth-duck',
    frames: smoothDuckFrames,
    particles: smoothDuckParticles,
  },
  {
    id: 'pixel-duck',
    frames: pixelDuckFrames,
    particles: pixelDuckParticles,
  },
];

/** The shipped mascot: the smooth duck, Gate 1 approved (mascots#3). */
export const DEFAULT_PET_ID = PETS[0].id;

/** Resolve a stored preference to a registered pet; unknown/missing → default. */
export function petForId(petId: string | null): Pet {
  return PETS.find((pet) => pet.id === petId) ?? PETS[0];
}
