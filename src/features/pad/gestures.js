// ===========================================
// PAD - Gestures (SV: Pad Notes, Pad Frames, Pad Toolbar)
// The pointer on the canvas: pan, pinch and wheel zoom, drag a note or a frame (Alt: a linked copy), resize a frame, draw a selection
// rectangle, tap to select, rename or make a note.
// ===========================================

import { padToolbar as toolbarView } from './padToolbar.read.js';
import { changeFrame, dragBy } from './command.js';
import { NOTE_SIZE } from './sketch.js';
import { arrowStart, arrowDrag, arrowDrop, stretchArrow } from './arrowResize.js';
import { canEditCurrent } from '../../core/eventStore.js';
import { S, $, clamp, MIN_ZOOM, MAX_ZOOM, HOLD_MS, AREA_HOLD_MS, MOVE_PX, DOUBLE_MS, only, toggle, isSelected, clearSelection, redraw, wrote } from './padScreenState.js';
import { stageBox, toWorld, applyView, drawBar, zoomAt } from './padViewport.js';
import { showToast } from '../../ui/toast.js';
import { endEdit, startNoteHere, linkSelected } from './noteEditing.js';

// ---------- gestures ----------

const pointers = new Map();     // pointerId → { x, y } of the fingers (or the mouse) down on the canvas
let gesture = null;             // what the pointer(s) down are doing
let lastTap = { at: 0, key: '' };

const target = e => {
  const el = e.target.closest?.('.pad-note, .pad-frame-head, .pad-frame-grip, .pad-arrow-grip');
  if (!el) return { kind: 'empty' };
  if (el.matches('.pad-arrow-grip')) return { kind: 'resize', arrow: true, id: el.dataset.padArrowResize, el };
  if (el.matches('.pad-note')) return { kind: 'note', id: el.dataset.padNote, el };
  if (el.matches('.pad-frame-grip')) return { kind: 'resize', id: el.dataset.padFrameResize, el };
  return { kind: 'frame', id: el.dataset.padFrameHead, el, onName: !!e.target.closest('.pad-frame-name') };
};

// What a drag would move: the selected notes and frames, and the notes inside those frames
function movers() {
  const ids = new Set(S.sel.noteIds);
  S.scene.frames.filter(f => S.sel.frameIds.has(f.frameId)).forEach(f => f.noteIds.forEach(id => ids.add(id)));
  return [
    ...[...S.sel.frameIds].map(id => document.querySelector(`#padWorld [data-pad-frame="${id}"]`)),
    ...[...ids].map(id => document.querySelector(`#padWorld [data-pad-note="${id}"]`))
  ].filter(Boolean);
}

// What a drag lifts: the movers, or (Alt) a ghost of each selected note, left behind as a linked copy where it is dropped
function lift(g) {
  g.els = g.alt
    ? [...S.sel.noteIds].map(id => document.querySelector(`#padWorld [data-pad-note="${id}"]`)).filter(Boolean).map(el => { const ghost = el.cloneNode(true); el.after(ghost); return ghost; })
    : movers();
  g.els.forEach(el => el.classList.add('lifted'));
}

export function onDown(e) {
  if (e.button > 1 || e.target.closest('button, textarea, input')) return;
  const stage = $('padStage');
  if (S.editing) endEdit();
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  stage.setPointerCapture?.(e.pointerId);
  // A second finger: the canvas is being pinched, whatever the first one was doing
  if (pointers.size === 2) {
    cancelGesture();
    const [a, b] = [...pointers.values()];
    gesture = { type: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), vp: { ...S.vp }, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    return;
  }
  if (pointers.size > 2) return;
  // The middle button, or Space held: the canvas pans, whatever is under the pointer
  if (e.button === 1 || (S.spaceDown && e.pointerType !== 'touch')) { gesture = { id: e.pointerId, t: { kind: 'empty' }, sx: e.clientX, sy: e.clientY, moved: false, vp: { ...S.vp }, type: 'pan' }; return; }
  const t = target(e), touch = e.pointerType === 'touch', editable = canEditCurrent();
  const held = (t.kind === 'note' || t.kind === 'frame') && isSelected(t.kind, t.id);   // already selected (as after ＋ Many): a finger moves it at once
  gesture = { id: e.pointerId, t, touch, held, sx: e.clientX, sy: e.clientY, shift: e.shiftKey, alt: e.altKey && t.kind === 'note', moved: false, vp: { ...S.vp }, type: 'press', editable };
  if (t.kind === 'resize') { if (!editable) { gesture = null; return; } const f = t.arrow ? arrowStart(S.scene, t.id) : S.scene.frames.find(x => x.frameId === t.id); gesture.type = 'resize'; gesture.f = f; return; }
  if (t.kind === 'note' || t.kind === 'frame') {
    // The thing pressed becomes the selection (unless it is already part of one, which a drag then moves whole)
    if (!e.shiftKey && !isSelected(t.kind, t.id)) {
      only(t.kind, t.id);
      redraw();
      gesture.t.el = document.querySelector(t.kind === 'note' ? `#padWorld [data-pad-note="${t.id}"]` : `#padWorld [data-pad-frame-head="${t.id}"]`);
    }
    if (!editable) { gesture.type = 'pan'; if (touch) gesture.timer = setTimeout(() => { if (gesture && !gesture.moved) readOnlyToast(gesture); }, 450); return; }
    // A finger holds a moment before it lifts a note (until then it pans the canvas); a mouse lifts it at once
    if (touch) gesture.timer = setTimeout(() => { if (gesture && gesture.type === 'press') { gesture.type = 'drag'; lift(gesture); navigator.vibrate?.(8); } }, HOLD_MS);
    return;
  }
  // Empty canvas: a mouse draws a rectangle in Select mode (or with Shift), a finger in Select mode too, and in Pan mode after a hold; else it pans
  gesture.add = e.shiftKey || e.metaKey || e.ctrlKey;
  if (S.mode === 'select' || (e.shiftKey && !touch)) gesture.area = 'now';
  else if (touch) {
    gesture.area = 'hold';
    gesture.timer = setTimeout(() => { if (gesture && gesture.type === 'press' && !gesture.moved) { gesture.armed = true; $('padStage').dataset.hold = 'true'; } }, AREA_HOLD_MS);
  }
}

