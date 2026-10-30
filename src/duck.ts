/**
 * Original pixel-art duck artwork for Dayli, defined as code.
 *
 * The maps are hand-authored for this app (no reference-site assets, no
 * binary deps). Rendering swaps the frame map, so later phases can animate
 * or add poses without touching unrelated assets.
 */

export const DUCK_SIZE = 16;

export const DUCK_PALETTE: Record<string, string> = {
  o: '#5B4634', // outline, warm brown
  y: '#F9D65C', // body yellow
  d: '#E3B23F', // body shade
  w: '#FFFFFF', // eye white
  k: '#3B2F23', // eye / pupil dark
  b: '#F49E4C', // beak
  B: '#D97F33', // beak shade
  c: '#F2B8A2', // cheek blush
  s: '#5E9B7F', // celebration sparkle, deep mint
};

/** Idle pose. */
export const DUCK_IDLE: string[] = [
  '................',
  '................',
  '.........ooo....',
  '........oyyyyo..',
  '.......oyywkyyo.',
  '.......oyyyyyyo.',
  '.......ocyyyyo..',
  '.......oyyybbbo.',
  '..o.....oyyBo...',
  '.oyo...oyyyyyo..',
  '.oyyooyyyyyyyo..',
  '..oyydyyyyddyo..',
  '..oyyddyyddyyo..',
  '..oyyyyyyyyyyo..',
  '...oooooooooo...',
  '................',
];

/** Goal-reached pose: happy squint, raised wing, sparkles. */
export const DUCK_CHEER: string[] = [
  '................',
  '.....s..........',
  '.........ooo....',
  '........oyyyyo.s',
  '.......oyykkyyo.',
  '.......oyyyyyyo.',
  '.......ocyyyyo..',
  '.......oyyybbbo.',
  '..o.....oyyBo...',
  '.oyo...oyyyyyo..',
  '.oyyoddyyyyyyo..',
  '..oyydyyyyddyo..',
  '..oyyddyyddyyo..',
  '..oyyyyyyyyyyo..',
  '...oooooooooo...',
  '................',
];
