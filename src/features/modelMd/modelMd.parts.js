// ===========================================
// MODEL.MD - Parts: the report after an import, the paste sheet, the two Export options
// Each draws from the one view it is handed and nothing else (no book, no store). A root carries data-component and data-key.
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n = (count, one, many) => `${count} ${count === 1 ? one : many}`;

// Import Report → the sheet shown right after an import. A gap's slice and sticky link the way the completeness list's do
export function importReportSheet(v) {
  const c = v.counts;
  const notes = v.notes.length ? `
    <div class="mm-section"><div class="ti-h">Kept as notes (${v.notes.length})</div><ul class="ti-list">${v.notes.map(k => `<li>${k.slice ? `<span class="mm-slice">${escapeHtml(k.slice)}</span> ` : ''}${escapeHtml(k.kept)}</li>`).join('')}</ul></div>` : '';
  const gaps = v.total ? `
    <div class="mm-section"><div class="ti-h">Gaps (${v.total})</div>${v.gaps.map(g => `
      <div class="mm-group">${g.sliceId ? `<button type="button" class="fx-link fx-slice-link" data-board-action="fx-go-slice" data-slice="${g.sliceId}" data-chapter="${g.chapterId || ''}">${escapeHtml(g.slice)}</button>` : `<span class="mm-slice">${escapeHtml(g.slice)}</span>`}
        ${g.rows.map(r => `<div class="mm-gap">${g.sliceId ? `<button type="button" class="fx-link" data-board-action="fx-go-el" data-el="${r.elementId}" data-slice="${g.sliceId}" data-chapter="${g.chapterId || ''}">${escapeHtml(r.sticky)}</button>` : escapeHtml(r.sticky)}: ${escapeHtml(r.why)}</div>`).join('')}
      </div>`).join('')}</div>` : '<p class="mm-clean">No gaps: every field has a source and every event is recorded by a slice.</p>';
  return `
    <div class="mm-report" data-component="Model md report" data-key="${escapeHtml(v.title)}">
      <div class="sheet-title">${escapeHtml(v.title)} <span class="bd-sheet-sub">imported from model.md</span></div>
      <p class="ti-line">${n(c.chapters, 'chapter', 'chapters')} · ${n(c.slices, 'slice', 'slices')} · ${n(c.scenarios, 'scenario', 'scenarios')}${v.notes.length ? '' : ' · no skipped lines'}</p>
      ${v.refined ? `<p class="mm-line">${n(v.refined, 'slice is', 'slices are')} marked ✓ in the file: not carried over, Refined is yours to tick.</p>` : ''}${notes}${gaps}
      <button class="sheet-btn" data-board-action="close">Read the model</button>
    </div>`;
}

// Paste Form → ☰ → Import model.md: a file, or pasted text
export function pasteSheet(v) {
  return `
    <div class="mm-paste" data-component="Model md paste" data-key="form">
      <div class="sheet-title">Import a model.md</div>
      <p class="mm-line">${escapeHtml(v.hint)}</p>
      <label class="sheet-btn secondary mm-file">Choose a file<input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" style="display:none" onchange="window.EventPad.modelMdPicked(this)"></label>
      <textarea class="sheet-input cm-box" id="mmText" rows="9" placeholder="${escapeHtml(v.placeholder)}"></textarea>
      <button class="sheet-btn" data-board-action="mm-import">Import</button>
    </div>`;
}

// Export Options → the two lines of ☰ → Export…
export function exportOptionLines(v) {
  return v.options.map(o => `
      <div class="sheet-option" data-component="Model md export option" data-key="${escapeHtml(o.notation)}" onclick="window.EventPad.hideSheets(); window.EventPad.exportModelMd('${escapeHtml(o.notation)}')">
        <div class="sheet-option-icon" style="background: var(--surface-hover);">✎</div>
        <div class="sheet-option-text"><div class="sheet-option-title">${escapeHtml(o.title)}</div>
          <div class="sheet-option-desc">${escapeHtml(o.desc)}</div></div>
      </div>`).join('');
}
