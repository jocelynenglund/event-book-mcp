// ===========================================
// SHARE LINKS - Share Link Name: what the Name field of the share sheet starts with when you make a copy link:
// the book's name and the day, the same the share service would give a link with no name.
// ===========================================

import { projectState } from '../../core/projections.js';

// The name of the book being shared, from its events
export const sharedBookName = events => projectState(events).modelName;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// bookName: the book being shared. now: a Date. -> { value, label }
export function shareLinkName({ bookName, now = new Date() } = {}) {
  const day = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  return { value: `${(bookName || '').trim() || 'Shared book'} · ${day}`, label: 'Name' };
}
