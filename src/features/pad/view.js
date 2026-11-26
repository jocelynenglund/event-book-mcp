// ===========================================
// PAD - Screen (SV: Pad Notes, Pad Frames, Pad Toolbar, Pad Swatches, Pad Hint, Pad Event Maker, Pad Make Chapter, Pad Update Chapter, Pad Bulk Form, Pad Bulk Preview)
// The Pad (Jocelyn: "a way to free style it like miro, just simple notes … then group into slices … convert it to a chapter on the
// active board"): a dotted canvas of plain sticky notes, framed into sketched slices, then Make chapter… builds them onto the board.
// Drag empty space to draw a selection rectangle (middle or Space + drag, the wheel, or two fingers pan; a finger pans, or selects after
// a hold; ▭ Select / ✋ Pan in the toolbar says what a plain drag does), ctrl+wheel (or pinch) to zoom. Double-click (double-tap) the
// canvas for a note and type; drag a colour from the strip for one; tap a note to select it, drag to move it (on a touch screen, a short
// hold first, so a drag of the canvas pans), shift-click or shift-drag a lasso for several. A frame is moved by its top edge, resized by
// its corner, named by tapping its label; with notes selected, Frame draws it round them. 🔗 Link copy (or Alt-drag a note) makes a
// linked copy: the same note in another place. ＋ Events opens a sheet to paste a list into, one event (orange note) per line, laid out
// as a grid in the middle of the view. Every write is the book's own command (pad/command.js, pad/makeChapter.command.js); where the
// viewer is, what is selected, the note being typed and the colour last used are this device's, not events.
// The screen composes the parts and reads no state itself: feed.js hands it the one replay of the book per draw. Its wiring lives in
// padScreenState (this device's state), padViewport, gestures, keyboard, noteEditing, padActions and padSheets.
// ===========================================

import { updateSaveChip, updateCheckoutBanner } from '../sync/view.js';
import { padNotes } from './padNotes.read.js';
import { padFrames } from './padFrames.read.js';
import { padHint as hintView } from './padHint.read.js';
import { padNote, padFrame, padHint } from './pad.parts.js';
import { growToFit } from './padGrow.js';
import { initGuide } from './guideInput.js';
import { suggestClear, initSuggest } from './suggestInput.js';
import { initClipboard } from './clipboard.js';
import { initPlaces } from './padPlaces.js';
import { drawShelf, initFold } from './fold.js';
import { initScenarioStrip } from './scenarioStrip.js';
import { canEditCurrent, getCurrentModelId } from '../../core/eventStore.js';
import { S, $, VIEW_KEY, store, bindDraw, padSelectionNow, wrote } from './padScreenState.js';
import { applyView, drawBar, fit, toWorld, centre, jumpToNote, jumpToFrames } from './padViewport.js';
import { onDown, onMove, onUp, onWheel, cancelGesture, forgetPointer } from './gestures.js';
import { onKey, onSpaceUp } from './keyboard.js';
import { endEdit, onSwatchDown, suggestNote } from './noteEditing.js';
import { onAction } from './padActions.js';
import { initPadSheets } from './padSheets.js';

export { padSelectionNow };

function shell(container) {
  if (container.querySelector('.pad-stage')) return;
  container.innerHTML = `
    <div class="pad-bar"><div id="padToolbarSlot"></div><div id="padSwatchSlot"></div><div id="padMakerSlot"></div><div id="padStripSlot"></div></div>
    <div class="pad-stage" id="padStage"><div class="pad-world" id="padWorld"></div><div id="padHintSlot"></div></div>
    <div class="pad-suggest-slot" id="padSuggestSlot" hidden></div>`;
}

