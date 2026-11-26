// ===========================================
// FIELD MAPPING - The Comes from… sheet
// Opened from a field's editor (Comes from… / Change…), its ⚠ sheet, a fix list's Map from…: pick the field it comes
// from out of the other stickies' fields (search by sticky, field or slice; same-name ones on top, earlier ones first).
// One tap maps it (one undo-able step), Unmap takes it back. It reads through Field Map Picker and draws from
// fieldMapping.parts.js; here are the sheet's state and its taps. No browser dialogs.
// ===========================================

import { openBoardSheet } from '../board/sheets/shared.js';
import { hideAllSheets } from '../../ui/sheets.js';
import { showToast } from '../../ui/toast.js';
import { render } from '../../ui/feed.js';
import { isReadOnly } from '../readOnly/sheet.js';
import { toastWithUndo } from '../undo/command.js';
import { mapField, mapFromWholeEvent, clearFieldMapping } from './command.js';
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

function finish(message) {
  const done = at?.done;
  at = null;
  render();
  if (done) done(); else hideAllSheets();
  toastWithUndo(message);
}

function pick(t) {
  // A whole event: the list may take the event's fields as its item fields too (one action, one undo)
  const why = t.dataset.whole
    ? mapFromWholeEvent({ elementId: t.dataset.el, field: t.dataset.field, from: t.dataset.fromEl, items: !!document.getElementById('fmItems')?.checked })
    : mapField({ elementId: t.dataset.el, field: t.dataset.field, from: { elementId: t.dataset.fromEl, field: t.dataset.fromField } });
  if (why) { showToast(why); return; }
  finish(`${t.dataset.field} comes from ${t.dataset.text || t.querySelector('.fm-opt-name')?.textContent.trim() || 'it'}`);
}

function unmap(t) {
  const why = clearFieldMapping({ elementId: t.dataset.el, field: t.dataset.field });
  if (why) { showToast(why); return; }
  finish(`${t.dataset.field} comes from nowhere again`);
}

// Typing narrows the list: the sheet draws again and keeps the box and its place in it
export function onSheetInput(e) {
  if (e.target.id === 'fmItems' && at) { at.items = e.target.checked; return; }
  if (e.target.id !== 'fmQuery' || !at) return;
  at.query = e.target.value;
  const view = viewNow();
  if (!view) return;
  document.getElementById('boardSheetContent').innerHTML = fieldMapPickerSheet(view);
  const box = document.getElementById('fmQuery');
  box.focus();
  box.setSelectionRange(box.value.length, box.value.length);
}

export function onSheetAction(a, t) {
  if (a === 'fm-pick') { pick(t); return true; }
  if (a === 'fm-unmap') { unmap(t); return true; }
  return false;
}
