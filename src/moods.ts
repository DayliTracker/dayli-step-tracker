/**
 * Mood gesture tuning and the wiggle test (issue #43, prototype/textless-shell
 * v4). The component and the home shell both read these constants, so the
 * prototype's timings live in one place; the wiggle math is pure and unit
 * tested — the pan handler feeds it the drag's dx samples on release.
 */

/** Long-press the duck this long to put it to sleep (prototype v4 ~1.2s). */
export const SLEEP_PRESS_MS = 1200;
/** A sleeping duck self-wakes after this long (prototype v4 ~12s). */
export const SLEEP_WAKE_MS = 12000;
/** Hold the home background this long for a stroll — the duck, the step pill
    and the talk box never trigger it (prototype v4 ~0.7s). */
export const STROLL_HOLD_MS = 700;
/** Two taps within this window are a double-tap hop (prototype v4). */
export const DOUBLE_TAP_MS = 300;
/** Dizzy plays for this long, then the duck collects itself (prototype v4). */
export const DIZZY_MS = 1200;
/** One hop lasts this long, the heart rising through it. */
export const HOP_MS = 700;
/** The stroll crosses the screen at this pace per leg (out, across, home). */
export const STROLL_LEG_MS = 800;
/** Direction reversals that turn a horizontal drag on the duck into a wiggle. */
export const WIGGLE_FLIPS = 2;
/** A drag wider than this is a decisive swipe, never a wiggle (px). */
export const WIGGLE_MAX_DX = 140;
/** Reversals under this excursion are finger noise, not a direction change (px). */
export const WIGGLE_JITTER_PX = 8;

/**
 * True when a horizontal drag on the duck is a wiggle, not a swipe: enough
 * direction reversals while the whole excursion stays small. The home pan
 * handler runs this on release — a wiggle plays dizzy, a clean decisive
 * swipe keeps navigating (moods never trap navigation, issue #42's rule).
 */
export function isWiggle(flips: number, maxAbsDx: number): boolean {
  return flips >= WIGGLE_FLIPS && maxAbsDx <= WIGGLE_MAX_DX;
}

/**
 * Direction reversals in a drag's dx samples, ignoring excursions under
 * `jitter` px so a trembling finger never counts as a direction change.
 */
export function countFlips(
  samples: readonly number[],
  jitter: number = WIGGLE_JITTER_PX,
): number {
  let flips = 0;
  let lastSign = 0;
  for (const dx of samples) {
    if (Math.abs(dx) < jitter) continue;
    const sign = Math.sign(dx);
    if (lastSign !== 0 && sign !== lastSign) flips += 1;
    lastSign = sign;
  }
  return flips;
}
