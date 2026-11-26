// ===========================================
// SYNC - Save Chip: what the ☁ chip in an open book's top bar says about saving it in the library: offer to
// save a book only on this device, or whether a kept book is saved, saving, or not saved (and why).
// ===========================================

// facts come from saveFacts(bookId) (client.js), plus whether the book is being reviewed through a link.
// state: hidden | local | saving | saved | error; action: keep (save it to the library) | save (send now)
const hide = { state: 'hidden', icon: '', label: '', action: null, title: '' };

export function saveChip(f) {
  if (!f.signedIn || f.reviewer || f.build || f.reviewing) return hide;
  if (!f.kept) return { state: 'local', icon: '☁', label: 'Save to library', action: 'keep', title: 'Keep this book in your library: it is saved on the server' };
  if (f.status === 'syncing') return { state: 'saving', icon: '↻', label: 'Saving…', action: 'save', title: 'Sending to your library…' };
  const failed = String(f.status || '').startsWith('error');
  if (failed || f.parked) {
    const why = f.parked && !failed ? 'Checked out on another device, so these changes are waiting here. Tap to try again'
      : f.backoffMs > 0 ? 'The server is busy: it will try again by itself. Tap to save now'
      : `${String(f.status).replace(/^error:\s*/, '') || 'Could not reach your library'}. Tap to save now`;
    return { state: 'error', icon: '⚠', label: 'Not saved', action: 'save', title: why };
  }
  if (f.unsent > 0) return { state: 'saving', icon: '↻', label: 'Saving…', action: 'save', title: `${f.unsent} ${f.unsent === 1 ? 'change is' : 'changes are'} on their way to your library` };
  return { state: 'saved', icon: '✓', label: 'Saved', action: 'save', title: 'Saved in your library: tap to check again' };
}
