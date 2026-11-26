// ===========================================
// SHARE LINKS - Your Share Links: the links you made, newest first, each with its name, its book, its date and the
// link itself. Only what the share service lists as yours (the account's, and the copies made here without one);
// a link you just removed is gone from it at once.
// ===========================================

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayOf = iso => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

// rows: the share service's answer [{ shareId, name, bookName, createdAt }]. removed: share ids removed this sitting.
// base: the address a link opens (…/?m=). ui: { renaming, confirming }, the row being renamed or asked about.
// -> { empty, rows: [{ shareId, name, bookName, createdAt, link, mode }] } where mode: 'show' | 'rename' | 'confirm-remove'
export function yourShareLinks({ rows = [], removed = [], base = '', ui = {} } = {}) {
  const listed = rows
    .filter(r => r && r.shareId && !removed.includes(r.shareId))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map(r => ({
      shareId: r.shareId,
      name: r.name,
      bookName: r.bookName || null,
      createdAt: r.createdAt,
      date: dayOf(r.createdAt),
      link: `${base}${encodeURIComponent(r.shareId)}`,
      mode: ui.confirming === r.shareId ? 'confirm-remove' : ui.renaming === r.shareId ? 'rename' : 'show'
    }));
  return { empty: listed.length === 0, rows: listed };
}
