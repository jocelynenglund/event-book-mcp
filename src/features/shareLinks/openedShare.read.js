// ===========================================
// SHARE LINKS - Opened Share: what opening a share link came to: the copy opens, or the one who shared it removed
// the link and the page says so (not the same as a link that was never there).
// ===========================================

export const REMOVED_MESSAGE = 'This link was removed by the person who shared it';

// answer: what the share service said { status, body }. -> { shareId, state: 'open' | 'removed' | 'unavailable', message }
// 'unavailable' is any other answer (not found, the server down): the loader says why from the status, as before.
export function openedShare(shareId, answer = {}) {
  const gone = answer.status === 410 && answer.body?.removed === true;
  if (gone) return { shareId, state: 'removed', message: REMOVED_MESSAGE };
  if (answer.status >= 200 && answer.status < 300) return { shareId, state: 'open', message: null };
  return { shareId, state: 'unavailable', message: null };
}
