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
    ringTrack: '#E8DDCB', danger: '#8D3E34',
  });
});

test('tokens pin the approved radius, spacing, and type scales exactly', () => {
  assert.deepEqual(radius, { control: 14, tab: 15, action: 16, row: 17, card: 24 });
  assert.deepEqual(spacing, {
    hairline: 1, xs: 3, sm: 4, md: 5, lg: 8, xl: 10, xxl: 12,
    gutter: 14, section: 18, page: 20, screen: 28,
  });
  assert.deepEqual(typeSize, {
    eyebrow: 11, caption: 13, label: 14, small: 15, body: 16,
    heading: 22, title: 27, display: 40,
  });
  assert.deepEqual(typeFace, {
    display: { bold: 'Nunito_700Bold', heavy: 'Nunito_800ExtraBold' },
    text: {
      regular: 'Lexend_400Regular', semibold: 'Lexend_600SemiBold',
      bold: 'Lexend_700Bold', heavy: 'Lexend_800ExtraBold',
    },
  });
  assert.deepEqual(typeVariant, { tabularNums: ['tabular-nums'] });
  assert.deepEqual(typeLeading, { dense: 19, body: 20, relaxed: 24 });
});

test('the App style sheet keeps no literal hex colors, radii, or font families', () => {
  assert.doesNotMatch(appSource, /#[0-9a-fA-F]{6}\b/, 'colors must come from src/tokens');
  assert.doesNotMatch(appSource, /borderRadius:\s*\d/, 'radii must come from src/tokens');
  assert.doesNotMatch(appSource, /fontFamily:\s*['"]/, 'font families must come from src/tokens');
  assert.doesNotMatch(appSource, /fontVariant:\s*['"]/, 'font variants must come from src/tokens');
});
