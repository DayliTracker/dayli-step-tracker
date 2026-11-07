import type { StorageBackend, StorageResult } from './preferences.ts';
import type { TodaySnapshot } from './today.ts';

/**
 * HealthKit permission foundation (phase-03 spec, issue #19): the typed
 * boundary over Apple's read-only HealthKit surface. Apple never discloses
 * the user's read choice — `authorizationStatus(for:)` covers saving only,
 * and the requestAuthorization completion "doesn't indicate whether the user
 * actually granted permission" — so the state below is driven by the app's
 * own record of the user's path through the permission flow, never by a
 * fabricated guess about the system's hidden answer.
 */

/** Stored decision record, versioned under its own key. */
export const HEALTH_DECISIONS_KEY = 'dayli.health-decisions.v1';

/**
 * The four distinct permission states (issue AC): not requested, granted
 * (the connected path), skipped/declined, and unavailable. `granted` copy
 * stays truthful under Apple's privacy model: it claims the request path was
 * completed, never that Apple disclosed the choice — steps appear when Health
 * has data, whether the user allowed access or not.
 */
export type HealthPermissionState =
  | 'not-requested'
  | 'granted'
  | 'skipped-declined'
  | 'unavailable';

/** The user's in-app path: complete the request, or skip it. */
export type HealthDecision = 'requested' | 'skipped';

export interface HealthDecisions {
  decision: HealthDecision | null;
}

export const DEFAULT_HEALTH_DECISIONS: HealthDecisions = { decision: null };

/**
 * The native HealthKit boundary the app wires the local Expo module into
 * (modules/dayli-health-kit). Tests inject doubles, so every rule below is
 * provable without a device.
 */
export interface HealthKitNative {
  /** HKHealthStore.isHealthDataAvailable() */
  isHealthDataAvailable(): boolean;
  /**
   * requestAuthorization(toShare: [], read: [stepCount]) — resolves after the
   * user answers the system sheet; rejects when the request fails. The share
   * set is empty: the app never writes health data.
   */
  requestStepReadAuthorization(): Promise<void>;
}

/** Recognize only the exact stored shape; anything else is an error, not a
 * silent reset to defaults. */
function parseDecisions(raw: string): HealthDecisions | null {
  let doc: unknown;
  try {
    doc = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) return null;
  const decision = (doc as { decision?: unknown }).decision;
  if (decision !== null && decision !== 'requested' && decision !== 'skipped') return null;
  return { decision };
}

/**
 * Read the decision record. A missing document is the defaults — a genuine
 * "no decision yet". Any other failure (backend error, malformed payload) is
 * an error result: the first-launch explanation must not auto-open on an
 * unknown record, because that could re-ask someone who already skipped.
 */
export async function loadHealthDecisions(
  backend: StorageBackend,
): Promise<StorageResult<HealthDecisions>> {
  let raw: string | null;
  try {
    raw = await backend.getItem(HEALTH_DECISIONS_KEY);
  } catch (cause) {
    return { kind: 'error', reason: `read failed: ${String(cause)}` };
  }
  if (raw === null) return { kind: 'ok', value: DEFAULT_HEALTH_DECISIONS };
  const parsed = parseDecisions(raw);
  if (parsed === null) return { kind: 'error', reason: 'stored health decisions are malformed' };
  return { kind: 'ok', value: parsed };
}

/** Write the whole decision document; a failed write is an error result. */
export async function saveHealthDecisions(
  backend: StorageBackend, decisions: HealthDecisions,
): Promise<StorageResult<HealthDecisions>> {
  try {
    await backend.setItem(HEALTH_DECISIONS_KEY, JSON.stringify(decisions));
  } catch (cause) {
    return { kind: 'error', reason: `write failed: ${String(cause)}` };
  }
  return { kind: 'ok', value: decisions };
}

/**
 * The single synthesis rule for the typed permission state: availability
 * decides `unavailable`, then the user's own recorded path decides the rest.
 * The system's hidden read answer never invents a state.
 */
export function permissionState(
  nativeAvailable: boolean, decisions: HealthDecisions,
): HealthPermissionState {
  if (!nativeAvailable) return 'unavailable';
  switch (decisions.decision) {
    case 'requested': return 'granted';
    case 'skipped': return 'skipped-declined';
    default: return 'not-requested';
  }
}

/**
 * The first-launch explanation opens only on a confirmed fresh record: the
 * decision document read successfully and holds no decision. A read error
 * never opens it — that could nag someone whose stored skip is unreadable.
 */
export function shouldShowFirstLaunchExplanation(
  state: HealthPermissionState, decisionsReadFailed: boolean,
): boolean {
  return state === 'not-requested' && !decisionsReadFailed;
}

/**
 * Step reads (phase-03, issue #20) — the read side of the same typed
 * boundary. Fetched Health totals live in React state only: they are never
 * written to storage (AC: a restart must find none), and every refresh is
 * user- or foreground-driven — app open, return to foreground, pull to
 * refresh. Nothing here schedules or implies a background refresh.
 */

/** One day interval's step total from the native query (see the module). */
export interface DayStepSample {
  startMs: number;
  steps: number;
}

/** The read surface the app needs; the native module satisfies it structurally. */
export interface HealthKitStepReader {
  readDailyStepTotals(fromMs: number, toMs: number): Promise<DayStepSample[]>;
}

/** The read window: today and the previous six device-local dates. */
export const HEALTH_WINDOW_DAYS = 7;

/**
 * The query window for a refresh at `now`: from the local midnight of the
 * sixth day before today, to now. Local calendar parts build both bounds so
 * a UTC offset can never shift which dates the window covers.
 */
