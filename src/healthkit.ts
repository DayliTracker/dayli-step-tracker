import type { StorageBackend, StorageResult } from './preferences.ts';

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
