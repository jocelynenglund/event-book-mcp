// ===========================================
// OPENING A LINK - Link Loading State: what the full-screen loader says while a link (?m= a share, ?book= a
// library book) opens: "Opening ‹name›…" (or "Opening a shared book…" before the name is known), and, when it
// didn't open, why, with the way back (removed: the message of a share link its owner took away).
// ===========================================

// kind: 'share' | 'book'. name: the book's name once known. problem: why it didn't open (linkProblem), else it is still opening.
// -> { failed, title, reason, back }
export function linkLoadingState({ kind, name = null, problem = null, removed = null }) {
  // feature: share-links: a link its owner removed says so, in its own words
  if (removed) return { failed: true, title: removed, reason: null, back: true };
  if (problem) return { failed: true, title: 'This link didn\'t open', reason: problem, back: true };
  return {
    failed: false,
    title: name ? `Opening ${name}…` : kind === 'book' ? 'Opening a book from your library…' : 'Opening a shared book…',
    reason: null,
    back: false
  };
}

// Why a link didn't open, in a few words, from what went wrong: { status } an answer the server gave, none at all
// (offline), or { signedOut } for a library link opened without an account
export function linkProblem(kind, e = {}) {
  if (e.unreadable) return 'it could not be read';
  if (e.signedOut) return 'sign in to open this book from your library';
  if (e.status === 404 || e.status === 410 || (kind === 'book' && e.status === 403)) {
    return kind === 'book' ? 'that book isn’t in your library' : 'it was not found, or it has expired';
  }
  if (e.status) return `the server answered ${e.status}`;
  return 'this device looks offline';
}
