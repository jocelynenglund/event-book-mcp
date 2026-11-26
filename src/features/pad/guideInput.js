// ===========================================
// PAD - The notation guide on the screen (screen glue)
// The kind card opens when a colour of the strip is hovered (a computer; it stays while the pointer is on the swatch or on the card, so its
// "Add this example" can be reached) or held for half a second (a phone); a press, a tap elsewhere or Escape closes it. The ? of the toolbar
// opens the full guide in the board's sheet. It draws the views Pad Kind Card and Pad Guide the screen hands it the state for, and reads no book.
// ===========================================

import { padKindCard as cardView } from './padKindCard.read.js';
import { padGuide as guideView } from './padGuide.read.js';
import { padKindCard as cardBox, padGuide as guideBox } from './pad.parts.js';
import { openBoardSheet } from '../board/sheets/shared.js';

const HOLD_MS = 500, LEAVE_MS = 220;
let slot = null, anchor = null, leaving = null;

const mount = () => slot ||= Object.assign(document.getElementById('padView').appendChild(document.createElement('div')), { id: 'padKindSlot', className: 'pad-kind-slot' });

export function hideKindCard() {
  clearTimeout(leaving);
  anchor = null;
  if (slot) { slot.innerHTML = ''; slot.hidden = true; }
}

// The card for the colour `swatch` (a [data-pad-swatch] button) stands on, under it and kept inside the screen
export function showKindCard(swatch, state, editable) {
  const view = cardView(state, { colour: swatch.dataset.padSwatch, editable });
  if (!view) return;
  clearTimeout(leaving);
  const box = mount();
  anchor = swatch;
  box.innerHTML = cardBox(view);
  box.hidden = false;
  const r = swatch.getBoundingClientRect(), w = box.offsetWidth, h = box.offsetHeight;
  box.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - w - 8))}px`;
  box.style.top = `${r.bottom + 8 + h > window.innerHeight ? Math.max(8, r.top - h - 8) : r.bottom + 8}px`;
}

export function openGuide(state, editable) {
  hideKindCard();
  openBoardSheet(guideBox(guideView(state, { editable })));
}

// A press on a swatch held for HOLD_MS (touch): the card, and `held()` says the press was one, so the tap or drag it would be is not
export function holdSwatch(swatch, getState, editable) {
  let held = false;
  const timer = setTimeout(() => { held = true; showKindCard(swatch, getState(), editable()); }, HOLD_MS);
  return { cancel: () => clearTimeout(timer), held: () => held };
}

// Hover (mouse only: it must move) on the strip and the card; getState / editable: the screen's now
export function initGuide(getState, editable) {
  const onSwatch = t => t.closest?.('[data-pad-swatch]'), onCard = t => t.closest?.('.pad-kind-card');
  const later = () => { clearTimeout(leaving); leaving = setTimeout(hideKindCard, LEAVE_MS); };
  // The card opens when a mouse moves over a colour (not when the strip is drawn again under a resting pointer after a click)
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    // A button held down is a drag (a new note off the strip, a move, a lasso): no card, and one showing goes
    if (e.buttons) { if (anchor) hideKindCard(); return; }
    const s = onSwatch(e.target);
    if (s && s !== anchor && document.getElementById('padView')?.offsetParent) showKindCard(s, getState(), editable());
    else if (s || onCard(e.target)) clearTimeout(leaving);
  });
  document.addEventListener('pointerout', e => {
    if (e.pointerType !== 'mouse' || !anchor) return;
    if ((onSwatch(e.target) || onCard(e.target)) && !onSwatch(e.relatedTarget) && !onCard(e.relatedTarget)) later();
  });
  document.addEventListener('pointerdown', e => { if (anchor && !onCard(e.target)) hideKindCard(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && anchor) hideKindCard(); });
}
