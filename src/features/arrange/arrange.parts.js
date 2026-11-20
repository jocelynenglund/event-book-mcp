// ===========================================
// ARRANGE - Parts of the screens that arrange chapters, each drawn from its own view alone
// The bookend and the band on the Board's shelf, and the two sheets' sections (a chapter's arrange options, a part's
// menu). Each takes the one view that feeds it and ui, the device's local state (the grid place it sits in, whether it
// can be dragged); nothing here reads the book. A root carries data-component and data-key.
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const drag = (kind, ui) => ui.draggable ? ` data-drag="${kind}"` : '';

// A part's bookend: taller and darker than a spine, the part's name running up it, "n ch · m slices" under it;
// its ‹ folds the whole part into the bookend (› opens it again), a tap on the name opens the part's menu.
// ui: col, draggable
export function partBookend(part, ui = {}) {
  return `
    <div class="bd-bookend ${part.folded ? 'folded' : ''}" data-component="Board part bookend" data-key="${part.partId}" data-part="${part.partId}"${drag('part', ui)} style="grid-column: ${ui.col}; grid-row: 1 / span 6">
      <button class="bd-bookend-fold" data-action="fold-part" data-part="${part.partId}" aria-label="${part.folded ? 'Open' : 'Fold'} the part ${escapeHtml(part.name)}">${part.folded ? '›' : '‹'}</button>
      <button class="bd-bookend-name" data-action="part-menu" data-part="${part.partId}" title="${escapeHtml(part.name)}: rename or remove the part">${escapeHtml(part.name)}</button>
      <span class="bd-bookend-count">${part.counts}</span>
    </div>`;
}

// The part's name over its open chapters' headers, spanning their columns. ui: col, span
export function partBand(part, ui = {}) {
  return `<div class="bd-part-band" data-component="Board part band" data-key="${part.partId}" style="grid-column: ${ui.col} / span ${ui.span || 1}; grid-row: 1">${escapeHtml(part.name)}</div>`;
}

// A chapter's menu, the arranging part: earlier, later, the end of another part, a new part from here
export function chapterArrangeBox(v) {
  return `
    <div class="bd-arrange" data-component="Chapter arrange options" data-key="${escapeHtml(v.chapterId)}">
      <div class="bd-sheet-label">Arrange <span class="bd-label-note">or drag the chapter on the board</span></div>
      <div class="bd-move-row">
        <button class="sheet-btn secondary" data-board-action="arrange-step" data-chapter="${escapeHtml(v.chapterId)}" data-by="-1" ${v.canEarlier ? '' : 'disabled'}>◀ Move earlier</button>
        <button class="sheet-btn secondary" data-board-action="arrange-step" data-chapter="${escapeHtml(v.chapterId)}" data-by="1" ${v.canLater ? '' : 'disabled'}>Move later ▶</button>
      </div>
      ${v.parts.map(p => `
      <div class="sheet-option" data-board-action="arrange-into-part" data-chapter="${escapeHtml(v.chapterId)}" data-part="${p.partId}">
        <div class="sheet-option-icon" style="background: var(--surface-hover);">⇥</div>
        <div class="sheet-option-text"><div class="sheet-option-title">Move to the part ${escapeHtml(p.name)}</div></div>
      </div>`).join('')}
      ${v.startsPart ? '' : `
      <div class="bd-inline-form">
        <input type="text" class="sheet-input" id="bdNewPart" placeholder="＋ Part, starting at ${escapeHtml(v.name)}" aria-label="Name of a new part starting here">
        <button class="sheet-btn" data-board-action="start-part" data-chapter="${escapeHtml(v.chapterId)}">＋ Part</button>
      </div>`}
    </div>`;
}

// A part's menu: its name to change, and Remove part
export function partMenuBox(v) {
  return `
    <div data-component="Part menu" data-key="${v.partId}">
      <div class="sheet-title">Part</div>
      <div class="bd-inline-form">
        <input type="text" class="sheet-input" id="bdPartName" value="${escapeHtml(v.name)}" placeholder="Part name" aria-label="Part name">
        <button class="sheet-btn" data-board-action="rename-part" data-part="${v.partId}">Save</button>
      </div>
      <div class="sheet-options">
        <div class="sheet-option" data-board-action="remove-part" data-part="${v.partId}">
          <div class="sheet-option-icon" style="background: var(--surface-hover);">✕</div>
          <div class="sheet-option-text">
            <div class="sheet-option-title">Remove part</div>
            <div class="sheet-option-desc">${escapeHtml(v.removeNote)}</div>
          </div>
        </div>
      </div>
    </div>`;
}
