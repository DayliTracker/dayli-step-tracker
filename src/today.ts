import type { Copy, Locale } from './localization';

export const DEFAULT_GOAL = 8000;
export const RING_SEGMENTS = 48;

export type StepSource = 'health' | 'manual';

/**
 * Presentation snapshot for Today. Phase 1 has no data owner, so the shell
 * passes `unavailable`; Phases 2-3 pass real values through the same shape.
 */
export type TodaySnapshot =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'loaded'; steps: number; source: StepSource };

export function clampRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0;
  return Math.max(0, Math.min(1, ratio));
}

/** Uncapped steps/goal ratio; text and screen readers keep values above 1×. */
export function progressRatio(steps: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.max(0, steps) / goal;
}

/**
 * Lit ring segments, filling clockwise from 12 o'clock. The ring is the
 * visual only: it never shows full before the goal and caps at the goal.
 */
export function litSegments(steps: number, goal: number): number {
  if (goal <= 0 || steps <= 0) return 0;
  const ratio = clampRatio(progressRatio(steps, goal));
  if (ratio >= 1) return RING_SEGMENTS;
  return Math.min(RING_SEGMENTS - 1, Math.round(ratio * RING_SEGMENTS));
}

export function formatNumber(value: number, locale: Locale): string {
  return value.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US');
}

export function formatRatio(ratio: number, locale: Locale): string {
  const rounded = Math.round(ratio * 10) / 10;
  const text = Number.isInteger(rounded)
    ? formatNumber(rounded, locale)
    : rounded.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
        minimumFractionDigits: 1, maximumFractionDigits: 1,
      });
  return `${text}×`;
}

/** Ring segment angle in degrees clockwise from 12 o'clock. */
export function segmentAngle(index: number): number {
  return (360 / RING_SEGMENTS) * index;
}

export function goalReached(snapshot: TodaySnapshot, goal: number): boolean {
  return snapshot.kind === 'loaded' && snapshot.steps >= goal;
}

/**
 * Single screen-reader description for the Today summary. Carries the exact
 * count, goal, uncapped ratio, goal-reached flag, and source, so the ring's
 * color and fill are never the only status cue. Slot copy often arrives with
 * its own trailing period (e.g. `stepsUnavailable`), so every slot is
 * normalized to exactly one sentence terminator before joining — never a
 * doubled period for screen readers.
 */
export function todayA11yLabel(
  snapshot: TodaySnapshot, goal: number, locale: Locale, copy: Copy,
): string {
  const goalLine = `${copy.goal}: ${formatNumber(goal, locale)} ${copy.steps}`;
  const sentence = (slot: string) => {
    const trimmed = slot.replace(/\.+$/u, '');
    return /[!?…]$/u.test(trimmed) ? trimmed : `${trimmed}.`;
  };
  switch (snapshot.kind) {
    case 'loading':
      return `${sentence(copy.todayLoading)} ${sentence(goalLine)}`;
    case 'empty':
      return `${sentence(copy.todayEmpty)} ${sentence(goalLine)}`;
    case 'unavailable':
      return `${sentence(copy.stepsUnavailable)} ${sentence(goalLine)}`;
    case 'error':
      return `${sentence(copy.todayError)} ${sentence(goalLine)}`;
    case 'loaded': {
      const source = snapshot.source === 'health' ? copy.sourceHealth : copy.sourceManual;
      return [
        `${formatNumber(snapshot.steps, locale)} ${copy.steps}`,
        goalLine,
        `${formatRatio(progressRatio(snapshot.steps, goal), locale)} ${copy.ratioOfGoal}`,
        goalReached(snapshot, goal) ? copy.goalReached : '',
        `${copy.sourceLabel}: ${source}`,
      ].filter(Boolean).map(sentence).join(' ');
    }
  }
}
