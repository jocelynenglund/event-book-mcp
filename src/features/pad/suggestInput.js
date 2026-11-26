// ===========================================
// PAD - Suggestions on a text box (screen glue)
// Draws the Pad Suggestions component for the box being typed in, and takes the keys and taps that choose one:
//   a computer: a list under the box; ↑ / ↓ move along it, Tab takes the first (or the one moved to), Enter takes the one moved to (it is a new line
//   otherwise), Escape puts the list away (the next key brings it back);
//   a phone: chips in a row above the keyboard (the bottom of the visible screen), tapped; the box keeps its focus;
//   the ＋ Events sheet: chips under its box.
// A suggestion replaces the word typed and nothing else; the box tells the Pad it changed (an input event) as when she types.
// It reads no book: the view (Pad Suggestions) gets the state the screen hands it.
// ===========================================

import { padSuggestions as suggestView } from './padSuggestions.read.js';
import { padSuggestions as suggestBox } from './pad.parts.js';

let cur = null;   // { box, mount, getState, colour, noteId, at, layout, view, active, dismissed }

const phone = () => window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth <= 600;

// In a sheet (a transformed box) "fixed" is measured from the sheet, not the window: after placing, move by what it is off by
function settle(mount, left, top) {
  mount.style.left = `${left}px`; mount.style.top = `${top}px`;
  const r = mount.getBoundingClientRect();
  if (Math.abs(r.left - left) > 1) mount.style.left = `${left - (r.left - left)}px`;
  if (Math.abs(r.top - top) > 1) mount.style.top = `${top - (r.top - top)}px`;
}

function place() {
  const { mount, box, layout } = cur;
  if (layout === 'inline') return;
  if (layout === 'bar') {
    const vv = window.visualViewport, top = (vv?.offsetTop || 0) + (vv?.height || window.innerHeight) - mount.offsetHeight;
    mount.style.right = 'auto'; mount.style.width = `${window.innerWidth}px`;
    settle(mount, 0, Math.max(0, top));
    return;
  }
  const r = box.getBoundingClientRect(), below = r.bottom + 6, room = window.innerHeight - below;
  mount.style.right = 'auto';
  settle(mount, Math.max(8, Math.min(r.left, window.innerWidth - mount.offsetWidth - 8)), room >= mount.offsetHeight + 8 ? below : Math.max(8, r.top - mount.offsetHeight - 6));
}

function draw() {
  const { box, mount } = cur;
  cur.view = suggestView(cur.getState(), { colour: cur.colour, text: box.value, caret: box.selectionStart ?? box.value.length, noteId: cur.noteId, at: cur.at, field: cur.field && cur.field(), active: cur.active, dismissed: cur.dismissed });
  mount.innerHTML = suggestBox(cur.view);
  mount.dataset.layout = cur.layout;
  mount.hidden = !cur.view.visible;
  if (cur.view.visible) place();
}

// The box was typed in (or the caret moved): offer names for where it is. colour: the note's, or 'bulk'; noteId / at: which note, or where a new one is;
// field: a function giving { kind, chapterId, lead } for a plain name box (colour is then ignored)
export function suggestShow({ box, mount, getState, colour, noteId = null, at = null, typed = true, field = null }) {
  const same = cur && cur.box === box;
  cur = { box, mount, getState, colour, noteId, at, field, layout: colour === 'bulk' ? 'inline' : phone() ? 'bar' : 'pop', view: null, active: null, dismissed: same && !typed ? cur.dismissed : false };
  draw();
}

export function suggestClear() {
  if (cur) { cur.mount.hidden = true; cur.mount.innerHTML = ''; }
  cur = null;
}

function pick(index) {
  const item = cur?.view?.items[index];
  if (!item) return;
  const { box, view } = cur;
  box.setRangeText(item.insert, view.from, view.to, 'end');
  box.focus();
  box.dispatchEvent(new Event('input', { bubbles: true }));   // the Pad's own input handling takes it from here (and offers what comes next)
}

// A key in the box: true when it was ours (the list is showing and the key is one it uses)
export function suggestKey(e) {
  if (!cur?.view?.visible || e.target !== cur.box || e.altKey || e.ctrlKey || e.metaKey) return false;
  const n = cur.view.items.length;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    cur.active = cur.active == null ? (e.key === 'ArrowDown' ? 0 : n - 1) : (cur.active + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
  } else if (e.key === 'Tab' && !e.shiftKey) pick(cur.active ?? 0);
  else if (e.key === 'Enter' && cur.active != null) pick(cur.active);
  else if (e.key === 'Escape') { cur.dismissed = true; cur.active = null; }
  else return false;
  e.preventDefault(); e.stopPropagation();
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Escape') draw();
  return true;
}

// Taps on the names: the box keeps its focus (a press on a button would take it, and ends the note), the tap chooses
let ready = false;   // the Pad and the board's screen editor both ask: its listeners go on the page once
export function initSuggest() {
  if (ready) return;
  ready = true;
  const keepFocus = e => { if (e.target.closest?.('.pad-suggest-item')) e.preventDefault(); };
  document.addEventListener('pointerdown', keepFocus);
  document.addEventListener('mousedown', keepFocus);
  document.addEventListener('click', e => {
    const item = e.target.closest?.('.pad-suggest-item');
    if (item && cur) pick(Number(item.dataset.padSuggest));
  });
  window.visualViewport?.addEventListener('resize', () => cur?.view?.visible && place());
  window.visualViewport?.addEventListener('scroll', () => cur?.view?.visible && place());
}
