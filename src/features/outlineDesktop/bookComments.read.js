// ===========================================
// OUTLINE DESKTOP - Book Comments (SV: S4 Book comments)
// Every thread in the book, newest first, for the column on the right: who said it and how long ago, the words, its replies
// (oldest first), and whether it is this device's own. showing: 'open' or 'resolved' (the toggle). now: the clock, for "2 h ago". replying, highlight: the thread being replied to, the one jumped to (a device's own).
// Where each one is, and the tap to go there, is Comment Target.
// ===========================================

const live = state => Object.values(state.comments || {}).filter(c => !c.deleted);
const at = c => String(c.at || '');
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function agoText(iso, now) {
  const then = Date.parse(iso);
  if (isNaN(then)) return '';
  const min = Math.max(0, Math.round((now - then) / 60000));
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  return days < 2 ? 'yesterday' : days < 30 ? `${days} days ago` : iso.slice(0, 10);
}

export function bookComments(state, { showing = 'open', me = null, now = Date.now(), replying = null, highlight = null } = {}) {
  const all = live(state);
  const threads = all.filter(c => !c.threadId).sort((a, b) => at(b).localeCompare(at(a)));
  const open = threads.filter(c => !c.resolved), done = threads.filter(c => c.resolved);
  const on = showing === 'resolved' ? 'resolved' : 'open';
  const shown = on === 'resolved' ? done : open;
  const empty = !threads.length ? 'No comments yet. Tap 💬 on a slice, scenario, chapter or criterion to start one.'
    : !shown.length ? (on === 'resolved' ? 'Nothing resolved yet.' : 'Nothing open.') : '';
  return {
    showing: on, open: open.length, resolved: done.length,
    title: `Comments · ${open.length} open`,
    tabs: { open: `Open ${open.length}`, resolved: `Resolved ${done.length}` },
    cards: shown.map(c => ({
      commentId: c.id, author: c.nickname, ago: agoText(c.at, now), text: c.text, resolved: !!c.resolved, mine: !!me && c.deviceId === me, replying: replying === c.id, highlight: highlight === c.id,
      replies: all.filter(r => r.threadId === c.id).sort((a, b) => at(a).localeCompare(at(b)))
        .map(r => ({ commentId: r.id, author: r.nickname, ago: agoText(r.at, now), text: r.text }))
    })),
    empty
  };
}
