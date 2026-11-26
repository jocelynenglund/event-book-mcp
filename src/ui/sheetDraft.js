// ===========================================
// SHEET DRAFTS - what is typed in a bulk-add sheet is kept, so a stray tap outside does not lose it
// A box opts in with data-draft="<sheet>". The draft is kept per book and per sheet (in memory, and in sessionStorage so a
// reload keeps it too), cleared when the box is emptied or the sheet's Add succeeds. While a draft-box holds text, a tap
// outside (or a swipe down) does not close its sheet; the sheet's Cancel button does, and keeps the draft.
// ===========================================

import { getCurrentModelId } from '../core/eventStore.js';

const memory = new Map();
const PREFIX = 'eventbook-draft:';

export const draftKey = (bookId, sheet) => `${bookId ?? ''}/${sheet}`;

// storage and the book are injectable so the keying can be tested without a page
export function makeDrafts({ storage = null, bookId = () => null, mem = memory } = {}) {
  const store = fn => { try { return fn(storage); } catch (e) { return undefined; } };
  return {
    get(sheet) {
      const k = draftKey(bookId(), sheet);
      if (mem.has(k)) return mem.get(k);
      return store(s => s?.getItem(PREFIX + k)) || '';
    },
    set(sheet, text) {
      const k = draftKey(bookId(), sheet);
      if (!text || !String(text).trim()) return this.clear(sheet);
      mem.set(k, text);
      store(s => s?.setItem(PREFIX + k, text));
    },
    clear(sheet) {
      const k = draftKey(bookId(), sheet);
      mem.delete(k);
      store(s => s?.removeItem(PREFIX + k));
    }
  };
}

let drafts = null;
function d() {
  if (!drafts) {
    let storage = null;
    try { storage = window.sessionStorage; } catch (e) { /* blocked */ }
    drafts = makeDrafts({ storage, bookId: getCurrentModelId });
  }
  return drafts;
}
export const draftGet = sheet => d().get(sheet);
export const draftClear = sheet => d().clear(sheet);

// A sheet with text in a draft-box does not close on a tap outside
export const holdsDraft = overlay => [...overlay.querySelectorAll('textarea[data-draft]')].some(t => t.value.trim());

// Show the "Draft kept" line when a box was opened with a restored draft
export function showDraftHint(boxId) {
  const box = document.getElementById(boxId);
  const hint = box?.parentElement?.querySelector('.sheet-draft-kept');
  if (hint) hint.hidden = !box.value.trim();
}

if (typeof document !== 'undefined') {
  document.addEventListener('input', e => {
    const box = e.target.closest?.('textarea[data-draft]');
    if (!box) return;
    d().set(box.dataset.draft, box.value);
    if (!box.value.trim()) showDraftHint(box.id);
  });
  // Cancel closes the sheet; the draft stays
  document.addEventListener('click', e => {
    if (e.target.closest?.('[data-draft-cancel]')) document.querySelectorAll('.sheet-overlay').forEach(s => s.classList.remove('active'));
  });
}
