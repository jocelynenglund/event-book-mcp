// ===========================================
// OUTLINE ARRANGE - The parts of Arrange mode, each drawn from its own view alone
// A chapter's row (with ＋ Part here above it), a part's heading, the bar with Done, and ＋ Chapter at a group's end.
// Each takes the one view that feeds it and ui, this device's own state (which name is being typed); nothing here
// reads the book. A root carries data-component and data-key. The ⠿ grips are what a drag starts from (arrange/drag.js).
// ===========================================

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// A name being typed: Enter saves, Escape cancels (the screen listens)
const nameInput = (kind, value, label, placeholder) =>
  `<input type="text" class="sheet-input ola-input" data-arrange-input="${kind}" value="${escapeHtml(value)}" aria-label="${escapeHtml(label)}" placeholder="${escapeHtml(placeholder)}" maxlength="120" enterkeyhint="done" autocomplete="off">`;

// One chapter: ＋ Part here above it (when a part can start at it), then its grip, name (a tap renames it) and slice count.
// view: one row of Outline Arrange Rows. ui: renaming (its name is being typed), naming (the new part's name is)
export function outlineArrangeRow(row, ui = {}) {
  const gap = !row.canStartPart ? '' : `
    <div class="ola-gap">${ui.naming
      ? nameInput('new-part', '', `Name of a new part starting at ${row.name}`, 'Part name')
      : `<button class="ola-gap-btn" data-outline-action="arrange-part-open" data-chapter="${escapeHtml(row.chapterId)}" aria-label="Start a part at ${escapeHtml(row.name)}">＋ Part here</button>`}</div>`;
  const grip = row.editable
    ? `<span class="bd-grip ola-grip" data-drag="chapter" data-key="${escapeHtml(row.chapterId)}" title="Drag to move ${escapeHtml(row.name)}" aria-hidden="true">⠿</span>` : '';
  const name = ui.renaming ? nameInput('rename-chapter', row.name, `Rename ${row.name}`, 'Chapter name')
    : row.editable ? `<button class="ola-name" data-outline-action="arrange-rename" data-chapter="${escapeHtml(row.chapterId)}" aria-label="${escapeHtml(row.name)}: rename the chapter">${escapeHtml(row.name)}</button>`
    : `<span class="ola-name">${escapeHtml(row.name)}</span>`;
  return `
    <div class="ola-item" data-component="Outline arrange row" data-key="${escapeHtml(row.chapterId)}">${gap}
      <div class="ola-row" data-chapter="${escapeHtml(row.chapterId)}" ${row.editable ? `tabindex="0" aria-label="${escapeHtml(row.name)}. Alt with the up or down arrow moves it"` : ''}>
        ${grip}${name}<span class="ola-count">${row.count}</span>
      </div>
    </div>`;
}

// A part's heading: its grip (drag the whole part), name (a tap renames it), counts and ✕ (remove it; its chapters stay).
// view: Outline Arrange Part Heading. ui: renaming
export function outlineArrangePartHeading(part, ui = {}) {
  const grip = part.editable
    ? `<span class="bd-grip ola-grip" data-drag="part" data-part="${part.partId}" title="Drag to move the part ${escapeHtml(part.name)}" aria-hidden="true">⠿</span>` : '';
  const name = ui.renaming ? nameInput('rename-part', part.name, `Rename the part ${part.name}`, 'Part name')
    : part.editable ? `<button class="ola-name" data-outline-action="arrange-rename-part" data-part="${part.partId}" aria-label="${escapeHtml(part.name)}: rename the part">${escapeHtml(part.name)}</button>`
    : `<span class="ola-name">${escapeHtml(part.name)}</span>`;
  const remove = part.editable
    ? `<button class="ola-remove" data-outline-action="arrange-remove-part" data-part="${part.partId}" aria-label="Remove the part ${escapeHtml(part.name)} (its chapters stay)" title="Remove the part (its chapters stay)">✕</button>` : '';
  return `
    <div class="ola-part" data-component="Outline arrange part heading" data-key="${part.partId}">
      ${grip}${name}<span class="ola-count">${part.counts}</span>${remove}
    </div>`;
}

// The line over the rows: what this mode is, how big the book is, and Done. view: Outline Arrange Bar
export function outlineArrangeBar(view) {
  return `
    <div class="ola-bar" data-component="Outline arrange bar" data-key="arrange-bar">
      <span class="ola-bar-title">Arrange</span>
      <span class="ola-bar-text">${view.text}</span>
      <button class="ola-done" data-outline-action="arrange-done">Done</button>
    </div>`;
}

// ＋ Chapter at the end of a group. view: Outline Arrange Add Chapter. ui: naming (the new chapter's name is being typed)
export function outlineArrangeAddChapter(view, ui = {}) {
  const key = view.partId || 'none';
  return `
    <div class="ola-add" data-component="Outline arrange add chapter" data-key="${escapeHtml(key)}">${ui.naming
      ? nameInput('new-chapter', '', `Name of the new chapter ${view.where}`, 'Chapter name')
      : `<button class="ola-add-btn" data-outline-action="arrange-chapter-open" data-part="${escapeHtml(view.partId || '')}" aria-label="Add a chapter ${escapeHtml(view.where)}">＋ Chapter</button>`}</div>`;
}
