// ===========================================
// LIVE BOOKS - Live Chip (feature: live-books): what the chip beside the save chip says about how this open book hears of
// changes: Live (the server tells it as they happen), Reconnecting, or Polling (it only checks now and then).
// ===========================================

// facts: signed in, a reviewer's account, opened by a review link, kept on the server, a build book (only read), and the
// link (connection.js): live | reconnecting | off | idle (nothing to listen to).
const hide = { state: 'hidden', icon: '', label: '', title: '' };

export function liveChip(f) {
  if (!f.signedIn || f.reviewer || f.reviewing || !f.kept || f.build || f.link === 'idle') return hide;
  if (f.link === 'live') return { state: 'live', icon: '●', label: 'Live', title: 'Live: changes from your other devices show up as they happen' };
  if (f.link === 'reconnecting') return { state: 'reconnecting', icon: '↻', label: 'Reconnecting', title: 'Reconnecting: changes show up when the connection is back; meanwhile this book checks now and then' };
  return { state: 'polling', icon: '○', label: 'Polling', title: 'Polling: this book checks for changes now and then, so another device’s edits can take a minute to show' };
}
