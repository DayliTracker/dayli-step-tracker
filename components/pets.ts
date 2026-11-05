import type { PixelPetFrames, PixelPetParticles } from './PixelPet';

export type Pet = {
  id: string;
  frames: PixelPetFrames;
  particles: PixelPetParticles;
};

// require() paths must be literal strings — Metro resolves assets statically.
const duckFrames: PixelPetFrames = {
  idle: require('../assets/mascots/duck/duck_idle.png'),
  blink: require('../assets/mascots/duck/duck_blink.png'),
  look: require('../assets/mascots/duck/duck_look.png'),
  walkA: require('../assets/mascots/duck/duck_walk_a.png'),
  walkB: require('../assets/mascots/duck/duck_walk_b.png'),
  happy: require('../assets/mascots/duck/duck_happy.png'),
  surprised: require('../assets/mascots/duck/duck_surprised.png'),
};

const duckParticles: PixelPetParticles = {
  star: require('../assets/mascots/duck/particle_star.png'),
  heart: require('../assets/mascots/duck/particle_heart.png'),
};

export const PETS: Pet[] = [
  {
    id: 'duck',
    frames: duckFrames,
    particles: duckParticles,
  },
];
