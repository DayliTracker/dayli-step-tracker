// QA evidence checker for issue #6 AC2/AC3: validates an `idb ui describe-all`
// dump of the running app independently of screenshots.
//
// Checks (Apple HIG + WCAG-informed):
//   1. Touch targets — every Button element renders at least `--min-target` pt
//      in BOTH axes (Apple HIG minimum 44x44; the shell's own static test
//      pins 48).
//   2. Horizontal clipping — every labelled element sits fully inside the
//      application frame horizontally (ScrollView overflow below the fold is
//      scrollable, not clipped, so vertical extent is not asserted here).
//   3. Vertical origin — nothing renders above the top of the screen.
//   4. Text overlap — no two StaticText elements overlap by more than 2pt on
//      both axes unless one contains the other (ancestor containers do).
//
// Usage: node scripts/qa-a11y-check.mjs <dump.json> [--min-target 44]
// Exit 0 = all checks pass; exit 1 = failures printed.

import { readFileSync } from 'node:fs';
import { argv, exit } from 'node:process';

const parseFrame = (element) => element.frame ?? null;

const intersects = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const contains = (outer, inner) =>
  inner.x >= outer.x - 0.5 && inner.x + inner.width <= outer.x + outer.width + 0.5 &&
  inner.y >= outer.y - 0.5 && inner.y + inner.height <= outer.y + outer.height + 0.5;

export function checkDump(elements, { minTarget = 44 } = {}) {
  const failures = [];
  const app = elements.find((element) => element.type === 'Application');
  if (!app) {
    return { ok: false, failures: ['no Application element found in dump'], stats: {} };
  }
  const screen = parseFrame(app);
  const labelled = elements.filter((element) => element.AXLabel && parseFrame(element));

  // 1. Touch targets.
  const buttons = elements.filter((element) => element.type === 'Button' && parseFrame(element));
  for (const button of buttons) {
    const { width, height } = button.frame;
    if (width < minTarget || height < minTarget) {
      failures.push(`touch target ${width}x${height} < ${minTarget}pt: "${button.AXLabel}"`);
    }
  }

  // 2. Horizontal clipping + 3. vertical origin.
  for (const element of labelled) {
    const { x, y, width, height } = element.frame;
    if (x < -0.5 || x + width > screen.width + 0.5) {
      failures.push(
        `horizontal clip: "${element.AXLabel}" x=${x.toFixed(1)} w=${width.toFixed(1)} (screen ${screen.width})`);
    }
    if (y < -0.5) {
      failures.push(`renders above screen top: "${element.AXLabel}" y=${y.toFixed(1)}`);
    }
  }

  // 4. Text overlap (sibling texts, neither containing the other).
  const texts = elements.filter((element) => element.type === 'StaticText' && parseFrame(element));
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i].frame;
      const b = texts[j].frame;
      if (!intersects(a, b) || contains(a, b) || contains(b, a)) continue;
      const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (overlapX > 2 && overlapY > 2) {
        failures.push(
          `text overlap ${overlapX.toFixed(1)}x${overlapY.toFixed(1)}pt: "${texts[i].AXLabel}" / "${texts[j].AXLabel}"`);
      }
    }
  }

  const stats = {
    screen: `${screen.width}x${screen.height}`,
    elements: elements.length,
    buttons: buttons.map((button) => `"${button.AXLabel}" ${button.frame.width.toFixed(0)}x${button.frame.height.toFixed(0)}`),
    staticTexts: texts.length,
    minTouchTarget: buttons.length
      ? Math.round(Math.min(...buttons.flatMap((button) => [button.frame.width, button.frame.height])))
      : null,
  };
  return { ok: failures.length === 0, failures, stats };
}

const isMain = argv[1] && import.meta.url.endsWith(argv[1].split('/').pop());
if (isMain) {
  const file = argv[2];
  const flag = argv.indexOf('--min-target');
  const minTarget = flag > -1 ? Number(argv[flag + 1]) : 44;
  if (!file) {
    console.error('usage: node scripts/qa-a11y-check.mjs <dump.json> [--min-target 44]');
    exit(2);
  }
  const result = checkDump(JSON.parse(readFileSync(file, 'utf8')), { minTarget });
  console.log(JSON.stringify(result.stats, null, 1));
  if (result.failures.length) {
    console.error(`FAIL ${file}\n  ${result.failures.join('\n  ')}`);
    exit(1);
  }
  console.log(`PASS ${file}`);
}
