// ===========================================
// ARRANGE - Parts of the screens that arrange chapters, each drawn from its own view alone
// The tab and the sliver of a part on the Board's shelf, and the two sheets' sections (a chapter's arrange options, a part's
// menu). Each takes the one view that feeds it and ui, the device's local state (the grid place it sits in, whether it
// can be dragged); nothing here reads the book. A root carries data-component and data-key.
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// A part's divider tab, sticking up over its chapters with a rule under it across the whole part: the ‹ that folds the
// part to a sliver (› opens it again), its name (a tap opens the part's menu) and its counts. The whole tab is the
// grip the part is dragged by. ui: col, span (the columns of the part), draggable
export function partTab(part, ui = {}) {
  const label = `
      <button class="bd-part-tab-fold" data-action="fold-part" data-part="${part.partId}" aria-label="${part.folded ? 'Open' : 'Fold'} the part ${escapeHtml(part.name)}">${part.folded ? '›' : '‹'}</button>
      <button class="bd-part-tab-name" data-action="part-menu" data-part="${part.partId}" title="${escapeHtml(part.name)}: rename or remove the part">${escapeHtml(part.name)}</button>
      ${part.folded ? '' : `<span class="bd-part-tab-counts">${part.counts}</span>`}`;
  return `
    <div class="bd-part-tab ${part.folded ? 'folded' : ''}" data-component="Board part tab" data-key="${part.partId}" style="grid-column: ${ui.col} / span ${ui.span || 1}; grid-row: 1">
      ${ui.draggable
        ? `<div class="bd-part-tab-label bd-grip" data-drag="part" data-part="${part.partId}" title="Drag to move the part ${escapeHtml(part.name)}">${label}</div>`
        : `<div class="bd-part-tab-label">${label}</div>`}
    </div>`;
}

// A folded part's chapters, squeezed into one thin sliver of a spine under its tab. ui: col
export function partSliver(part, ui = {}) {
  return `<div class="bd-part-sliver" data-component="Board part sliver" data-key="${part.partId}" style="grid-column: ${ui.col}; grid-row: 1 / span 6" role="img" aria-label="The part ${escapeHtml(part.name)}, folded"></div>`;
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
