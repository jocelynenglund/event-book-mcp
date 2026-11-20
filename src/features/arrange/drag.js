// ===========================================
// ARRANGE - Dragging on the shelf (pointer events: mouse and touch)
// Grab anything marked data-drag="chapter|part" (data-key / data-part names it): a spine, a chapter's header, a
// bookend. A mouse starts after a few pixels; a finger after a short hold, so scrolling still works. A line marks the
// slot where it will land (the nearest of the slots the book allows: Arrange Slots), the edges of the board scroll,
// Escape cancels. Letting go hands the kind, the key and the slot to onDrop. It reads no book: the slots come in as
// a question (slotsFor), the drop goes out as a call.
// ===========================================

const MOUSE_PX = 6, HOLD_MS = 350, TOUCH_SLOP = 8, EDGE = 56, SCROLL = 14;

let options = null;   // { slotsFor(kind, key) → slots, onDrop(kind, key, slot) }: the latest draw's
let pending = null;   // pressed, not yet dragging
let drag = null;      // dragging

const keyOf = el => el.dataset.drag === 'part' ? el.dataset.part : el.dataset.key;
const nameOf = el => el.querySelector('.bd-spine-name, .bd-chapter-name, .bd-bookend-name')?.textContent.trim() || '';

// The board is armed on every draw; its listeners go on once
export function armDrag(board, opts) {
  options = opts;
  if (board.dataset.dragArmed) return;
  board.dataset.dragArmed = '1';
  board.addEventListener('pointerdown', e => press(board, e));
  // Once dragging, the finger must not scroll the board
  board.addEventListener('touchmove', e => { if (drag) e.preventDefault(); }, { passive: false });
  board.addEventListener('contextmenu', e => { if (pending?.touch || drag) e.preventDefault(); });
}

function press(board, e) {
  if (e.button > 0 || e.target.closest('input, textarea')) return;
  const handle = e.target.closest('[data-drag]');
  if (!handle || !board.contains(handle)) return;
  const touch = e.pointerType === 'touch';
  pending = { board, handle, kind: handle.dataset.drag, key: keyOf(handle), x: e.clientX, y: e.clientY, touch };
  if (touch) pending.timer = setTimeout(() => begin(pending), HOLD_MS);
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', release);
  document.addEventListener('pointercancel', cancel);
  document.addEventListener('keydown', onKey);
}

// A slot's place along the board's content (so scrolling doesn't move it), or null when what it sits against isn't drawn
function placeOf(board, slot) {
  const box = board.getBoundingClientRect();
  const at = (el, side) => el ? el.getBoundingClientRect()[side] - box.left + board.scrollLeft : null;
  const find = sel => board.querySelector(sel);
  if (slot.beforePart) return at(find(`[data-drag="part"][data-part="${slot.beforePart}"]`), 'left');
  if (slot.startsPart) return at(find(`[data-drag="part"][data-part="${slot.startsPart}"]`), 'right');
  if (slot.before) return at(find(`[data-drag="chapter"][data-key="${slot.before}"]`), 'left');
  return Math.max(...[...board.querySelectorAll('[data-drag]')].map(el => at(el, 'right')));
}

function begin(p) {
  if (!p || pending !== p || !options) return;
  clearTimeout(p.timer);
  const slots = options.slotsFor(p.kind, p.key).map(slot => ({ slot, x: placeOf(p.board, slot) })).filter(s => s.x != null);
  if (!slots.length) return cancel();
  const marker = document.createElement('div');
  marker.className = 'bd-drop-marker';
  marker.style.height = `${p.board.scrollHeight}px`;
  p.board.appendChild(marker);
  const ghost = document.createElement('div');
  ghost.className = 'bd-drag-ghost';
  ghost.textContent = nameOf(p.handle);
  document.body.appendChild(ghost);
  p.handle.classList.add('dragging');
  document.body.classList.add('arranging');
  drag = { ...p, slots, marker, ghost, best: null, cx: p.x, cy: p.y, scrolling: 0 };
  update();
  if (navigator.vibrate) navigator.vibrate(8);
}

function move(e) {
  if (drag) { drag.cx = e.clientX; drag.cy = e.clientY; update(); return; }
  if (!pending) return;
  const far = Math.hypot(e.clientX - pending.x, e.clientY - pending.y);
  if (pending.touch ? far > TOUCH_SLOP : far > MOUSE_PX) pending.touch ? cancel() : begin(pending);
}

// The slot nearest the pointer, its marker, the ghost beside the pointer, and the edges scrolling
function update() {
  const { board, slots, marker, ghost } = drag;
  const box = board.getBoundingClientRect();
  const x = drag.cx - box.left + board.scrollLeft;
  drag.best = slots.reduce((a, b) => Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a);
  marker.style.left = `${drag.best.x - 1}px`;
  ghost.style.left = `${drag.cx + 12}px`;
  ghost.style.top = `${drag.cy + 12}px`;
  const dir = drag.cx < box.left + EDGE ? -1 : drag.cx > box.right - EDGE ? 1 : 0;
  if (dir && !drag.scrolling) requestAnimationFrame(function step() {
    if (!drag || !drag.scrolling) return;
    board.scrollLeft += drag.scrolling * SCROLL;
    update();
    requestAnimationFrame(step);
  });
  drag.scrolling = dir;
}

function release() {
  const d = drag;
  const best = d?.best;
  finish();
  if (!d) return;
  swallowClick();
  if (best) options.onDrop(d.kind, d.key, best.slot);
}

function cancel() {
  const had = !!drag;
  finish();
  if (had) swallowClick();
}

// Escape while still holding: the click that comes when the button is let go isn't a tap either
function onKey(e) {
  if (e.key !== 'Escape') return;
  const had = !!drag;
  finish();
  if (had) document.addEventListener('pointerup', swallowClick, { once: true });
}

function finish() {
  clearTimeout(pending?.timer);
  if (drag) {
    drag.marker.remove();
    drag.ghost.remove();
    drag.handle.classList.remove('dragging');
    document.body.classList.remove('arranging');
    drag.scrolling = 0;
  }
  pending = drag = null;
  document.removeEventListener('pointermove', move);
  document.removeEventListener('pointerup', release);
  document.removeEventListener('pointercancel', cancel);
  document.removeEventListener('keydown', onKey);
}

// The click that follows letting go isn't a tap on the chapter
function swallowClick() {
  const stop = e => { e.stopPropagation(); e.preventDefault(); };
  document.addEventListener('click', stop, { capture: true, once: true });
  setTimeout(() => document.removeEventListener('click', stop, { capture: true }), 50);
}
