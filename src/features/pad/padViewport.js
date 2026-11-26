// ===========================================
// PAD - Viewport (SV: Pad Toolbar, Pad Swatches, Pad Event Maker)
// Where the viewer is on the canvas (offset, zoom, fit, jump to a note or frame) and the bar above it, drawn again when the selection
// or the zoom changes.
// ===========================================

import { padToolbar as toolbarView } from './padToolbar.read.js';
import { padSwatches as swatchesView } from './padSwatches.read.js';
import { padEventMaker as makerView } from './padEventMaker.read.js';
import { padToolbar, padSwatches, padEventMaker } from './pad.parts.js';
import { barHtml } from './scenarioStrip.js';
import { flashNote } from './padPlaces.js';
import { reveal } from './fold.js';
import { NOTE_SIZE } from './sketch.js';
import { showToast } from '../../ui/toast.js';
import { canEditCurrent } from '../../core/eventStore.js';
import { S, $, clamp, MIN_ZOOM, MAX_ZOOM, GRID, VIEW_KEY, store, only, redraw } from './padScreenState.js';

// The toolbar and swatches again (the selection or the zoom changed)
export function drawBar() {
  const editable = canEditCurrent();
  $('padToolbarSlot').innerHTML = padToolbar(toolbarView(S.stateNow, { zoom: S.vp.k, selection: { noteIds: [...S.sel.noteIds], frameIds: [...S.sel.frameIds] }, editable, mode: S.mode }));
  $('padStage').dataset.mode = S.mode;
  const swatches = swatchesView(S.stateNow, { colour: S.colour, editable, selection: { noteIds: [...S.sel.noteIds] } });
  $('padSwatchSlot').innerHTML = swatches ? padSwatches(swatches) : '';
  $('padMakerSlot').innerHTML = padEventMaker(makerView(S.stateNow, { selectedIds: [...S.sel.noteIds] }));
  $('padStripSlot').innerHTML = barHtml(S.stateNow, [...S.sel.noteIds], editable);
}

// Where the viewer is: the world's transform, the dots behind it, and the device's memory of it
export function applyView(save = true) {
  const stage = $('padStage');
  $('padWorld').style.transform = `translate(${S.vp.x}px, ${S.vp.y}px) scale(${S.vp.k})`;
  stage.style.setProperty('--pad-grid', `${GRID * S.vp.k}px`);
  stage.style.setProperty('--pad-zoom', S.vp.k);   // a chapter arrow's heading keeps a readable size when zoomed out
  stage.style.setProperty('--pad-ox', `${S.vp.x}px`);
  stage.style.setProperty('--pad-oy', `${S.vp.y}px`);
  if (save) store.set(VIEW_KEY(S.bookNow), S.vp);
}

export const stageBox = () => $('padStage').getBoundingClientRect();
export const toWorld = (cx, cy) => { const r = stageBox(); return { x: (cx - r.left - S.vp.x) / S.vp.k, y: (cy - r.top - S.vp.y) / S.vp.k }; };

export function zoomAt(cx, cy, k) {
  const r = stageBox(), next = clamp(k, MIN_ZOOM, MAX_ZOOM), px = cx - r.left, py = cy - r.top;
  S.vp = { x: px - (px - S.vp.x) * (next / S.vp.k), y: py - (py - S.vp.y) * (next / S.vp.k), k: next };
  applyView();
  drawBar();
}

// The boxes (in world units) in view: the canvas pans and zooms (never closer than 100%) so they fit; nothing: the start
export function fit(draw = true, boxes = [...S.scene.notes.map(n => ({ x: n.x, y: n.y, w: NOTE_SIZE, h: n.drawnH || NOTE_SIZE })), ...S.scene.frames.map(f => ({ x: f.x, y: f.y, w: f.w, h: f.drawnH ?? f.h }))]) {
  const r = $('padStage')?.getBoundingClientRect(), W = r?.width || window.innerWidth, H = r?.height || window.innerHeight - 120;
  if (!boxes.length) S.vp = { x: 40, y: 60, k: 1 };
  else {
    const x0 = Math.min(...boxes.map(b => b.x)), y0 = Math.min(...boxes.map(b => b.y));
    const w = Math.max(...boxes.map(b => b.x + b.w)) - x0, h = Math.max(...boxes.map(b => b.y + b.h)) - y0;
    const k = clamp(Math.min((W - 80) / w, (H - 80) / h, 1), MIN_ZOOM, 1);
    S.vp = { k, x: (W - w * k) / 2 - x0 * k, y: (H - h * k) / 2 - y0 * k };
  }
  if (draw) { applyView(); drawBar(); }
}

// "Made by <Command> ↗": that frame comes into view and is the selection
export function jumpToFrame(frameId) {
  if (!S.scene.frames.some(x => x.frameId === frameId)) reveal({ frameId });   // on the shelf: it comes back first
  const f = S.scene.frames.find(x => x.frameId === frameId);
  if (!f) return;
  only('frame', frameId);
  fit(false, [{ x: f.x, y: f.y, w: f.w, h: f.drawnH ?? f.h }]);
  applyView();
  redraw();
}

// A place in the 🔗 list: that note comes into view (never closer than 100%), is the selection, and flashes
export function jumpToNote(noteId) {
  if (!S.scene.notes.some(x => x.noteId === noteId)) reveal({ noteId });   // on the shelf or folded away: it comes back first
  const n = S.scene.notes.find(x => x.noteId === noteId);
  if (!n) { showToast('That note is gone'); return; }
  only('note', noteId);
  fit(false, [{ x: n.x, y: n.y, w: NOTE_SIZE, h: n.drawnH || NOTE_SIZE }]);
  applyView();
  redraw();
  flashNote(noteId);
}

export const centre = () => { const r = stageBox(); return toWorld(r.left + r.width / 2, r.top + r.height / 2); };
