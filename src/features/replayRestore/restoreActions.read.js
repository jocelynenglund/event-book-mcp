// REPLAY RESTORE - Restore Actions (SV) (feature: replay-restore)
// What the Replay bar offers at the step it is scrubbed to: restore it (a book you can change, scrubbed to the past) and copy the
// book from there (any book scrubbed to the past). Nothing at "now". later: how many actions restoring takes back.
// -> { atNow, canRestore, canCopy, later }
export function restoreActions({ at, total, canEdit }) {
  const atNow = at >= total;
  return { atNow, canRestore: !atNow && !!canEdit, canCopy: !atNow, later: Math.max(0, total - at) };
}
