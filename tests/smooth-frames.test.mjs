import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

// The smooth-art duck pack (issue #45): committed SVG sources under
// assets/mascots/duck/svg/ rendered by the pinned macOS QuickLook invocation
// documented in scripts/mascots/build-smooth-frames.sh. These tests pin the
// pack contract: filenames the app requires, the 480px render size, byte
// reproducibility, and the QA evidence copy.
const PACK_DIR = new URL('../assets/mascots/duck/', import.meta.url);
const SVG_DIR = new URL('svg/', PACK_DIR);
const QA_DIR = new URL('../docs/mascots/duck/qa/', import.meta.url);
const PETS_SOURCE = readFileSync(new URL('../components/pets.ts', import.meta.url), 'utf8');

const FRAMES = [
  'duck_idle', 'duck_blink', 'duck_look', 'duck_happy',
  'duck_surprised', 'duck_walk_a', 'duck_walk_b',
];
const PARTICLES = ['particle_heart', 'particle_star'];
const PACK = [...FRAMES, ...PARTICLES];
const SHEET = 'contact_sheet';
const FRAME_SIZE = 480;   // pinned rasterizer: qlmanage -s 480
const SHEET_SIZE = 1120;  // pinned review sheet: qlmanage -s 1120

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

test('every shipped frame and particle has a committed SVG source and the pinned 480px RGBA render', () => {
  for (const name of PACK) {
    const png = join(PACK_DIR.pathname, `${name}.png`);
    const svg = join(SVG_DIR.pathname, `${name}.svg`);
    assert.equal(existsSync(svg), true, `committed SVG source missing: svg/${name}.svg`);
    assert.equal(existsSync(png), true, `shipped PNG missing: ${name}.png`);
    const info = pngInfo(png);
    assert.equal(info.width, FRAME_SIZE, `${name}.png must render at the pinned ${FRAME_SIZE}px`);
    assert.equal(info.height, FRAME_SIZE, `${name}.png must render at the pinned ${FRAME_SIZE}px`);
    assert.equal(info.colorType, 6, `${name}.png must stay RGBA (the frames carry alpha)`);
  }
  const sheet = pngInfo(join(PACK_DIR.pathname, `${SHEET}.png`));
  assert.equal(sheet.width, SHEET_SIZE, 'contact sheet must render at the pinned width');
});

test('components/pets.ts requires the pack by exactly these filenames', () => {
  for (const name of PACK) {
    assert.match(
      PETS_SOURCE,
      new RegExp(`require\\('\\.\\./assets/mascots/duck/${name}\\.png'\\)`),
      `pets.ts must require assets/mascots/duck/${name}.png by its literal filename`,
    );
  }
});

test('the QA evidence copy under docs/mascots/duck/qa matches the shipped pack byte for byte', () => {
  for (const name of [...PACK, SHEET]) {
    const shipped = readFileSync(join(PACK_DIR.pathname, `${name}.png`));
    const evidence = join(QA_DIR.pathname, `${name}.png`);
    assert.equal(existsSync(evidence), true, `QA evidence missing: docs/mascots/duck/qa/${name}.png`);
    assert.deepEqual(readFileSync(evidence), shipped, `QA copy of ${name}.png drifted from the shipped pack`);
  }
});

test('regenerating from the committed SVGs with the pinned invocation reproduces the shipped PNGs byte for byte', (t) => {
  let qlmanage;
  try {
    qlmanage = execFileSync('which', ['qlmanage'], { encoding: 'utf8' }).trim();
  } catch {
    t.skip('pinned QuickLook rasterizer is macOS-only; qlmanage not found');
    return;
  }
  const out = mkdtempSync(join(tmpdir(), 'smooth-frames-'));
  t.after(() => rmSync(out, { recursive: true, force: true }));
  for (const name of PACK) {
    execFileSync(qlmanage, ['-t', '-s', String(FRAME_SIZE), '-o', out, join(SVG_DIR.pathname, `${name}.svg`)], {
      stdio: 'ignore',
    });
    const rendered = readFileSync(join(out, `${name}.svg.png`));
    const shipped = readFileSync(join(PACK_DIR.pathname, `${name}.png`));
    assert.deepEqual(
      rendered,
      shipped,
      `${name}.png is not the byte-exact render of svg/${name}.svg — re-run scripts/mascots/build-smooth-frames.sh`,
    );
  }
});
