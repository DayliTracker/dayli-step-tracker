import { test } from 'node:test';
import assert from 'node:assert/strict';

// QA evidence for issue #6 AC3 ("contrast ... checked independently of
// screenshots"): every text/background pair actually rendered by the Phase 1
// shell (App.tsx StyleSheet, lines cited per pair), scored against WCAG 2.1 AA.
// If a pair changes in App.tsx, update the pair here in the same commit.

const hex = (value) => {
  const raw = value.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
};

const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (value) => {
  const [r, g, b] = hex(value).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (foreground, background) => {
  const l1 = luminance(foreground);
  const l2 = luminance(background);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

// Backgrounds (App.tsx:315, 326, 323, 359, 376, 383, 378-380).
const ROOT = '#FAF3E6';
const CARD = '#FFFDF8';
const HEADER_ACTION = '#C8EBDD';
const MANUAL_ACTION = '#F4FBF7';
const LANGUAGE_SELECTED = '#E8F5EE';
const TAB_SELECTED = '#C8EBDD';

// Text pairs: [name, fg, bg, minRatio, fontSizePx, bold].
// WCAG 2.1 AA: 4.5:1 normal text; 3:1 large text (>= 24px, or >= 18.66px bold).
const TEXT_PAIRS = [
  ['eyebrow on root', '#806A55', ROOT, 4.5, 11, true],
  ['title on root', '#5B4634', ROOT, 3, 27, true],
  ['header action on #C8EBDD', '#5B4634', HEADER_ACTION, 4.5, 14, true],
  // Issue #28 removed the home date line, cheer, and rendered row subtitles;
  // the hero count and the Progress ring's steps unit now sit on the root.
  ['step count on root', '#5B4634', ROOT, 3, 40, true],
  ['steps unit on root', '#806A55', ROOT, 4.5, 15, false],
  ['summary on card', '#5B4634', CARD, 4.5, 16, false],
  ['muted on card', '#806A55', CARD, 4.5, 13, false],
  ['goal on card', '#5B4634', CARD, 3, 22, true],
  ['progress intro on root', '#806A55', ROOT, 4.5, 16, false],
  ['row title on card', '#5B4634', CARD, 4.5, 16, true],
  ['row value on card', '#5B4634', CARD, 4.5, 14, true],
  ['manual action on #F4FBF7', '#326D52', MANUAL_ACTION, 4.5, 14, true],
  ['chevron icon on card (hidden from AX)', '#806A55', CARD, 4.5, 27, false],
  ['danger on card', '#8D3E34', CARD, 4.5, 16, true],
  ['disclosure on root', '#806A55', ROOT, 4.5, 13, false],
  ['tab on bar', '#806A55', CARD, 4.5, 15, false],
  ['selected tab on #C8EBDD', '#5B4634', TAB_SELECTED, 4.5, 15, true],
  ['language selected on #E8F5EE', '#326D52', LANGUAGE_SELECTED, 4.5, 13, true],
];

// Non-text (WCAG 1.4.11, 3:1): the lit ring segment is the progress state cue;
// its text equivalents (a11y label) carry the exact value too. The header gear
// is the open-settings control's glyph — the button label names it.
const NON_TEXT_PAIRS = [
  ['lit ring segment on card', '#5E9B7F', CARD, 3],
  ['gear icon on #C8EBDD (hidden from AX)', '#5B4634', HEADER_ACTION, 3],
];

test('every rendered text pair meets its WCAG 2.1 AA contrast minimum', () => {
  const results = TEXT_PAIRS.map(([name, fg, bg, min]) => {
    const ratio = contrastRatio(fg, bg);
    return { name, ratio: Math.round(ratio * 100) / 100, min };
  });
  for (const { name, ratio, min } of results) {
    assert.ok(ratio >= min, `${name}: ${ratio}:1 < ${min}:1 WCAG minimum`);
  }
});

test('lit ring segment meets the 3:1 non-text minimum on the card', () => {
  for (const [name, fg, bg, min] of NON_TEXT_PAIRS) {
    const ratio = contrastRatio(fg, bg);
    assert.ok(ratio >= min, `${name}: ${ratio}:1 < ${min}:1 non-text minimum`);
  }
});

test('every pair recorded with its ratio for the QA evidence table', () => {
  const table = TEXT_PAIRS.map(([name, fg, bg, min]) =>
    `${name}: ${Math.round(contrastRatio(fg, bg) * 100) / 100}:1 (min ${min}:1)`);
  // Snapshot printed for the evidence report; keeps the table honest.
  console.log(`contrast ratios\n${table.join('\n')}`);
});
