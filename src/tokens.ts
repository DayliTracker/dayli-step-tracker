/**
 * Central design tokens — the single source of truth for the phase-1 visual
 * system (docs/phase-01-ux-design.md). Every color, radius, spacing step, and
 * type size in App.tsx reads from here, so Today, Progress, Settings, and the
 * tabs cannot drift apart and later phases inherit the same values.
 *
 * Values are the exact literals the approved screens render with; tokens give
 * them names, not new values. Component sizing stays beside the components
 * that own it: touch-target minHeight values (locked by tests), and the
 * ring/duck geometry constants in App.tsx and src/duck.ts.
 */

/**
 * Palette roles. Two roles may share a value (ringTrack = border today); the
 * names carry the meaning, so a re-theme can change one without the other.
 */
export const colors = {
  canvas: '#FAF3E6', // app background — Main canvas (cream)
  card: '#FFFDF8', // card and row surfaces
  border: '#E8DDCB', // hairline borders and dividers
  borderSoft: '#D8CCB9', // quieter outline on tappable input rows
  text: '#5B4634', // primary ink — Primary text (warm brown)
  textMuted: '#806A55', // secondary ink
  accent: '#C8EBDD', // mint fill on selected tabs and header actions — Primary accent
  accentSoft: '#F4FBF7', // near-white mint tint behind secondary actions
  accentText: '#326D52', // deep green text for positive actions and confirmations
  selection: '#E8F5EE', // selected-state fill (chosen language row)
  ringLit: '#5E9B7F', // lit ring segments; selected-row outline
  ringTrack: '#E8DDCB', // unlit ring segments
  danger: '#8D3E34', // destructive actions
} as const;

/** Corner radius scale (pt): control 14 → tab 15 → action 16 → row 17 → card 24. */
export const radius = {
  control: 14, // manual-entry and language rows
  tab: 15,
  action: 16, // header action button
  row: 17, // progress and settings rows
  card: 24, // hero cards
} as const;

/**
 * Spacing scale (pt). The approved screens use these steps only; the small
 * odd values (3, 4, 5) are optical corrections from the phase-1 visual pass.
 */
export const spacing = {
  hairline: 1, // divider thickness
  xs: 3, // micro optical alignment (title, subtitle nudges)
  sm: 4, // goal block vertical rhythm
  md: 5, // muted-line gap under values
  lg: 8, // inline gaps and chip padding
  xl: 10, // card and list gaps
  xxl: 12, // section padding, date margin
  gutter: 14, // row interior padding and content top inset
  section: 18, // between summary blocks
  page: 20, // screen and card padding
  screen: 28, // content bottom inset
} as const;

/** Type sizes (pt), smallest to largest — the display and body roles. */
export const typeSize = {
  eyebrow: 11,
  caption: 13,
  label: 14,
  small: 15,
  body: 16,
  heading: 22,
  title: 27,
  display: 40,
} as const;

/**
 * Type faces as the loaded Google-font files register them — one name per
 * weight file, because a weight lookup against a bare family name is
 * unreliable for statically loaded fonts. Nunito carries the display
 * headings (eyebrow, title, cheer); Lexend carries body, labels, and
 * numerals (docs/phase-01-ux-design.md, "Typography"). App.tsx passes the
 * same constants to useFonts, so a name here is a name that loads.
 */
export const typeFace = {
  display: { bold: 'Nunito_700Bold', heavy: 'Nunito_800ExtraBold' },
  text: {
    regular: 'Lexend_400Regular',
    semibold: 'Lexend_600SemiBold',
    bold: 'Lexend_700Bold',
    heavy: 'Lexend_800ExtraBold',
  },
} as const;

/** Numerals render with tabular figures so a ticking step count holds still. */
export const typeVariant = { tabularNums: ['tabular-nums'] } as const;

/** Line heights (pt) paired with the body and caption sizes. */
export const typeLeading = {
  dense: 19, // settings subtitles
  body: 20, // muted lines
  relaxed: 24, // summary and intro paragraphs
} as const;
