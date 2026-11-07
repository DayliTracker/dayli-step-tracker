import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { colors, radius, spacing, typeFace, typeLeading, typeSize, typeVariant } from '../src/tokens.ts';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

test('tokens pin the approved palette values exactly', () => {
  assert.deepEqual(colors, {
    canvas: '#FAF3E6', card: '#FFFDF8', border: '#E8DDCB', borderSoft: '#D8CCB9',
    text: '#5B4634', textMuted: '#806A55', accent: '#C8EBDD', accentSoft: '#F4FBF7',
    accentText: '#326D52', selection: '#E8F5EE', ringLit: '#5E9B7F',
    ringTrack: '#E8DDCB', danger: '#8D3E34', overlayDim: '#00000047',
    // The stepper popup surface (prototype/textless-shell v6 .editor:
    // rgba(250,243,230,.98)) — canvas at .98.
    popup: 'rgba(250, 243, 230, 0.98)',
  });
});

test('tokens pin the approved radius, spacing, and type scales exactly', () => {
  // popup 18 joins the scale as the stepper popup card's corner
  // (prototype .editor border-radius).
  assert.deepEqual(radius, { control: 14, tab: 15, action: 16, row: 17, popup: 18, card: 24 });
  assert.deepEqual(spacing, {
    hairline: 1, xs: 3, sm: 4, md: 5,
    // The talk box's 7px optical step joins the scale from the prototype
    // (.bubble padding: 7px 12px) so the component consumes a token.
    optical7: 7, lg: 8, xl: 10, xxl: 12,
    gutter: 14, section: 18, page: 20, screen: 28,
  });
  // The popup roles join the type scale from prototype v6: .alert-title 17,
  // .step-btn glyph 26, .editor-count 32.
  assert.deepEqual(typeSize, {
    eyebrow: 11, caption: 13, label: 14, small: 15, body: 16, alertTitle: 17,
    heading: 22, stepGlyph: 26, title: 27, alertCount: 32, display: 40,
  });
  assert.deepEqual(typeFace, {
    display: { bold: 'Nunito_700Bold', heavy: 'Nunito_800ExtraBold' },
    text: {
      regular: 'Lexend_400Regular', semibold: 'Lexend_600SemiBold',
      bold: 'Lexend_700Bold', heavy: 'Lexend_800ExtraBold',
    },
  });
  assert.deepEqual(typeVariant, { tabularNums: ['tabular-nums'] });
  // dense is the talk box's line height now (prototype .bubble: 13px/1.35);
  // the title-only settings rows no longer render subtitles.
  assert.deepEqual(typeLeading, { dense: 17.6, body: 20, relaxed: 24 });
});

test('the App style sheet keeps no literal hex colors, radii, or font families', () => {
  assert.doesNotMatch(appSource, /#[0-9a-fA-F]{6}\b/, 'colors must come from src/tokens');
  assert.doesNotMatch(appSource, /borderRadius:\s*\d/, 'radii must come from src/tokens');
  assert.doesNotMatch(appSource, /fontFamily:\s*['"]/, 'font families must come from src/tokens');
  assert.doesNotMatch(appSource, /fontVariant:\s*['"]/, 'font variants must come from src/tokens');
});
