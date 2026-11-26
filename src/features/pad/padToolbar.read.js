// ===========================================
// PAD - Toolbar (SV: Pad Toolbar)
// What the Pad's buttons offer, always in the same places so nothing jumps when the selection changes: Create (＋ Note, ＋ Events,
// ▭ Frame; with notes selected the frame wraps them), Selection (one copy slot that says Link copy, or Unlink when a selected
// note is in several places; ✕ Remove; Make chapter…; and how much is selected), Zoom. The selection buttons are always
// there: `enabled` says whether they apply, `why` says what to select when they do not (it becomes the button's title).
// Where the book can not be changed there is the zoom only (copy, remove and makeChapter are null).
// selection: { noteIds, frameIds } as selected on this device (the ones that are gone count for nothing); zoom: 1 is 100%.
// guide: the ? that opens the notation guide (always there, read-only books too).
// mode: what a plain drag on empty canvas does on this device, 'select' (draws a rectangle) or 'pan'; `mode` is the one button that switches it.
// ===========================================

import { placesOf } from './sketch.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const slot = (enabled, why) => ({ enabled, why: enabled ? '' : why });

const MODES = {
  select: { label: '▭ Select', title: 'Drag on empty canvas draws a selection rectangle (Space + drag, or the scroll wheel, pans). Tap to switch to Pan' },
  pan: { label: '✋ Pan', title: 'Drag on empty canvas pans. Tap to switch to Select (a rectangle that selects what is inside)' }
};

export function padToolbar(state, { zoom = 1, selection = {}, editable = true, mode = 'select' } = {}) {
  const pad = state.pad || { notes: {}, frames: {} };
  const chosen = (selection.noteIds || []).filter(id => pad.notes[id]), notes = chosen.length, frames = (selection.frameIds || []).filter(id => pad.frames[id]).length;
  const unlinks = chosen.some(id => placesOf(pad, id).length > 1);
  return {
    mode: { action: 'toggle-mode', ...MODES[mode === 'pan' ? 'pan' : 'select'] },
    guide: { action: 'open-guide', label: '?', title: 'Notation guide: what each note colour is for, with an example of each' },
    editable, zoomText: `${Math.round(zoom * 100)}%`, wrapsSelection: editable && notes > 0,
    selected: [notes ? plural(notes, 'note', 'notes') : '', frames ? plural(frames, 'frame', 'frames') : ''].filter(Boolean).join(', '),
    copy: editable ? { action: unlinks ? 'unlink' : 'link-copy', label: unlinks ? 'Unlink' : 'Link copy', ...slot(notes > 0, 'Select notes to link a copy of') } : null,
    remove: editable ? slot(notes + frames > 0, 'Select something to remove') : null,
    makeChapter: editable ? slot(frames > 0, 'Select a frame to make a chapter of') : null
  };
}
