// ===========================================
// ARRANGE - Dragging on the shelf and in the Outline (pointer events: mouse and touch)
// Grab a grip, marked data-drag="chapter|part" (data-key / data-part names it): the ruled lines at a spine's foot, the
// ⠿ of an open chapter's header, the part's divider tab. Only a grip starts a drag; the rest of the spine,
// header or tab is tapped as ever. A mouse or a finger starts after a few pixels (a grip has touch-action none,
// so the board does not scroll under it). A line marks the
// slot where it will land (the nearest of the slots the book allows: Arrange Slots), the edges of the board scroll,
// Escape cancels. Letting go hands the kind, the key and the slot to onDrop. It reads no book: the slots come in as
// a question (slotsFor), the drop goes out as a call.
// The shelf runs left to right (axis 'x'); the Outline's Arrange mode runs top to bottom (axis 'y'): the slots are the
// same (Arrange Slots), only the line across them and the edge that scrolls (the page) differ. In 'y' a part's heading
// is the tab: before it is its top edge, its start is its bottom edge.
// ===========================================

const START_PX = 5, EDGE = 56, SCROLL = 14;
const SIDES = { x: ['left', 'right'], y: ['top', 'bottom'] };   // the edges a place is measured by, along each axis
const vertical = () => options?.axis === 'y';
const PART_GAP_MID = 21, PART_START = 4;   // px from a part tab's left edge: the middle of the gap before it, the first chapter's edge

let options = null;   // { slotsFor(kind, key) → slots, onDrop(kind, key, slot), axis: 'x' | 'y' }: the latest draw's
let pending = null;   // pressed, not yet dragging
let drag = null;      // dragging

const keyOf = el => el.dataset.drag === 'part' ? el.dataset.part : el.dataset.key;
// What the grip belongs to: the spine, the header or the tab
const ownerOf = grip => grip.closest('[data-component]');
const nameOf = grip => ownerOf(grip)?.querySelector('.bd-spine-name, .bd-chapter-name, .bd-part-tab-name, .ola-name')?.textContent.trim() || '';

// The board is armed on every draw; its listeners go on once
export function armDrag(board, opts) {
  options = { axis: 'x', ...opts };
  if (board.dataset.dragArmed) return;
  board.dataset.dragArmed = '1';
  board.addEventListener('pointerdown', e => press(board, e));
  // Once dragging, the finger must not scroll the board
  board.addEventListener('touchmove', e => { if (drag) e.preventDefault(); }, { passive: false });
  board.addEventListener('contextmenu', e => { if (e.target.closest?.('.bd-grip') || drag) e.preventDefault(); });
}

function press(board, e) {
  if (e.button > 0 || e.target.closest('input, textarea')) return;
  const handle = e.target.closest('.bd-grip[data-drag]');
  if (!handle || !board.contains(handle)) return;
  pending = { board, handle, kind: handle.dataset.drag, key: keyOf(handle), x: e.clientX, y: e.clientY };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', release);
  document.addEventListener('pointercancel', cancel);
  document.addEventListener('keydown', onKey);
}

// A slot's place along the board's content (so scrolling doesn't move it), or null when what it sits against isn't drawn
function placeOf(board, slot) {
  const box = board.getBoundingClientRect();
  const [start, end] = SIDES[options.axis];
  const scrolled = vertical() ? board.scrollTop : board.scrollLeft;
  const at = (el, side) => el ? el.getBoundingClientRect()[side] - box[start] + scrolled : null;
  const find = sel => board.querySelector(sel);
  const owner = sel => { const grip = find(sel); return grip && ownerOf(grip); };
  // A part's tab spans the part: before it is in the gap to its left, its start is just inside its left edge.
  // A part's heading sits over its chapters: before it is its top edge, its start is its bottom edge
  if (slot.beforePart) return at(owner(`.bd-grip[data-drag="part"][data-part="${slot.beforePart}"]`), start) - (vertical() ? 0 : PART_GAP_MID);
  if (slot.startsPart) return vertical() ? at(owner(`.bd-grip[data-drag="part"][data-part="${slot.startsPart}"]`), end) : at(owner(`.bd-grip[data-drag="part"][data-part="${slot.startsPart}"]`), start) + PART_START;
  if (slot.before) return at(owner(`.bd-grip[data-drag="chapter"][data-key="${slot.before}"]`), start);
  return Math.max(...[...board.querySelectorAll('.bd-grip[data-drag]')].map(el => at(ownerOf(el), end)));
}

function begin(p) {
  if (!p || pending !== p || !options) return;
  const slots = options.slotsFor(p.kind, p.key).map(slot => ({ slot, x: placeOf(p.board, slot) })).filter(s => s.x != null);
  if (!slots.length) return cancel();
  const marker = document.createElement('div');
  marker.className = vertical() ? 'bd-drop-marker across' : 'bd-drop-marker';
  if (!vertical()) marker.style.height = `${p.board.scrollHeight}px`;
  p.board.appendChild(marker);
  const ghost = document.createElement('div');
  ghost.className = 'bd-drag-ghost';
  ghost.textContent = nameOf(p.handle);
  document.body.appendChild(ghost);
  ownerOf(p.handle).classList.add('dragging');
  document.body.classList.add('arranging');
  drag = { ...p, slots, marker, ghost, best: null, cx: p.x, cy: p.y, scrolling: 0 };
  update();
  if (navigator.vibrate) navigator.vibrate(8);
}

function move(e) {
  if (drag) { drag.cx = e.clientX; drag.cy = e.clientY; update(); return; }
  if (!pending) return;
  if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) > START_PX) begin(pending);
}

// The slot nearest the pointer, its marker, the ghost beside the pointer, and the edges scrolling
function update() {
  const { board, slots, marker, ghost } = drag;
  const box = board.getBoundingClientRect();
  const y = vertical();
  const at = y ? drag.cy - box.top + board.scrollTop : drag.cx - box.left + board.scrollLeft;
  drag.best = slots.reduce((a, b) => Math.abs(b.x - at) < Math.abs(a.x - at) ? b : a);
  marker.style[y ? 'top' : 'left'] = `${drag.best.x - 1}px`;
  ghost.style.left = `${drag.cx + 12}px`;
  ghost.style.top = `${drag.cy + 12}px`;
  // The shelf scrolls itself; the Outline is the page, under the app's header
  const near = y ? drag.cy : drag.cx;
  const lo = y ? EDGE + (document.querySelector('.header')?.getBoundingClientRect().bottom || 0) : box.left + EDGE;
  const hi = y ? window.innerHeight - EDGE : box.right - EDGE;
  const dir = near < lo ? -1 : near > hi ? 1 : 0;
  if (dir && !drag.scrolling) requestAnimationFrame(function step() {
    if (!drag || !drag.scrolling) return;
    if (y) window.scrollBy(0, drag.scrolling * SCROLL); else board.scrollLeft += drag.scrolling * SCROLL;
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
  if (drag) {
    drag.marker.remove();
    drag.ghost.remove();
    ownerOf(drag.handle)?.classList.remove('dragging');
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
