/**
 * Normalize one accessibility sentence slot to exactly one terminator.
 * A trailing run of periods is stripped; a slot that already ends in `!`,
 * `?` or `…` keeps its own terminator — it is the sentence's — and every
 * other slot gains a single period. Never a doubled terminator for
 * screen readers.
 */
export function sentenceSlot(slot: string): string {
  const trimmed = slot.replace(/\.+$/u, '');
  return /[!?…]$/u.test(trimmed) ? trimmed : `${trimmed}.`;
}
