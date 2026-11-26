// ===========================================
// FIELD MAPPING - The Comes from… sheet
// Opened from a field's editor (Comes from… / Change…), its ⚠ sheet, a fix list's Map from…: the field's sources as chips
// (× takes one away) and the stickies it could come from as cards (a tap on a field, or "whole event", adds it; a tap on a
// chosen one removes it). Each tap is one undo-able step and the sheet stays open to add several; Done closes it. It reads
// through Field Map Picker and draws from fieldMapping.parts.js; here are the sheet's state and its taps. No browser dialogs.
// ===========================================

import { openBoardSheet } from '../board/sheets/shared.js';
import { hideAllSheets } from '../../ui/sheets.js';
import { showToast } from '../../ui/toast.js';
import { render } from '../../ui/feed.js';
import { isReadOnly } from '../readOnly/sheet.js';
import { undo } from '../undo/command.js';
import { addFieldSource, mapFromWholeEvent, removeFieldSource } from './command.js';
import { fieldMapPickerNow } from './fieldMapPicker.read.js';
import { fieldMapPickerSheet } from './fieldMapping.parts.js';

// The field being mapped, what is typed, and where to go when it is done (a fix list comes back to itself)
let at = null;   // { elementId, field, query, done, items: what is ticked (null: as offered) }

const viewNow = () => fieldMapPickerNow(at.elementId, at.field, { query: at.query, readOnly: isReadOnly(), itemsChecked: at.items });

export function openFieldMapPicker(elementId, field, { done = null } = {}) {
  at = { elementId, field, query: '', done, items: null };
  const view = viewNow();
  if (!view) { at = null; return; }
  hideAllSheets();
  openBoardSheet(fieldMapPickerSheet(view), 'fmQuery');
}

// Draw the sheet again, keeping the search box's focus and the cards' place
function redraw({ focus = false } = {}) {
  const view = at && viewNow();
  if (!view) return;
  const cards = document.querySelector('#boardSheetContent .fm-cards');
  const top = cards?.scrollTop || 0;
  document.getElementById('boardSheetContent').innerHTML = fieldMapPickerSheet(view);
  const next = document.querySelector('#boardSheetContent .fm-cards');
  if (next) next.scrollTop = top;
  if (focus) {
    const box = document.getElementById('fmQuery');
    box.focus();
    box.setSelectionRange(box.value.length, box.value.length);
  }
}

// One step done: say it, offer Undo (which draws the sheet again), and keep the sheet open for the next
function changed(message) {
  render();
  showToast(message, { action: 'Undo', onAction: () => { undo(); redraw(); } });
  redraw();
}

const sourceOf = t => ({ elementId: t.dataset.fromEl, field: t.dataset.whole ? null : t.dataset.fromField });

function toggle(t) {
  const on = t.getAttribute('aria-pressed') === 'true';
  const target = { elementId: t.dataset.el, field: t.dataset.field };
  const name = t.dataset.text || (t.textContent.trim() === 'whole event' ? 'the whole event' : t.textContent.trim());
  const why = on ? removeFieldSource({ ...target, from: sourceOf(t) })
    // A whole event: the list may take the event's fields as its item fields too (one action, one undo)
    : t.dataset.whole ? mapFromWholeEvent({ elementId: target.elementId, field: target.field, from: t.dataset.fromEl, additive: true, items: !!document.getElementById('fmItems')?.checked })
    : addFieldSource({ ...target, from: sourceOf(t) });
  if (why) { showToast(why); return; }
  changed(on ? `${target.field} no longer comes from ${name}` : `${target.field} comes from ${name}`);
}

function remove(t) {
  const why = removeFieldSource({ elementId: t.dataset.el, field: t.dataset.field, from: sourceOf(t) });
  if (why) { showToast(why); return; }
  changed(`${t.dataset.field} no longer comes from ${t.getAttribute('aria-label').replace(/^Remove /, '')}`);
}

function done() {
  const back = at?.done;
  at = null;
  if (back) back(); else hideAllSheets();
}

// Typing narrows the cards: the sheet draws again and keeps the box and its place in it
export function onSheetInput(e) {
  if (e.target.id === 'fmItems' && at) { at.items = e.target.checked; return; }
  if (e.target.id !== 'fmQuery' || !at) return;
  at.query = e.target.value;
  redraw({ focus: true });
}

export function onSheetAction(a, t) {
  if (a === 'fm-toggle') { toggle(t); return true; }
  if (a === 'fm-remove') { remove(t); return true; }
  if (a === 'fm-done') { done(); return true; }
  return false;
}
