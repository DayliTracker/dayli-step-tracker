import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import test from 'node:test';

// The smooth-art duck pack (mascots#2): the prototype-matched pack vendored
// byte-exact from DayliTracker/mascots@0459293 (the tween-cycles + manifest
// v2 lineage — scripts/mascots/packs/smooth-duck.mjs), rendered by the
// vendored smooth engine (scripts/mascots/smooth-engine.mjs) through the
// exact-pinned build-time rasterizer @resvg/resvg-js 2.6.2 into
// assets/mascots/smooth-duck/. These tests pin the pack contract: filenames
// the app requires (the seven frames AND the walk cycle's eight tween
// in-betweens the component plays, mascots#19/#20), the 512px engine canvas,
// corner alpha (the contract the retired qlmanage rasterizer broke on the
// #45 pack), the engine manifest v2, the validator PASS — the ticket's AC2 —
// and the librsvg-rendered particles, which still come from committed SVG
// sources.
const PACK_DIR = new URL('../assets/mascots/smooth-duck/', import.meta.url);
const SVG_DIR = new URL('svg/', PACK_DIR);
const PETS_SOURCE = readFileSync(new URL('../components/pets.ts', import.meta.url), 'utf8');

const FRAMES = [
  'smooth-duck_idle', 'smooth-duck_blink', 'smooth-duck_look',
  'smooth-duck_walk_a', 'smooth-duck_walk_b', 'smooth-duck_happy',
  'smooth-duck_surprised',
];
const CYCLES = [
  'smooth-duck_walk_000', 'smooth-duck_walk_001', 'smooth-duck_walk_002',
  'smooth-duck_walk_003', 'smooth-duck_walk_004', 'smooth-duck_walk_005',
  'smooth-duck_walk_006', 'smooth-duck_walk_007',
];
const PARTICLES = ['particle_heart', 'particle_star'];
const PACK = [...FRAMES, ...CYCLES, ...PARTICLES];
const CANVAS = 512;        // the engine pack's square frame canvas
const PARTICLE_SIZE = 480; // the SVG-rendered sprites stay at the old pin
const RESVG_VERSION = '2.6.2';
const RSVG_VERSION = '2.61.0';

function pngInfo(url) {
  const png = readFileSync(url);
  assert.equal(png.readUInt32BE(0) >>> 0, 0x89504e47, 'PNG signature expected');
  assert.equal(png.readUInt32BE(12) >>> 0, 0x49484452, 'IHDR chunk expected');
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    colorType: png.readUInt8(25),
  };
}

// Minimal PNG corner decoder for the pack's pinned layout (8-bit RGBA,
// non-interlaced): inflates the IDAT stream, unfilters every scanline, and
// returns the four corner pixels as [r,g,b,a] so the alpha contract is
// checked where it regressed — at the borders, behind the duck.
function pngCorners(url) {
  const png = readFileSync(url);
  let pos = 8;
  const idat = [];
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  while (pos < png.length) {
    const length = png.readUInt32BE(pos);
    const type = png.toString('ascii', pos + 4, pos + 8);
    const data = png.subarray(pos + 8, pos + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + length;
  }
  assert.equal(bitDepth, 8, `${url} must be 8-bit`);
  assert.equal(colorType, 6, `${url} must be RGBA`);
  assert.equal(interlace, 0, `${url} must not be interlaced`);
  const bpp = 4;
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  assert.equal(raw.length, (stride + 1) * height, `${url}: unexpected IDAT size`);
  const out = Buffer.alloc(stride * height);
  let p = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[p];
    p += 1;
    out.set(raw.subarray(p, p + stride), y * stride);
    p += stride;
    if (filter === 0) continue;
    for (let x = 0; x < stride; x += 1) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = y > 0 && x >= bpp ? out[(y - 1) * stride + x - bpp] : 0;
      if (filter === 1) {
        out[y * stride + x] = (out[y * stride + x] + a) & 0xff;
      } else if (filter === 2) {
        out[y * stride + x] = (out[y * stride + x] + b) & 0xff;
      } else if (filter === 3) {
        out[y * stride + x] = (out[y * stride + x] + ((a + b) >> 1)) & 0xff;
      } else if (filter === 4) {
        const pr = a + b - c;
        const pa = Math.abs(pr - a);
        const pb = Math.abs(pr - b);
        const pc = Math.abs(pr - c);
        const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        out[y * stride + x] = (out[y * stride + x] + pred) & 0xff;
      } else {
        assert.fail(`${url}: unknown PNG filter type ${filter}`);
      }
    }
  }
  const px = (x, y) => {
    const o = y * stride + x * bpp;
    return [out[o], out[o + 1], out[o + 2], out[o + 3]];
  };
  return {
    topLeft: px(0, 0),
    topRight: px(width - 1, 0),
    bottomLeft: px(0, height - 1),
    bottomRight: px(width - 1, height - 1),
  };
}

