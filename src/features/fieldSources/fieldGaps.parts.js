// ===========================================
// FIELD SOURCES - Parts: the ⚠ on a field with no source, the sheet it opens, and the "n fields with no source" line
// Each draws from the view that feeds it alone (Sticky Field Gaps, Field Gap Sheet); nothing here reads the book.
// A root carries data-component and data-key.
// ===========================================

import { completenessText } from './text.js';

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The small ⚠ after a field with no source; tap: why, and the fix. field: one of Sticky Field Gaps' gap fields,
// with its sticky and slice ({ elementId, sliceId, name, why, fix }). The screens' own tap (data-action on the
// board, data-slice-page on the slice page) is told apart by `where`.
export function fieldGapMark(field, where = 'board') {
  const tap = where === 'page' ? 'data-slice-page="field-gap"' : 'data-action="field-gap"';
  return `<span class="fg-mark" role="button" tabindex="0" aria-label="${escapeHtml(field.name)} ${field.tidy ? 'needs tidying' : 'has no source'}: ${escapeHtml(field.why)}" title="${escapeHtml(field.why)}" data-component="Field gap mark" data-key="${escapeHtml(`${field.elementId}:${field.name}`)}" ${tap} data-el="${field.elementId}" data-slice="${field.sliceId}" data-field="${escapeHtml(field.name)}">⚠</span>`;
}

// "⚠ 3 fields with no source · 1 sticky to tidy", under a chapter's name or a slice's row (nothing when there are
// none). A button: it opens the fix list of its slice or chapter. long: the Outline's "⚠ Information completeness: …";
// where: the screen that owns the tap (data-action on the board, data-outline-action in the Outline)
export function noSourceMark(n, { long = false, tidy = 0, where = 'board', slice = '', chapter = '' } = {}) {
  const label = completenessText(n, tidy);
  if (!label) return '';
  const tap = where === 'outline' ? 'data-outline-action="fix-list"' : 'data-action="fix-list"';
  const at = `${slice ? ` data-slice="${slice}"` : ''}${chapter ? ` data-chapter="${chapter}"` : ''}`;
  return `<span class="fg-count" role="button" tabindex="0" ${tap}${at} data-no-source="${n}" title="See what is missing, and fix it">⚠ ${long ? 'Information completeness: ' : ''}${label}</span>`;
}

// The sheet a ⚠ opens: why, the fix, and (where she may change the book) Set by the system…, which asks how
export function fieldGapSheetBody(form) {
  const key = escapeHtml(`${form.elementId}:${form.field}`);
  const data = `data-el="${form.elementId}" data-slice="${form.sliceId}" data-field="${escapeHtml(form.field)}"`;
  const chips = ['new id', 'the clock', 'computed from other fields'].map(how => `<button class="bd-chip fg-how-chip" data-board-action="fg-how" data-how="${escapeHtml(how)}">${escapeHtml(how)}</button>`).join('');
  const action = !form.canMark ? ''
    : form.asking ? `
      <label class="bd-sheet-label" for="fgHow">How does it come about?</label>
      <input type="text" class="sheet-input" id="fgHow" placeholder="new id, the clock, computed from items" value="${escapeHtml(form.how || '')}" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done">
      <div class="fg-how-chips">${chips}</div>
      <div class="fg-actions"><button class="sheet-btn secondary" data-board-action="close">Cancel</button><button class="sheet-btn" data-board-action="fg-set" ${data}>Set by the system</button></div>`
    : `<div class="fg-actions"><button class="sheet-btn secondary" data-board-action="close">Close</button><button class="sheet-btn" data-board-action="fg-ask" ${data}>Set by the system…</button></div>`;
  // Comes from… (where she may change the book) and Trace (anywhere), for a field of a sticky (not for a Given's event)
  const more = form.field === '(the event)' || form.asking ? '' : `
      <div class="fg-more">${form.canMark ? `<button class="bd-chip" data-board-action="fg-map" ${data}>Comes from…</button>` : ''}<button class="bd-chip" data-board-action="fg-trace" ${data}>⤳ Trace</button></div>`;
  return `
    <div class="fg-sheet" data-component="Field gap sheet" data-key="${key}">
      <div class="fg-kicker">Information completeness</div>
      <div class="sheet-title">⚠ ${escapeHtml(form.field)} <span class="bd-sheet-sub">on ${escapeHtml(form.sticky)}</span></div>
      <p class="fg-why">${escapeHtml(form.why)}.</p>
      <p class="fg-fix"><b>Fix:</b> ${escapeHtml(form.fix)}.</p>
      <p class="fg-hint">A hint while you plan, never a block: the slice can still be refined.</p>${more}
      ${action}
      ${form.canMark ? '' : '<div class="fg-actions"><button class="sheet-btn secondary" data-board-action="close">Close</button></div>'}
    </div>`;
}
