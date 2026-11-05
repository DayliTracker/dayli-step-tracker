import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import test from 'node:test';

// The smooth-art duck pack (issue #45): committed SVG sources under
// assets/mascots/duck/svg/ rendered by the pinned librsvg invocation
// documented in scripts/mascots/build-smooth-frames.sh. These tests pin the
// pack contract: filenames the app requires, the 480px render size, corner
// alpha (the frames stay transparent where the old pixel pack was), byte
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
const RSVG_VERSION = '2.61.0';  // pinned rasterizer: rsvg-convert -w 480 -h 480
const FRAME_SIZE = 480;
const SHEET_SIZE = 1120;  // pinned review sheet: rsvg-convert -w 1120 -h 1120

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

test('every frame and particle keeps fully transparent corners (no flattened background)', () => {
  // The sheet is excluded: it paints a cream review background on purpose.
  // Rebuild R1: the retired qlmanage rasterizer flattened these to
  // rgba(255,255,255,255) — a visible white box in-app.
  for (const name of PACK) {
    const corners = pngCorners(join(PACK_DIR.pathname, `${name}.png`));
    for (const [corner, rgba] of Object.entries(corners)) {
      assert.deepEqual(
        rgba,
        [0, 0, 0, 0],
        `${name}.png ${corner} must decode rgba(0,0,0,0) — the pack keeps the old pixel pack's transparency`,
      );
    }
  }
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
    t.skip('pinned librsvg rasterizer not found (see scripts/mascots/build-smooth-frames.sh)');
    return;
  }
  const version = execFileSync(rsvg, ['--version'], { encoding: 'utf8' }).trim();
  assert.match(
    version,
    new RegExp(`rsvg-convert version ${RSVG_VERSION.replace(/\./g, '\\.')}$`),
    `pinned rasterizer version drift: found "${version}", pin is ${RSVG_VERSION}`,
  );
  const out = mkdtempSync(join(tmpdir(), 'smooth-frames-'));
  t.after(() => rmSync(out, { recursive: true, force: true }));
  for (const name of PACK) {
    const renderedPath = join(out, `${name}.png`);
    execFileSync(
      rsvg,
      ['-w', String(FRAME_SIZE), '-h', String(FRAME_SIZE), join(SVG_DIR.pathname, `${name}.svg`), '-o', renderedPath],
      { stdio: 'ignore' },
    );
    const rendered = readFileSync(renderedPath);
    const shipped = readFileSync(join(PACK_DIR.pathname, `${name}.png`));
    assert.deepEqual(
      rendered,
      shipped,
      `${name}.png is not the byte-exact render of svg/${name}.svg — re-run scripts/mascots/build-smooth-frames.sh`,
    );
  }
});