// Draws the Pad into #padView, from the book feed.js replayed for this draw
export function renderPad(state) {
  updateCheckoutBanner();
  updateSaveChip();   // the ☁ chip in the top bar: Save to library, Saved, Saving…, Not saved
  const container = $('padView');
  if (!container) return;
  if (S.bookNow !== getCurrentModelId()) {
    S.bookNow = getCurrentModelId();
    Object.assign(S, { sel: { noteIds: new Set(), frameIds: new Set() }, editing: null, draft: null, makeUi: null, updateUi: null, fitted: false });
  }
  S.stateNow = state;
  suggestClear();
  shell(container);
  const editable = canEditCurrent();
  const noteEdit = S.editing?.kind === 'note' ? S.editing : null, frameEdit = S.editing?.kind === 'frame' ? S.editing : null;
  const notes = padNotes(state, { draft: S.draft, editable, selectedIds: [...S.sel.noteIds], editing: noteEdit });
  const frames = padFrames(state, { editable, selectedIds: [...S.sel.frameIds], editing: frameEdit });
  S.scene = { notes: notes.notes, frames: frames.frames };
  // What is selected is only what is still there
  S.sel.noteIds.forEach(id => S.scene.notes.some(n => n.noteId === id) || S.sel.noteIds.delete(id));
  S.sel.frameIds.forEach(id => S.scene.frames.some(f => f.frameId === id) || S.sel.frameIds.delete(id));
  if (S.editing && !(S.editing.kind === 'note' ? S.scene.notes : S.scene.frames).some(x => (x.noteId || x.frameId) === S.editing.id)) S.editing = null;
  if (!S.fitted) { S.fitted = true; const saved = store.get(VIEW_KEY(S.bookNow)); if (saved) S.vp = saved; else fit(false); }

  $('padWorld').innerHTML = S.scene.frames.map(padFrame).join('') + S.scene.notes.map(padNote).join('');
  growToFit();
  drawBar();
  drawShelf(state);
  const hint = hintView(state, { editable, draft: S.draft });
  $('padHintSlot').innerHTML = hint ? padHint(hint) : '';
  applyView(false);
  const box = S.editing && (S.editing.kind === 'frame' ? $('padWorld').querySelector('.pad-frame-input') : $('padWorld').querySelector('.pad-note-input'));
  if (box) { box.focus(); box.setSelectionRange?.(box.value.length, box.value.length); }
}

bindDraw(renderPad);

const select = ({ noteIds, frameIds = [] }) => { S.sel = { noteIds: new Set(noteIds), frameIds: new Set(frameIds) }; };

export function initPad() {
  const view = $('padView');
  if (!view) return;
  view.addEventListener('click', e => { const t = e.target.closest('[data-pad-action]'); if (t) onAction(t.dataset.padAction, t); });
  view.addEventListener('pointerdown', e => { if (e.target.closest('#padStage')) onDown(e); else onSwatchDown(e); });
  view.addEventListener('pointermove', onMove);
  view.addEventListener('pointerup', onUp);
  view.addEventListener('pointercancel', e => { forgetPointer(e.pointerId); cancelGesture(); });
  view.addEventListener('wheel', e => { if (e.target.closest('#padStage')) onWheel(e); }, { passive: false });
  view.addEventListener('input', e => {
    if (S.editing && e.target.matches?.('[data-pad-input]')) { S.editing.value = e.target.value; if (e.target.matches('textarea')) { suggestNote(e.target); growToFit(); } }
  });
  view.addEventListener('keyup', e => {
    if (S.editing && e.target.matches?.('textarea[data-pad-input]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) suggestNote(e.target, false);
  });
  initSuggest();
  initPlaces(jumpToNote);
  initFold({ wrote, jumpToFrames });
  view.addEventListener('focusout', e => {
    if (S.editing && e.target.matches?.('[data-pad-input]')) setTimeout(() => { if (S.editing && !document.querySelector('#padView [data-pad-input]:focus')) endEdit(); }, 0);
  });
  document.addEventListener('keydown', onKey);
  initGuide(() => S.stateNow, canEditCurrent);
  initScenarioStrip({ state: () => S.stateNow, selected: () => [...S.sel.noteIds], select: ids => select({ noteIds: ids }), wrote });
  initClipboard({ state: () => S.stateNow, selection: padSelectionNow, select, toWorld, centre, wrote, active: () => !!$('padView')?.offsetParent });
  document.addEventListener('keyup', onSpaceUp);
  window.addEventListener('blur', onSpaceUp);
  view.addEventListener('mousedown', e => { if (e.button === 1 && e.target.closest('#padStage')) e.preventDefault(); });   // no browser auto-scroll on the middle button
  initPadSheets();   // the Make chapter… / Update chapter / ＋ Events sheets live in the board sheet, outside the Pad
  window.addEventListener('resize', () => { if (view.offsetParent) applyView(false); });
}
