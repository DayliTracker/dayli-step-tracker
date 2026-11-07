import { sentenceSlot } from './a11y-text.ts';
import type { Copy, Locale } from './localization';
import { formatNumber, type TodaySnapshot } from './today.ts';

/**
 * The seven-date Progress window: today first, then the previous six dates,
 * all on device-local day boundaries. Built from local calendar parts so a
 * UTC offset can never shift which dates the screen shows.
 */
export function lastSevenLocalDates(now: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - index));
}

/** Stable local `YYYY-MM-DD` key; `toISOString()` would day-shift on UTC offsets. */
export function localDateKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Short weekday + month + day label for a Progress row, in the active locale. */
export function formatRowDate(date: Date, locale: Locale): string {
  return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

/**
 * Single screen-reader sentence for one Progress row. Mirrors the three
 * visible slots — total, goal, source — so an absent total is announced as
 * unavailable, never as a zero or any other measurement. The absent-total
 * slot stays truthful per state (issue #20): a refresh in flight says it is
 * reading, a failed refresh says so, a granted-but-empty date uses the
 * neutral no-data wording, and only a not-connected permission state gets
 * the "when step data is connected" line — no-data is never worded as a
 * denial. Slot copy arrives with its own trailing period (e.g.
 * `stepsUnavailable`), so each slot goes through the shared `sentenceSlot`
 * normalizer before joining — exactly one terminator each, and a slot
 * ending in `!`, `?` or `…` keeps its own instead of gaining a doubled one.
 */
export function progressRowA11yLabel(
  dateLabel: string, snapshot: TodaySnapshot, goal: number, locale: Locale, copy: Copy,
): string {
  const goalLine = `${copy.goal}: ${formatNumber(goal, locale)} ${copy.steps}`;
  const absentTotal = snapshot.kind === 'loading' ? copy.healthRefreshing
    : snapshot.kind === 'error' ? copy.healthRefreshFailed
    : snapshot.kind === 'empty' ? copy.noStepDataFound
    : copy.stepsUnavailable;
  const total = snapshot.kind === 'loaded'
    ? `${formatNumber(snapshot.steps, locale)} ${copy.steps}`
    : absentTotal;
  const source = snapshot.kind === 'loaded'
    ? `${copy.sourceLabel}: ${snapshot.source === 'health' ? copy.sourceHealth : copy.sourceManual}`
    : copy.sourceUnavailable;
  return [
    sentenceSlot(dateLabel), sentenceSlot(total), sentenceSlot(goalLine), sentenceSlot(source),
  ].join(' ');
}
