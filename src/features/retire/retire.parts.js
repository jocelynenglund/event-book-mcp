// ===========================================
// RETIRE - Parts, each drawn from its own view alone (Ready To Retire, Retired Shelf, Built From).
// Nothing here reads the books. A root carries data-component and data-key.
// ===========================================

import { librarySection } from '../library/rowView.js';

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// In a plan's details: what it is built into (or how far it is), and Retire once every slice is built.
// v: a Ready To Retire view. Nothing for a plan with nothing built.
export function retireBox(v) {
  if (!v.text && !v.canAnyway) return '';
  return `<div class="rt-box" data-component="Retire box" data-key="${escapeHtml(v.modelId)}">
      ${v.text ? `<span class="rt-mark">${escapeHtml(v.text)}${v.retired && !/^retired/.test(v.text) ? ' · retired' : ''}</span>` : ''}
      ${v.canAnyway && !v.ready ? `<button class="ed-btn" data-library-action="retire-anyway" data-model="${escapeHtml(v.modelId)}">Retire anyway: I know it's built</button>` : ''}
      ${v.ready ? `<button class="ed-btn" data-library-action="retire" data-model="${escapeHtml(v.modelId)}">Retire plan</button>` : ''}
    </div>`;
}

// The folded shelf at the bottom of the Bookshelves. v: a Retired Shelf view; ui: as librarySection's. Nothing when none.
export function retiredShelfBox(v, ui = {}) {
  if (!v.count) return '';
  const rows = `<ul class="rt-rows">${v.rows.map(r => `
      <li><button class="rt-row" data-library-action="open" data-model="${escapeHtml(r.id)}">${escapeHtml(r.text)}</button></li>`).join('')}
    </ul>`;
  return `<div data-component="Retired shelf" data-key="retired">${librarySection({ key: 'retired', title: 'Retired', count: v.count, countText: String(v.count), noun: 'plan' }, ui, rows)}
    </div>`;
}

// In a build book's edition: the plans built into it, each to open. v: a Built From view. Nothing when none.
export function builtFromList(v) {
  if (!v.plans.length) return '';
  return `<div class="rt-built-from" data-component="Built from" data-key="${escapeHtml(`${v.app}-${v.edition}`)}">
      <span class="rt-built-label">Built from</span>
      ${v.plans.map(p => `<button class="bv-btn rt-plan" data-library-action="open" data-model="${escapeHtml(p.id)}">${escapeHtml(p.title)}</button>`).join('\n      ')}
    </div>`;
}

// The confirm sheet for Retire anyway. v: a Retire Anyway Confirm view.
export function retireAnywaySheet(v) {
  return `<div class="ed-sheet-card rt-anyway" data-component="Retire anyway sheet" data-key="${escapeHtml(v.modelId)}">
      <p class="rt-anyway-text">${escapeHtml(v.text)}</p>
      <ul class="rt-anyway-list">${v.unconfirmed.map(n => {
        const notes = (v.evidence || []).find(e => e.slice === n)?.notes || [];
        return `<li>${escapeHtml(n)}${notes.map(x => `\n<div class="rt-evidence">Evidence: ${escapeHtml(x)}</div>`).join('')}</li>`;
      }).join('')}</ul>
      <div class="ed-actions">
        <button class="ed-btn primary" data-library-action="retire-anyway-go" data-model="${escapeHtml(v.modelId)}">Retire</button>
        <button class="ed-btn" data-library-action="close">Cancel</button>
      </div>
    </div>`;
}
