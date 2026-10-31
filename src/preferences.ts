import type { Locale } from './localization';

/**
 * Typed local preferences — the phase-2 storage foundation. Preferences are
 * one JSON document under a versioned key; later phase-2 records (goal
 * history, manual totals) get their own keys against the same backend.
 */
export const PREFERENCES_KEY = 'dayli.preferences.v1';

export interface Preferences {
  /** The saved language override; null follows the device locale. */
  languageOverride: Locale | null;
}

export const DEFAULT_PREFERENCES: Preferences = { languageOverride: null };

/**
 * The async key-value backend preferences persist through. The app wires
 * AsyncStorage into this shape; tests inject memory or failing stores, so
 * every rule below is provable without a device.
 */
export interface StorageBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/**
 * Explicit error path for persistence: reads and writes never degrade to a
 * success-shaped fallback — every failure surfaces as `error` with a reason,
 * and callers decide what the user sees.
 */
export type StorageResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'error'; reason: string };

/** Recognize only the exact stored shape; anything else is an error, not a
 * silent reset to defaults. */
function parsePreferences(raw: string): Preferences | null {
  let doc: unknown;
  try {
    doc = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) return null;
  const override = (doc as { languageOverride?: unknown }).languageOverride;
  if (override !== null && override !== 'en' && override !== 'vi') return null;
  return { languageOverride: override };
}

/**
 * Read preferences. A missing document is the defaults — a genuine "no
 * preferences yet". Any other failure (backend error, malformed or
 * unrecognized payload) is an error result.
 */
export async function loadPreferences(
  backend: StorageBackend,
): Promise<StorageResult<Preferences>> {
  let raw: string | null;
  try {
    raw = await backend.getItem(PREFERENCES_KEY);
  } catch (cause) {
    return { kind: 'error', reason: `read failed: ${String(cause)}` };
  }
  if (raw === null) return { kind: 'ok', value: DEFAULT_PREFERENCES };
  const parsed = parsePreferences(raw);
  if (parsed === null) return { kind: 'error', reason: 'stored preferences are malformed' };
  return { kind: 'ok', value: parsed };
}

/**
 * Write the whole preferences document. A failed write is an error result;
 * a successful one returns exactly what was stored.
 */
export async function savePreferences(
  backend: StorageBackend, preferences: Preferences,
): Promise<StorageResult<Preferences>> {
  try {
    await backend.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (cause) {
    return { kind: 'error', reason: `write failed: ${String(cause)}` };
  }
  return { kind: 'ok', value: preferences };
}