test('every shipped frame renders at the engine canvas and every particle at the pinned sprite size, all RGBA', () => {
  for (const name of FRAMES) {
    const png = join(PACK_DIR.pathname, `${name}.png`);
    assert.equal(existsSync(png), true, `shipped PNG missing: ${name}.png`);
    const info = pngInfo(png);
    assert.equal(info.width, CANVAS, `${name}.png must render at the engine's ${CANVAS}px canvas`);
    assert.equal(info.height, CANVAS, `${name}.png must render at the engine's ${CANVAS}px canvas`);
    assert.equal(info.colorType, 6, `${name}.png must stay RGBA (the frames carry alpha)`);
  }
  for (const name of PARTICLES) {
    const png = join(PACK_DIR.pathname, `${name}.png`);
    assert.equal(existsSync(png), true, `shipped sprite missing: ${name}.png`);
    const info = pngInfo(png);
    assert.equal(info.width, PARTICLE_SIZE, `${name}.png stays at the pinned ${PARTICLE_SIZE}px`);
    assert.equal(info.height, PARTICLE_SIZE, `${name}.png stays at the pinned ${PARTICLE_SIZE}px`);
    assert.equal(info.colorType, 6, `${name}.png must stay RGBA`);
  }
  assert.equal(existsSync(join(PACK_DIR.pathname, 'contact_sheet.png')), true,
    'the engine contact sheet must ship with the pack');
  assert.equal(existsSync(join(PACK_DIR.pathname, 'manifest.json')), true,
    'the engine manifest must ship with the pack');
});

test('every frame and particle keeps fully transparent corners (no flattened background)', () => {
  // The sheet is excluded: it paints a cream review background on purpose.
  // The #45 regression this pins: the retired qlmanage rasterizer flattened
  // corners to rgba(255,255,255,255) — a visible white box in-app.
  for (const name of PACK) {
    const corners = pngCorners(join(PACK_DIR.pathname, `${name}.png`));
    for (const [corner, rgba] of Object.entries(corners)) {
      assert.deepEqual(
        rgba,
        [0, 0, 0, 0],
        `${name}.png ${corner} must decode rgba(0,0,0,0) — the pack keeps the corner transparency`,
      );
    }
  }
});

test('the engine manifest names the pack, the canvas, every frame in pack order, and the pinned rasterizer', () => {
  const manifest = JSON.parse(readFileSync(join(PACK_DIR.pathname, 'manifest.json'), 'utf8'));
  assert.equal(manifest.pack, 'smooth-duck');
  assert.equal(manifest.art, 'smooth');
  assert.equal(manifest.canvas, CANVAS);
  assert.deepEqual(manifest.frames.map((frame) => frame.name),
    ['idle', 'blink', 'look', 'walk_a', 'walk_b', 'happy', 'surprised'],
    'the manifest lists the frames in pack order');
  for (const frame of manifest.frames) {
    assert.equal(frame.width, CANVAS);
    assert.equal(frame.height, CANVAS);
    assert.equal(existsSync(join(PACK_DIR.pathname, frame.file)), true,
      `manifest frame file missing: ${frame.file}`);
  }
  assert.deepEqual(manifest.rasterizer, { name: '@resvg/resvg-js', version: RESVG_VERSION },
    'the manifest must pin the rasterizer version');
});

