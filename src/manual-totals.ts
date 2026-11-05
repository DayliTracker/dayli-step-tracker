import type { StorageBackend, StorageResult } from './preferences';
import { lastSevenLocalDates, localDateKey } from './progress.ts';

/**
 * Manual totals — the phase-2 local data owner. One editable total per local
 * date, keyed by that date's `YYYY-MM-DD`: writing a date's total replaces
 * whatever was stored for it (never sums), so at most one manual total exists
 * per date. For its date a manual total is the displayed source — it stands
 * in for the Health total until phase 3 connects Health — and it persists
 * across restarts and Health refreshes until the user removes it.
 */
export const MANUAL_TOTALS_KEY = 'dayli.manual-totals.v1';

/** Whole-number steps from 0 through 100,000: 0 records a genuine rest day,
 * and the cap matches the product's existing whole-number goal bound. */
export const MIN_MANUAL_TOTAL = 0;
export const MAX_MANUAL_TOTAL = 100000;

export type ManualTotals = { totals: Record<string, number> };

export const DEFAULT_MANUAL_TOTALS: ManualTotals = { totals: {} };

export function isValidManualTotal(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value)
    && value >= MIN_MANUAL_TOTAL && value <= MAX_MANUAL_TOTAL
  );
}

export type ManualTotalValidation =
  | { kind: 'ok'; value: number }
  | { kind: 'error'; reason: 'blank' | 'malformed' | 'out-of-range' };

/**
 * Validate raw manual-total input from the text field. Only plain digits
 * parse — blank, fractional (`8000.5`), grouped (`8,000`), signed (`-1`),
 * exponential (`1e4`) and other malformed text are rejected before any range
 * check, so an invalid submission never reaches the saved total.
 */
export function parseManualTotalInput(raw: string | null | undefined): ManualTotalValidation {
  if (raw === null || raw === undefined) return { kind: 'error', reason: 'blank' };
  const text = raw.trim();
  if (!text) return { kind: 'error', reason: 'blank' };
  if (!/^\d+$/.test(text)) return { kind: 'error', reason: 'malformed' };
  const value = Number(text);
  if (!isValidManualTotal(value)) return { kind: 'error', reason: 'out-of-range' };
  return { kind: 'ok', value };
}

/**
 * The seven-date window: a manual total can only be written for one of the
 * seven device-local dates Progress shows — today and the previous six.
 */
export function isInSevenDateWindow(dateKey: string, now: Date): boolean {
  return lastSevenLocalDates(now).some((date) => localDateKey(date) === dateKey);
}

/**
 * Write (create or replace) the manual total for a date. An invalid value or
 * a date outside the seven-date window is refused and the same record is
 * returned unchanged. Writing a date that already has a total replaces it —
 * the record never holds two totals for one date, and values are never summed.
 */
export function setManualTotal(
  record: ManualTotals, dateKey: string, value: number, now: Date,
): ManualTotals {
  if (!isValidManualTotal(value) || !isInSevenDateWindow(dateKey, now)) return record;
  return { totals: { ...record.totals, [dateKey]: value } };
}

/**
 * Remove the manual total for a date, if one exists. The stored entry for any
 * other date is untouched.
 */
export function removeManualTotal(record: ManualTotals, dateKey: string): ManualTotals {
  if (!(dateKey in record.totals)) return record;
  const totals = { ...record.totals };
  delete totals[dateKey];
  return { totals };
}

/** The stored manual total for a date, or null when the date has none. */
export function manualTotalForDate(record: ManualTotals, dateKey: string): number | null {
  const value = record.totals[dateKey];
  return isValidManualTotal(value) ? value : null;
}

/** Recognize only the exact stored shape; anything else is an error, not a
 * silent reset to defaults. */
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function parseManualTotals(raw: string): ManualTotals | null {
  let doc: unknown;
  try {
    doc = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) return null;
  const totals = (doc as { totals?: unknown }).totals;
  if (typeof totals !== 'object' || totals === null || Array.isArray(totals)) return null;
  for (const [key, value] of Object.entries(totals)) {
    if (!DATE_KEY.test(key) || !isValidManualTotal(value)) return null;
  }
  return { totals: { ...totals } };
}

/**
 * Read the manual-total record. A missing document is the defaults — a
 * genuine "no manual totals yet". Any other failure (backend error, malformed
 * or unrecognized payload) is an error result.
 */
export async function loadManualTotals(
  backend: StorageBackend,
): Promise<StorageResult<ManualTotals>> {
  let raw: string | null;
  try {
    raw = await backend.getItem(MANUAL_TOTALS_KEY);
  } catch (cause) {
    return { kind: 'error', reason: `read failed: ${String(cause)}` };
  }
  if (raw === null) return { kind: 'ok', value: DEFAULT_MANUAL_TOTALS };
  const parsed = parseManualTotals(raw);
  if (parsed === null) return { kind: 'error', reason: 'stored manual totals are malformed' };
  return { kind: 'ok', value: parsed };
}

/**
 * Write the whole manual-total record. A failed write is an error result; a
 * successful one returns exactly what was stored.
 */
export async function saveManualTotals(
  backend: StorageBackend, record: ManualTotals,
): Promise<StorageResult<ManualTotals>> {
  try {
    await backend.setItem(MANUAL_TOTALS_KEY, JSON.stringify(record));
  } catch (cause) {
    return { kind: 'error', reason: `write failed: ${String(cause)}` };
  }
  return { kind: 'ok', value: record };
}
