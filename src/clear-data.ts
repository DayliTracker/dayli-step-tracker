import type { StorageBackend, StorageResult } from './preferences';
import { GOALS_KEY } from './goals.ts';
import { MANUAL_TOTALS_KEY } from './manual-totals.ts';
import { PREFERENCES_KEY } from './preferences.ts';

/**
 * Clear-data — the confirmed reset of exactly the app's local documents:
 * preferences (language override), goal history, manual totals, and cached
 * summaries. No cached-summary document exists yet (phase-02 spec: none is
 * written until a summary feature needs one), so the key list carries the
 * three stored documents; a future cache key joins this list, never a second
 * reset path. Health permissions are an operating-system concern — this
 * module only deletes app documents and never touches permissions.
 */
export const LOCAL_DATA_KEYS: readonly string[] = [
  PREFERENCES_KEY,
  GOALS_KEY,
  MANUAL_TOTALS_KEY,
];

/**
 * Remove every local document. Each key is removed even if an earlier removal
 * failed, so one confirmation does the most it can; when any removal fails
 * the result is an error naming the keys that did not clear — never a
 * success-shaped reset. The next launch reads only missing documents, so a
 * fully cleared device starts on the 8,000 default goal and the
 * device-derived language.
 */
export async function clearLocalData(backend: StorageBackend): Promise<StorageResult<void>> {
  const failed: string[] = [];
  for (const key of LOCAL_DATA_KEYS) {
    try {
      await backend.removeItem(key);
    } catch {
      failed.push(key);
    }
  }
  if (failed.length > 0) {
    return { kind: 'error', reason: `clear failed for: ${failed.join(', ')}` };
  }
  return { kind: 'ok', value: undefined };
}