test('the manifest is v2: the walk cycle ships at its manifest fps in engine order', () => {
  const manifest = JSON.parse(readFileSync(join(PACK_DIR.pathname, 'manifest.json'), 'utf8'));
  assert.equal(manifest.version, 2, 'the manifest must be v2 (the pack declares cycles)');
  assert.ok(manifest.cycles, 'the manifest must carry the cycles block');
  const walk = manifest.cycles.walk;
  assert.equal(walk.fps, 10, 'the walk cycle plays at the manifest fps 10');
  assert.equal(walk.loop, true, 'the walk cycle loops');
  assert.equal(walk.frames.length, 8, '2 keys × 4 steps = 8 walk in-betweens');
  for (const entry of walk.frames) {
    assert.equal(entry.width, CANVAS);
    assert.equal(entry.height, CANVAS);
    assert.equal(existsSync(join(PACK_DIR.pathname, entry.file)), true,
      `manifest cycle file missing: ${entry.file}`);
  }
});

test('components/pets.ts requires the pack by exactly these filenames', () => {
  for (const name of PACK) {
    assert.match(
      PETS_SOURCE,
      new RegExp(`require\\('\\.\\./assets/mascots/smooth-duck/${name}\\.png'\\)`),
      `pets.ts must require assets/mascots/smooth-duck/${name}.png by its literal filename`,
    );
  }
  // The walk cycle's playback order is the pets.ts literal order (mascots#20):
  // the component plays cycles.walk.frames in array order at the manifest fps.
  const order = [...PETS_SOURCE.matchAll(/smooth-duck_walk_(\d{3})\.png/g)].map((m) => m[1]);
  assert.deepEqual(order, ['000', '001', '002', '003', '004', '005', '006', '007'],
    'pets.ts must list the walk cycle samples in manifest order');
});

test('the vendored smooth validator PASSES on the shipped pack (files, alpha, registration, determinism)', () => {
  // AC2 (mascots#2). The validator re-renders the pack and byte-compares —
  // its determinism gate IS the regeneration contract, so one run here pins
  // alpha-in-silhouette, registration, and byte-for-byte reproducibility.
  const out = execFileSync('node', [
    'scripts/mascots/validate-smooth-frames.mjs',
    'scripts/mascots/packs/smooth-duck.mjs',
    '--out', 'assets/mascots/smooth-duck',
  ], { encoding: 'utf8', cwd: new URL('..', import.meta.url).pathname });
  assert.match(out, /PASS — 0 problem/, 'the smooth validator must pass with zero problems');
});

test('regenerating the particles from the committed SVGs with the pinned librsvg reproduces them byte for byte', (t) => {
  let rsvg = '';
  try {
    rsvg = execFileSync('which', ['rsvg-convert'], { encoding: 'utf8' }).trim();
  } catch {
    rsvg = '';
  }
  if (!rsvg && existsSync('/opt/homebrew/bin/rsvg-convert')) {
    rsvg = '/opt/homebrew/bin/rsvg-convert';
  }
  if (!rsvg) {
    t.skip('pinned librsvg rasterizer not found (see scripts/mascots/build-smooth-particles.sh)');
    return;
  }
  const version = execFileSync(rsvg, ['--version'], { encoding: 'utf8' }).trim();
  assert.match(
    version,
    new RegExp(`rsvg-convert version ${RSVG_VERSION.replace(/\./g, '\\.')}$`),
    `pinned rasterizer version drift: found "${version}", pin is ${RSVG_VERSION}`,
  );
  const out = mkdtempSync(join(tmpdir(), 'smooth-particles-'));
  t.after(() => rmSync(out, { recursive: true, force: true }));
  for (const name of PARTICLES) {
    const renderedPath = join(out, `${name}.png`);
    execFileSync(
      rsvg,
      ['-w', String(PARTICLE_SIZE), '-h', String(PARTICLE_SIZE),
        join(SVG_DIR.pathname, `${name}.svg`), '-o', renderedPath],
      { stdio: 'ignore' },
    );
    const rendered = readFileSync(renderedPath);
    const shipped = readFileSync(join(PACK_DIR.pathname, `${name}.png`));
    assert.deepEqual(
      rendered,
      shipped,
      `${name}.png is not the byte-exact render of svg/${name}.svg — re-run scripts/mascots/build-smooth-particles.sh`,
    );
  }
});