export function stepWindow(now: Date): { fromMs: number; toMs: number } {
  const start = new Date(
    now.getFullYear(), now.getMonth(), now.getDate() - (HEALTH_WINDOW_DAYS - 1),
  );
  return { fromMs: start.getTime(), toMs: now.getTime() };
}

export type HealthTotals =
  | { kind: 'ok'; totals: Record<string, number> }
  | { kind: 'error'; reason: string };

/**
 * Map one day's samples to a whole-number step total. HealthKit counts are
 * doubles; the product shows whole numbers, so the sum rounds to nearest.
 * Fragments of one date sum (disjoint intervals add up); a date with only a
 * 0 sum stays a truthful 0.
 */
function mergeDayTotals(samples: DayStepSample[], now: Date): Record<string, number> {
  const { fromMs, toMs } = stepWindow(now);
  const totals: Record<string, number> = {};
  for (const sample of samples) {
    const steps = sample.steps;
    const total = totals[localKeyOf(sample.startMs)];
    totals[localKeyOf(sample.startMs)] = total === undefined ? steps : total + steps;
  }
  for (const [key, value] of Object.entries(totals)) {
    totals[key] = Math.round(value);
  }
  // window validation below
  return totals;
}

/** Stable local `YYYY-MM-DD` for a timestamp, on the device's own calendar. */
function localKeyOf(ms: number): string {
  const date = new Date(ms);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Turn raw native samples into per-date totals — or an error. Any malformed
 * sample (wrong shape, non-finite or negative steps) or any sample outside
 * the requested window is an error for the whole read: a native payload the
 * boundary cannot vouch for must never shrink into a success with fewer
 * dates, and a bad sample must never render as data — not even as 0.
 */
export function samplesToLocalTotals(
  samples: unknown, now: Date,
): HealthTotals {
  if (!Array.isArray(samples)) return { kind: 'error', reason: 'step read returned a malformed payload' };
  const { fromMs, toMs } = stepWindow(now);
  const totals: Record<string, number> = {};
  for (const sample of samples) {
    if (typeof sample !== 'object' || sample === null) {
      return { kind: 'error', reason: 'step read returned a malformed sample' };
    }
    const { startMs, steps } = sample as { startMs?: unknown; steps?: unknown };
    if (typeof startMs !== 'number' || !Number.isFinite(startMs)
      || typeof steps !== 'number' || !Number.isFinite(steps) || steps < 0) {
      return { kind: 'error', reason: 'step read returned a malformed sample' };
    }
    if (startMs < fromMs || startMs > toMs) {
      return { kind: 'error', reason: 'step read returned a sample outside the requested window' };
    }
    const key = localKeyOf(startMs);
    totals[key] = (totals[key] ?? 0) + steps;
  }
  for (const [key, value] of Object.entries(totals)) {
    totals[key] = Math.round(value);
  }
  return { kind: 'ok', totals };
}

/**
 * One refresh, end to end: window → native query → per-date totals. A null
 * reader, a rejected promise, or a malformed payload is an error result —
 * never an empty success — so the UI can never render a native failure as a
 * zero-step day.
 */
export async function loadDailyStepTotals(
  reader: HealthKitStepReader | null, now: Date,
): Promise<HealthTotals> {
  if (reader === null) return { kind: 'error', reason: 'HealthKit module is not available' };
  const { fromMs, toMs } = stepWindow(now);
  let samples: DayStepSample[];
  try {
    samples = await reader.readDailyStepTotals(fromMs, toMs);
  } catch (cause) {
    return { kind: 'error', reason: `step read failed: ${String(cause)}` };
  }
  return samplesToLocalTotals(samples, now);
}

/**
 * What the UI knows about Health totals after the last refresh. In-memory
 * only: `totals` is the last successful read (null = none this session),
 * `lastRefreshMs` the last SUCCESSFUL refresh time, `error` the last failed
 * refresh (kept alongside the totals it failed to replace).
 */
export interface HealthTotalsView {
  totals: Record<string, number> | null;
  lastRefreshMs: number | null;
  refreshing: boolean;
  error: string | null;
}

export const IDLE_HEALTH_TOTALS: HealthTotalsView = {
  totals: null, lastRefreshMs: null, refreshing: false, error: null,
};

/**
 * The single truthful-state rule for one date (issue #20 ACs): manual
 * precedence first, then the last successful Health read, then the explicit
 * transient and failure states, then the neutral no-data state — and only a
 * not-connected permission state may say "when step data is connected".
 * `manual` mirrors App's ManualState shapes; a failed manual read stays an
 * error even when Health has data, because the stored record is unknown.
 */
export function resolveDaySnapshot(
  manual: { kind: 'loading' } | { kind: 'failed' } | { kind: 'value'; total: number | null },
  health: HealthTotalsView, permission: HealthPermissionState | null, dateKey: string,
): TodaySnapshot {
  if (manual.kind === 'loading') return { kind: 'loading' };
  if (manual.kind === 'failed') return { kind: 'error' };
  if (manual.total !== null) return { kind: 'loaded', steps: manual.total, source: 'manual' };
  if (permission === 'granted') {
    const steps = health.totals?.[dateKey];
    if (typeof steps === 'number' && steps >= 0) {
      return { kind: 'loaded', steps, source: 'health' };
    }
    if (health.refreshing) return { kind: 'loading' };
    if (health.error !== null) return { kind: 'error' };
    if (health.totals !== null) return { kind: 'empty' };
  }
  return { kind: 'unavailable' };
}
