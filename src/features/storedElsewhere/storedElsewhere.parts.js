// ===========================================
// STORED ELSEWHERE - Parts, each drawn from its own view alone (a root carries data-component and data-key)
//   Stored as sheet (Stored As Choices), Pad storage tag (Pad Notes: the kind an orange note says it is stored as)
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// On an orange Pad note that says "(table)": a small tag with the kind. view: { noteId, kind }
export const padStorageTag = v => `<span class="se-tag" data-component="Pad storage tag" data-key="${escapeHtml(v.noteId)}" title="Stored as ${escapeHtml(v.kind)}, not as events">${escapeHtml(v.kind.toUpperCase())}</span>`;

// The sheet: kind (free text, with chips), an optional name, Save / Clear
export const storedAsSheet = v => `
    <div class="se-sheet" data-component="Stored as sheet" data-key="${escapeHtml(v.elementId)}" data-el="${escapeHtml(v.elementId)}">
      <div class="sheet-title">Stored as… <span class="bd-sheet-sub">${escapeHtml(v.name)}</span></div>
      <p class="sy-p">Not every sticky is saved as events: a table, a config file, a document. Say where it is kept instead.</p>
      <label class="bd-sheet-label" for="seKind">Kind</label>
      <input type="text" class="sheet-input" id="seKind" value="${escapeHtml(v.kind)}" placeholder="table, config, document…" maxlength="30" autocomplete="off">
      <div class="se-chips">${v.chips.map(c => `<button type="button" class="se-chip" data-board-action="stored-kind" data-kind="${escapeHtml(c.kind)}"${c.recent ? ' data-recent="true"' : ''}>${escapeHtml(c.kind)}</button>`).join('')}</div>
      <label class="bd-sheet-label" for="seName">Name (optional)</label>
      <input type="text" class="sheet-input" id="seName" value="${escapeHtml(v.storedName)}" placeholder="The table or file: Friends, pricing.json" maxlength="80" autocomplete="off">
      <div class="se-actions">
        <button class="sheet-btn" data-board-action="stored-save">Save</button>
        ${v.stored ? '<button class="sheet-btn secondary" data-board-action="stored-clear">Clear: a plain event again</button>' : ''}
      </div>
    </div>`;
