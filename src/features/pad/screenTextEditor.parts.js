// ===========================================
// PAD - The board's screen editor (component: Screen text editor)
// Drawn from one view (Screen Text Editor): the screen's name as the title, a text box with the Pad's screen notation, the window it draws as it is
// typed (the same Screen wireframe as the Pad's note), what the text maps (an input → its command, a view's fields → the screen, what it no longer says
// struck), and Cancel / Save. A slot under the box is where the names offered while typing show (suggestInput.js). Taps are told apart by
// data-stx-action; the box is #stxText and the window with its maps sit in [data-stx-live], which is all that is redrawn as she types.
// ===========================================

import { screenWire } from './screenWire.parts.js';

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function screenTextEditor(view) {
  return `
    <div class="stx" data-component="Screen text editor" data-key="${escapeHtml(view.elementId)}">
      <div class="sheet-title">Edit screen <span class="bd-sheet-sub">${escapeHtml(view.name)}</span></div>
      <textarea class="sheet-input stx-text" id="stxText" rows="8" spellcheck="false" autocomplete="off" aria-label="Screen text"
        placeholder="Basket&#10;{ Product List: sku, name }&#10;[ Quantity ] ( Add )">${escapeHtml(view.text)}</textarea>
      <div class="pad-suggest-slot stx-suggest" id="stxSuggest" hidden></div>
      <div class="stx-live" data-stx-live>
      <div class="stx-preview">${screenWire(view.wire)}</div>
      ${view.maps.length ? `<div class="stx-maps">${view.maps.map(m => `<div class="stx-map" data-kind="${m.label === '✕' ? 'clear' : 'map'}"><span class="stx-map-label">${escapeHtml(m.label)}</span> <span class="stx-map-text">${escapeHtml(m.text)}</span></div>`).join('')}</div>` : ''}
      </div>
      <div class="stx-actions">
        <button class="sheet-btn secondary" data-stx-action="cancel">Cancel</button>
        <button class="sheet-btn" data-stx-action="save">Save</button>
      </div>
    </div>`;
}