// A drag or long press on a note or frame of a book that can't be changed here says so (once per gesture), with the way out when there is one
function readOnlyToast(g) {
  if (g.toasted) return;
  g.toasted = true;
  const chip = document.getElementById('syCheckout');
  const out = chip?.dataset.syncAction === 'checkout';
  showToast(out ? 'Read-only: check it out to move notes' : 'Read-only: this book can’t be changed here', out ? { action: 'Check out', onAction: () => chip.click() } : {});
}

// The rectangle starts where the press was
function startArea(g) {
  clearTimeout(g.timer);
  const el = document.createElement('div');
  el.className = 'pad-lasso';
  $('padWorld').appendChild(el);
  Object.assign(g, { type: 'lasso', el, from: toWorld(g.sx, g.sy) });
  delete $('padStage').dataset.hold;
}

// What a rectangle between two world points covers: the notes and frames whose middle is inside
function covered(a, b) {
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y), within = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  return {
    noteIds: S.scene.notes.filter(n => within(n.x + (n.w || NOTE_SIZE) / 2, n.y + (n.w ? 28 : NOTE_SIZE / 2))).map(n => n.noteId),
    frameIds: S.scene.frames.filter(f => within(f.x + f.w / 2, f.y + f.h / 2)).map(f => f.frameId)
  };
}

export function cancelGesture() {
  if (!gesture) return;
  clearTimeout(gesture.timer);
  (gesture.els || []).forEach(el => { el.style.transform = ''; el.classList.remove('lifted'); });
  if (gesture.alt) (gesture.els || []).forEach(el => el.remove());
  gesture.el?.remove();
  delete $('padStage')?.dataset.hold;
  gesture = null;
}

export function onMove(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const g = gesture;
  if (!g) return;
  if (g.type === 'pinch') {
    const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const r = stageBox(), k = clamp(g.vp.k * d / g.d, MIN_ZOOM, MAX_ZOOM);
    const px = g.mid.x - r.left, py = g.mid.y - r.top;
    S.vp = { k, x: mid.x - r.left - (px - g.vp.x) * (k / g.vp.k), y: mid.y - r.top - (py - g.vp.y) * (k / g.vp.k) };
    applyView(false);
    return;
  }
  if (e.pointerId !== g.id) return;
  const dx = e.clientX - g.sx, dy = e.clientY - g.sy, far = Math.hypot(dx, dy) > MOVE_PX;
  if (far) g.moved = true;
  if (g.type === 'press' && far) {
    // On a touch screen a finger that moves before the hold is up is panning (unless the note is already selected); a mouse on a note or frame drags it
    if (g.t.kind === 'empty') { if (g.area === 'now' || (g.area === 'hold' && g.armed)) startArea(g); else { clearTimeout(g.timer); g.type = 'pan'; } }
    else if (g.touch && S.mode === 'pan' && !(g.held && g.editable)) { clearTimeout(g.timer); g.type = 'pan'; }
    else if (g.editable) { g.type = 'drag'; lift(g); }
    else g.type = 'pan';
  }
  if (far && !g.editable && (g.t.kind === 'note' || g.t.kind === 'frame')) readOnlyToast(g);
  if (g.type === 'pan') { S.vp = { ...g.vp, x: g.vp.x + dx, y: g.vp.y + dy }; applyView(false); }
  else if (g.type === 'drag') g.els.forEach(el => { el.style.transform = `translate(${dx / S.vp.k}px, ${dy / S.vp.k}px)`; });
  else if (g.type === 'resize' && g.t.arrow) arrowDrag($('padWorld'), g.t.id, g.f, dx, S.vp.k);
  else if (g.type === 'resize') {
    const f = $('padWorld').querySelector(`[data-pad-frame="${g.t.id}"]`);
    f.style.width = `${Math.max(220, g.f.w + dx / S.vp.k)}px`;
    f.style.height = `${Math.max(220, g.f.h + dy / S.vp.k)}px`;
  }
  else if (g.type === 'lasso') {
    const a = g.from, b = toWorld(e.clientX, e.clientY);
    Object.assign(g.el.style, { left: `${Math.min(a.x, b.x)}px`, top: `${Math.min(a.y, b.y)}px`, width: `${Math.abs(a.x - b.x)}px`, height: `${Math.abs(a.y - b.y)}px`, fontSize: `${13 / S.vp.k}px` });
    g.el.textContent = toolbarView(S.stateNow, { selection: covered(a, b) }).selected;   // "3 notes, 1 frame", live
  }
}

