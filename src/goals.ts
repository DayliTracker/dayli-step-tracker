import type { StorageBackend, StorageResult } from './preferences';
import { DEFAULT_GOAL } from './today.ts';

/**
 * Goal history — the phase-2 goal record. The goal that applies to each local
 * date is stored under that date's `YYYY-MM-DD` key: a change writes today's
 * entry only, so a past date's goal is never rewritten. Dates without an
 * entry carry the latest earlier change forward, or the product default.
 */
export const GOALS_KEY = 'dayli.goals.v1';
export const MIN_GOAL = 1;
export const MAX_GOAL = 100000;

export type GoalHistory = { goals: Record<string, number> };

export const DEFAULT_GOAL_HISTORY: GoalHistory = { goals: {} };

/**
 * Whole-number goal between 1 and 100,000 inclusive (phase-02 spec). Guards
 * both stored values and the values reached from user input.
 */
export function isValidGoal(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value)
    && value >= MIN_GOAL && value <= MAX_GOAL
  );
}

export type GoalValidation =
  | { kind: 'ok'; value: number }
  | { kind: 'error'; reason: 'blank' | 'malformed' | 'out-of-range' };

/**
 * Validate raw goal input from the text field. Only plain digits parse —
 * blank, fractional (`8000.5`), grouped (`8,000`), signed (`-1`), exponential
 * (`1e4`) and other malformed text are rejected before any range check, so an
 * invalid submission never reaches the saved goal.
 */
export function parseGoalInput(raw: string | null | undefined): GoalValidation {
  if (raw === null || raw === undefined) return { kind: 'error', reason: 'blank' };
  const text = raw.trim();
  if (!text) return { kind: 'error', reason: 'blank' };
  if (!/^\d+$/.test(text)) return { kind: 'error', reason: 'malformed' };
  const value = Number(text);
  if (!isValidGoal(value)) return { kind: 'error', reason: 'out-of-range' };
  return { kind: 'ok', value };
}

/**
 * The goal that applies to a date: its own recorded change, else the latest
 * change on an earlier date (the goal carries forward), else the default.
 * Changes made after the date never apply — history is not rewritten.
 */
export function goalForDate(history: GoalHistory, dateKey: string): number {
  const own = history.goals[dateKey];
  if (isValidGoal(own)) return own;
  let latest: string | null = null;
  for (const key of Object.keys(history.goals)) {
    if (key < dateKey && (latest === null || key > latest)) latest = key;
  }
  return latest === null ? DEFAULT_GOAL : history.goals[latest];
}

/**
 * Record a goal change for a date. An invalid value is refused and the same
 * history is returned unchanged — the saved goal never moves on bad input.
 */
export function setGoalForDate(
  history: GoalHistory, dateKey: string, value: number,
): GoalHistory {
  if (!isValidGoal(value) || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return history;
  return { goals: { ...history.goals, [dateKey]: value } };
}

/** Recognize only the exact stored shape; anything else is an error, not a
 * silent reset to defaults. */
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function parseGoalHistory(raw: string): GoalHistory | null {
  let doc: unknown;
  try {
    doc = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) return null;
  const goals = (doc as { goals?: unknown }).goals;
  if (typeof goals !== 'object' || goals === null || Array.isArray(goals)) return null;
  for (const [key, value] of Object.entries(goals)) {
    if (!DATE_KEY.test(key) || !isValidGoal(value)) return null;
  }
  return { goals: { ...goals } };
}

/**
 * Read goal history. A missing document is the defaults — a genuine "no goal
 * changes yet". Any other failure (backend error, malformed or unrecognized
 * payload) is an error result.
 */
export async function loadGoalHistory(
  backend: StorageBackend,
): Promise<StorageResult<GoalHistory>> {
  let raw: string | null;
  try {
    raw = await backend.getItem(GOALS_KEY);
  } catch (cause) {
    return { kind: 'error', reason: `read failed: ${String(cause)}` };
  }
  if (raw === null) return { kind: 'ok', value: DEFAULT_GOAL_HISTORY };
  const parsed = parseGoalHistory(raw);
  if (parsed === null) return { kind: 'error', reason: 'stored goal history is malformed' };
  return { kind: 'ok', value: parsed };
}

/**
 * Write the whole goal-history document. A failed write is an error result;
 * a successful one returns exactly what was stored.
 */
export async function saveGoalHistory(
  backend: StorageBackend, history: GoalHistory,
): Promise<StorageResult<GoalHistory>> {
  try {
    await backend.setItem(GOALS_KEY, JSON.stringify(history));
  } catch (cause) {
    return { kind: 'error', reason: `write failed: ${String(cause)}` };
  }
  return { kind: 'ok', value: history };
}
