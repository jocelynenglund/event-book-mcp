// ===========================================
// PAD - Screen state (SV: the Pad screen's wiring)
// What is this device's on the Pad, in one place the screen's modules share: where the viewer is, what is selected, the note or frame
// name being typed, the colour last used, the sheets that are open. None of it is events (the book's own commands write those).
// ===========================================

import { COLOURS } from './sketch.js';
import { render } from '../../ui/feed.js';
import { showToast } from '../../ui/toast.js';
import { toastWithUndo } from '../undo/command.js';

export const MIN_ZOOM = 0.2, MAX_ZOOM = 2.5, GRID = 24;
export const HOLD_MS = 220, AREA_HOLD_MS = 350, DOUBLE_MS = 380;
export const MOVE_PX = 6;   // a press becomes a drag only after MOVE_PX of movement: a real hand wiggles a pixel or two in a click
export const VIEW_KEY = id => `eventbook_pad_view:${id}`, COLOUR_KEY = 'eventbook_pad_colour', MODE_KEY = 'eventbook_pad_mode';

export const store = {
  get: key => { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } },
  set: (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode: just this time */ } }
};

const startMode = () => (window.matchMedia?.('(pointer: coarse)').matches ? 'pan' : 'select');

export const S = {
  bookNow: null,                                        // the model the state below is about
  vp: { x: 40, y: 60, k: 1 },                           // the canvas's offset and zoom
  fitted: false,                                        // the viewer was placed (stored, or fitted once) for this book
  sel: { noteIds: new Set(), frameIds: new Set() },
  editing: null,                                        // { kind: 'note' | 'frame', id, value }
  draft: null,                                          // a note being typed that is not recorded yet { noteId, x, y, colour }
  colour: COLOURS.includes(store.get(COLOUR_KEY)) ? store.get(COLOUR_KEY) : 'blue',
  stateNow: null,                                       // the book feed.js replayed for this draw
  scene: { notes: [], frames: [] },
  makeUi: null,                                         // Make chapter… is open: { frameIds, chapterName, names, off }
  updateUi: null,                                       // Update chapter is open: { frameId }
  mode: ['select', 'pan'].includes(store.get(MODE_KEY)) ? store.get(MODE_KEY) : startMode(),   // what a plain drag on empty canvas does on this device
  spaceDown: false,                                     // Space is held: a drag pans
  bulkUi: null                                          // ＋ Events is open: { text }
};

// What is selected on the Pad now (for the picture of the Pad: shareImage/sheet.js)
export const padSelectionNow = () => ({ noteIds: [...S.sel.noteIds], frameIds: [...S.sel.frameIds] });

export const $ = id => document.getElementById(id);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---------- the selection ----------

export const only = (kind, id) => { S.sel = { noteIds: new Set(kind === 'note' ? [id] : []), frameIds: new Set(kind === 'frame' ? [id] : []) }; };
export const toggle = (kind, id) => { const s = kind === 'note' ? S.sel.noteIds : S.sel.frameIds; s.has(id) ? s.delete(id) : s.add(id); };
export const isSelected = (kind, id) => (kind === 'note' ? S.sel.noteIds : S.sel.frameIds).has(id);
export const clearSelection = () => { S.sel = { noteIds: new Set(), frameIds: new Set() }; };

// ---------- drawing again, writing ----------

// view.js hands over its draw: the modules draw again without importing the screen
let drawPad = () => {};
export const bindDraw = fn => { drawPad = fn; };

// Only the selection changed: draw again from the same book
export const redraw = () => drawPad(S.stateNow);

export function wrote(refused, message) {
  render();
  if (refused) showToast(refused);
  else if (message) toastWithUndo(message);
  return !refused;
}