export function onUp(e) {
  const had = pointers.delete(e.pointerId);
  const g = gesture;
  if (!had || !g) return;
  if (g.type === 'pinch') { if (pointers.size < 2) { gesture = null; applyView(); drawBar(); } return; }
  if (e.pointerId !== g.id) return;
  clearTimeout(g.timer);
  delete $('padStage').dataset.hold;
  gesture = null;
  const dx = (e.clientX - g.sx) / S.vp.k, dy = (e.clientY - g.sy) / S.vp.k;
  if (g.type === 'pan') { applyView(); return; }
  if (g.type === 'drag' && g.moved) {
    g.els.forEach(el => { el.style.transform = ''; el.classList.remove('lifted'); });
    if (g.alt) { g.els.forEach(el => el.remove()); linkSelected(Math.round(dx), Math.round(dy)); return; }
    wrote(dragBy({ noteIds: [...S.sel.noteIds], frameIds: [...S.sel.frameIds] }, Math.round(dx), Math.round(dy)), null);
    return;
  }
  if (g.type === 'resize' && g.moved && g.t.arrow) { wrote(arrowDrop(g.t.id, g.f, dx), null); return; }
  if (g.type === 'resize' && g.moved) { wrote(changeFrame(g.t.id, { w: g.f.w + dx, h: g.f.h + dy }), null); return; }
  if (g.type === 'lasso') {
    const hit = covered(g.from, toWorld(e.clientX, e.clientY));
    g.el.remove();
    if (!g.add) clearSelection();
    hit.noteIds.forEach(id => S.sel.noteIds.add(id));
    hit.frameIds.forEach(id => S.sel.frameIds.add(id));
    redraw();
    return;
  }
  g.els?.forEach(el => el.classList.remove('lifted'));
  if (g.alt) g.els?.forEach(el => el.remove());
  tap(g, e);
}

// A tap that moved nothing: select, rename, edit, or (twice, on the canvas) make a note
function tap(g, e) {
  const { t } = g, key = `${t.kind}:${t.id || ''}`, now = Date.now(), twice = lastTap.key === key && now - lastTap.at < DOUBLE_MS;
  lastTap = twice ? { at: 0, key: '' } : { at: now, key };
  if (t.kind === 'resize') { if (twice && g.editable && t.arrow) wrote(stretchArrow(S.scene, t.id), null); return; }   // double tap on an arrow's handle: stretch it over its frames
  if (t.kind === 'empty') {
    if (twice && g.editable) { const p = toWorld(e.clientX, e.clientY); startNoteHere(p.x, p.y); return; }
    if (S.sel.noteIds.size || S.sel.frameIds.size) { clearSelection(); redraw(); }
    return;
  }
  if (t.kind === 'note') {
    if (g.shift) toggle('note', t.id); else only('note', t.id);
    if (twice && g.editable && !g.shift) { S.editing = { kind: 'note', id: t.id, value: null }; }
    redraw();
    return;
  }
  if (t.kind === 'frame') {
    if (g.shift) toggle('frame', t.id); else only('frame', t.id);
    if (g.editable && !g.shift && t.onName) S.editing = { kind: 'frame', id: t.id, value: null };
    redraw();
  }
}

export function onWheel(e) {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, S.vp.k * Math.exp(-e.deltaY * 0.01));
  else { S.vp = { ...S.vp, x: S.vp.x - e.deltaX, y: S.vp.y - e.deltaY }; applyView(); }
}

// A pointer was cancelled: it is no longer down on the canvas
export const forgetPointer = id => { pointers.delete(id); };
