// ===========================================
// PAD - The parts of the Pad screen, each drawn from its own view alone
// A plain note, a frame, the toolbar, the colour swatches, the empty hint, the Make chapter preview and the Update chapter preview. Each takes the one view
// that feeds it (which already says what is selected and what is being typed: that is this device's); nothing here reads the book. A root
// carries data-component and data-key. Taps are told apart by data-pad-action, drags by data-pad-note / data-pad-frame.
// ===========================================

import { screenWire } from './screenWire.parts.js';

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// One sticky note: a plain coloured square: its first line a small bold title, a thin line, the rest left-aligned below. Selected, it offers ✕; being typed, it is a
// text box in place. A note in several places (linked copies) says how many. view: one note of Pad Notes
export function padNote(note) {
  const scenario = s => `<div class="pad-note-text"><div class="pad-note-title">${escapeHtml(note.title)}</div>${s.rows.length ? `<div class="pad-scn-rows">${s.rows.map(r => `<div class="pad-scn-row" ${r.kw ? `data-kw="${r.kw}"` : ''} ${r.continues ? 'data-and="true"' : ''}><span class="pad-scn-label">${r.label}</span><span class="pad-scn-text">${escapeHtml(r.text)}</span></div>`).join('')}</div>` : ''}</div>`;
  const automation = a => `<div class="pad-note-text"><div class="pad-note-title"><span class="pad-gear" aria-hidden="true">⚙</span> ${escapeHtml(a.title)}</div>${a.rows.length ? `<div class="pad-auto-rows">${a.rows.map(r => `<div class="pad-auto-row" data-kind="${r.kind}">${r.kind === 'reads' ? '<span class="pad-auto-word">reads</span> ' : r.kind === 'target' ? '<span class="pad-auto-word">→</span> ' : ''}${escapeHtml(r.text)}</div>`).join('')}</div>` : ''}</div>`;
  const body = note.editing
    ? `<textarea class="pad-note-input" data-pad-input="note" aria-label="Note text" spellcheck="false">${escapeHtml(note.text)}</textarea>`
    : note.scenario ? scenario(note.scenario)
    : note.screen ? screenWire(note.screen)
    : note.automation ? automation(note.automation)
    : `<div class="pad-note-text"><div class="pad-note-title">${escapeHtml(note.title)}</div>${note.bodyLines.length ? `<div class="pad-note-body">${escapeHtml(note.bodyLines.join('\n'))}</div>` : ''}</div>`;
  return `
    <div class="pad-note" data-component="Pad note" data-key="${escapeHtml(note.noteId)}" data-pad-note="${escapeHtml(note.noteId)}" data-colour="${note.colour}" data-size="${note.size}" ${note.external ? 'data-external="true"' : ''}
         ${note.selected ? 'data-selected="true"' : ''} style="left:${note.x}px;top:${note.y}px" aria-label="${escapeHtml(`${note.colour} note`)}">
      ${body}
      ${note.places > 1 ? `<button type="button" class="pad-note-link" data-pad-action="note-places" data-note="${escapeHtml(note.noteId)}" title="${escapeHtml(`The same note in ${note.places} places: tap to see them`)}" aria-label="${escapeHtml(`The same note in ${note.places} places`)}">🔗 ${note.places}</button>` : ''}
      ${note.selected && note.editable && !note.editing ? `<button class="pad-note-x" data-pad-action="remove-note" data-note="${escapeHtml(note.noteId)}" aria-label="Remove the note" title="Remove the note">✕</button>` : ''}
    </div>`;
}

// A dashed frame round a sketched slice: its name on top (its own, else its command's or view's title greyed; tap it to rename), where Make
// chapter put it (a short ✓ chip that opens the chapter, saying "changed since" with an Update chapter button when the sketch moved on)
// and how many notes are in it. Its body lets everything through (the notes inside are drawn above it); it is moved by its top edge and
// resized by its corner. view: one frame of Pad Frames
export function padFrame(frame) {
  const name = frame.editing
    ? `<input class="pad-frame-input" data-pad-input="frame" value="${escapeHtml(frame.name)}" placeholder="Name this slice" maxlength="120" aria-label="Name of the slice" autocomplete="off">`
    : `<span class="pad-frame-name${frame.nameIsDefault ? ' default' : ''}" data-pad-frame-name="${escapeHtml(frame.frameId)}">${escapeHtml(frame.shownName)}</span>`;
  const chip = frame.chip ? `<button class="pad-frame-chip" data-pad-action="open-chapter" data-chapter="${escapeHtml(frame.chapter.chapterId)}" title="${escapeHtml(frame.chip.title)}"><span class="pad-frame-tick">✓</span> <span class="pad-frame-chip-text">${escapeHtml(frame.chip.label)}</span>${frame.chip.changedText ? ` <span class="pad-frame-changed">· ${escapeHtml(frame.chip.changedText)}</span>` : ''}</button>` : '';
  return `
    <div class="pad-frame" data-component="Pad frame" data-key="${escapeHtml(frame.frameId)}" data-pad-frame="${escapeHtml(frame.frameId)}" ${frame.selected ? 'data-selected="true"' : ''}
         ${frame.made ? 'data-made="true"' : ''} ${frame.changed ? 'data-changed="true"' : ''} style="left:${frame.x}px;top:${frame.y}px;width:${frame.w}px;height:${frame.h}px">
      <div class="pad-frame-head" data-pad-frame-head="${escapeHtml(frame.frameId)}">
        ${name}
        ${chip}
        ${frame.canUpdate ? `<button class="pad-frame-update" data-pad-action="update-chapter" data-frame="${escapeHtml(frame.frameId)}" title="Carry what changed in this sketch over to its slice">Update chapter</button>` : ''}
        ${frame.warning ? `<span class="pad-frame-warn">⚠ ${escapeHtml(frame.warning)}</span>` : ''}
        <span class="pad-frame-count">${plural(frame.noteCount, 'note', 'notes')}</span>
      </div>
      ${frame.editable ? `<span class="pad-frame-grip" data-pad-frame-resize="${escapeHtml(frame.frameId)}" aria-hidden="true"></span>` : ''}
    </div>`;
}

// The buttons along the top, in groups that keep their places: Create, Selection (greyed, with the reason as its title, when it does not apply), Zoom.
// view: Pad Toolbar
export function padToolbar(view) {
  const btn = (action, label, extra = '') => `<button class="pad-btn" data-pad-action="${action}" ${extra}>${label}</button>`;
  const slot = (s, action, label, title) => btn(action, label, s.enabled ? `title="${escapeHtml(title)}"` : `aria-disabled="true" title="${escapeHtml(s.why)}"`);
  const edit = view.editable ? `
      <div class="pad-group" role="group" aria-label="Create">
        ${btn('add-note', '＋ Note', 'title="Add a note (or double-click the canvas)"')}
        ${btn('add-many', '＋ Events', 'title="Add many events at once: paste a list, one event per line"')}
        ${btn('add-frame', '▭ Frame', `title="${view.wrapsSelection ? 'A frame round the selected notes' : 'Draw a frame round a sketched slice'}"`)}
      </div>
      <div class="pad-group" role="group" aria-label="Selection">
        ${slot(view.copy, view.copy.action, `${view.copy.action === 'unlink' ? '' : '🔗 '}${view.copy.label}`, view.copy.action === 'unlink' ? 'Make the selected notes notes of their own' : 'A linked copy of the selected notes: the same note in another place (or Alt-drag a note)')}
        ${slot(view.remove, 'remove-selected', '✕ Remove', 'Remove the selection (the notes in a frame stay)')}
        ${slot(view.makeChapter, 'make-chapter', 'Make chapter…', 'Build the selected frames into a chapter on the board')}
        <span class="pad-selected" aria-live="polite">${escapeHtml(view.selected)}</span>
      </div>` : '';
  return `
    <div class="pad-toolbar" data-component="Pad toolbar" data-key="pad-toolbar">
      ${edit}
      <div class="pad-group pad-zoom" role="group" aria-label="Zoom">${btn(view.mode.action, view.mode.label, `title="${escapeHtml(view.mode.title)}"`)}${btn('zoom-out', '−', 'aria-label="Zoom out"')}<span class="pad-zoom-text">${view.zoomText}</span>${btn('zoom-in', '＋', 'aria-label="Zoom in"')}${btn('fit', 'Fit', 'title="Fit everything on the screen"')}${btn(view.guide.action, view.guide.label, `title="${escapeHtml(view.guide.title)}" aria-label="Notation guide"`)}</div>
    </div>`;
}

// Eight plain colours, no words: drag one onto the canvas for a note, tap to colour the selection. view: Pad Swatches
export function padSwatches(view) {
  return `
    <div class="pad-swatches" data-component="Pad swatches" data-key="pad-swatches" role="group" aria-label="Note colours">
      ${view.swatches.map(s => `<button class="pad-swatch" data-pad-swatch="${s.colour}" data-colour="${s.colour}" ${s.current ? 'data-current="true"' : ''} aria-pressed="${s.current}" aria-label="${escapeHtml(s.label)}" title="${escapeHtml(s.label)}: drag onto the canvas, or tap to colour the selection"></button>`).join('')}
    </div>`;
}

// One kind of note, written out: its name, what it is for, how it is written, its example drawn as that note (the Pad note component), and
// "Add this example" when the book can be changed. Used by the hover card and by each entry of the guide.
const kindBody = (k, canAdd) => `
      <div class="pad-kind-name">${escapeHtml(k.name)}</div>
      <p class="pad-kind-purpose">${escapeHtml(k.purpose)}</p>
      <ul class="pad-kind-format">${k.format.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
      <div class="pad-kind-example">${padNote(k.example)}</div>
      ${canAdd ? `<button class="pad-kind-add" data-pad-action="add-example" data-colour="${escapeHtml(k.colour)}">Add this example</button>` : ''}`;

// The card that opens on a colour of the strip. view: Pad Kind Card
export function padKindCard(view) {
  return `
    <div class="pad-kind-card" data-component="Pad kind card" data-key="${escapeHtml(view.colour)}" role="dialog" aria-label="${escapeHtml(view.name)} note">${kindBody(view, view.canAdd)}
    </div>`;
}

// The notation guide: each kind, then the Pad in short. view: Pad Guide
export function padGuide(view) {
  return `
    <div class="pad-guide" data-component="Pad guide" data-key="pad-guide">
      <div class="sheet-title">Notation guide</div>
      <p class="pad-guide-intro">Each colour of note means something. Type it as in the example; Make chapter reads it.</p>
      ${view.kinds.map(k => `<section class="pad-guide-kind" data-kind="${escapeHtml(k.colour)}">${kindBody(k, view.canAdd)}</section>`).join('')}
      <div class="pad-guide-rules-title">The Pad in short</div>
      <ul class="pad-guide-rules">${view.rules.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
      <button class="sheet-btn" data-pad-action="guide-close">Close</button>
    </div>`;
}

// ＋ Events, the sheet's top: a box for the list, with a slot under it for the preview (whose Add button comes first). view: Pad Bulk Form
export function padBulkForm(view) {
  return `
    <div class="pad-bulk" data-component="Pad bulk form" data-key="pad-bulk-form">
      <div class="sheet-title">Add events</div>
      <label class="pad-make-label" for="padBulkText">One event per line</label>
      <div class="pad-bulk-hint">Name(field, field) adds fields</div>
      <textarea class="sheet-input pad-bulk-text" id="padBulkText" rows="4" autocomplete="off" spellcheck="false" placeholder="Booking requested&#10;- Reminder sent&#10;Recall attempted(cycleId)" data-draft="pad-bulk">${escapeHtml(view.text)}</textarea>
      <div class="sheet-draft-kept" hidden>Draft kept</div>
      <div id="padBulkSuggest" class="pad-suggest-slot" data-layout="inline" hidden></div>
      <div id="padBulkPreview"></div>
    </div>`;
}

// ＋ Events, what it will add: the button first (so it stays in reach above the keyboard), then how many, and the first lines. view: Pad Bulk Preview
export function padBulkPreview(view) {
  return `
    <div class="pad-bulk-preview" data-component="Pad bulk preview" data-key="pad-bulk-preview">
      <button class="sheet-btn primary" data-pad-action="bulk-add" ${view.canAdd ? '' : 'disabled'}>${escapeHtml(view.label)}</button>
      <button class="sheet-btn secondary" data-draft-cancel>Cancel</button>
      <div class="pad-bulk-count">${escapeHtml(view.countText)}</div>
      ${view.lines.map(l => `<div class="pad-bulk-line"><span class="pad-bulk-title">${escapeHtml(l.title)}</span>${l.fields.length ? `<span class="pad-bulk-fields">${escapeHtml(l.fields.join(', '))}</span>` : ''}</div>`).join('')}
      ${view.more ? `<div class="pad-bulk-more">and ${view.more} more</div>` : ''}
    </div>`;
}

// The names offered while typing: a list under the box on a computer, a row of chips above the keyboard on a phone (the layout is the
// CSS's and the mount's). Tapping one is data-pad-suggest="<index>"; the highlighted one (arrow keys) says so. view: Pad Suggestions
export function padSuggestions(view) {
  if (!view.visible) return '';
  return `
    <div class="pad-suggest" data-component="Pad suggestions" data-key="pad-suggest" role="listbox" aria-label="Suggestions">
      ${view.items.map(i => `<button type="button" class="pad-suggest-item" role="option" data-pad-suggest="${i.index}" data-kind="${escapeHtml(i.kind)}" ${view.active === i.index ? 'data-active="true" aria-selected="true"' : 'aria-selected="false"'}><span class="pad-suggest-name">${escapeHtml(i.name)}</span>${i.label ? `<span class="pad-suggest-kind">${escapeHtml(i.label)}</span>` : ''}</button>`).join('')}
    </div>`;
}

// The command that makes the selected event: a tap on "Made by <Command> ↗" jumps to its frame; two commands is a warning with a jump each. view: Pad Event Maker
export function padEventMaker(view) {
  if (!view.visible) return '';
  if (view.none) return `<div class="pad-maker" data-component="Pad event maker" data-key="pad-event-maker" data-none="true"><span class="pad-maker-none">${escapeHtml(view.none)}</span></div>`;
  const jump = m => `<button type="button" class="pad-maker-jump" data-pad-action="jump-maker" data-frame="${escapeHtml(m.frameId)}" title="Go to the slice that makes ${escapeHtml(view.event)}">${escapeHtml(view.warning ? `${m.command} ↗` : m.label)}</button>`;
  return `
    <div class="pad-maker" data-component="Pad event maker" data-key="pad-event-maker" ${view.warning ? 'data-warning="true"' : ''}>
      ${view.warning ? `<span class="pad-maker-warn" role="alert">${escapeHtml(view.warning)}</span>` : ''}${view.makers.map(jump).join('')}
    </div>`;
}

// The list a note's 🔗 N opens (in the sheet): "<Name> is in N places", a row per place with the frame it is in (or loose), "here", "original"
// and "made here", and ↗ to go to each place but the one you came from. view: Pad Note Places
export function padNotePlaces(view) {
  const row = r => `
      <div class="pad-place-row${r.here ? ' here' : ''}" data-place="${escapeHtml(r.noteId)}">
        <span class="pad-place-where${r.where === 'loose' ? ' loose' : ''}">${escapeHtml(r.where)}</span>
        ${r.here ? '<span class="pad-place-chip">here</span>' : ''} ${r.original ? '<span class="pad-place-chip">original</span>' : ''} ${r.made ? '<span class="pad-place-chip made">made here</span>' : ''}
        ${r.here ? '' : `<button type="button" class="pad-place-go" data-pad-action="places-go" data-note="${escapeHtml(r.noteId)}" aria-label="Go to the copy ${escapeHtml(r.where === 'loose' ? 'that is loose' : `in ${r.where}`)}">↗</button>`}
      </div>`;
  return `
    <div class="pad-places" data-component="Pad note places" data-key="${escapeHtml(view.noteId)}">
      <div class="sheet-title">${escapeHtml(view.name)} is in ${view.count} places</div>
      <div class="pad-places-list">${view.rows.map(row).join('')}</div>
    </div>`;
}

// The line on an empty canvas. view: Pad Hint
export function padHint(view) {
  return `<div class="pad-hint" data-component="Pad hint" data-key="pad-hint">${escapeHtml(view.text)}</div>`;
}

// Make chapter…: the chapter's name, then each frame as a slice with its lines (the ones that are not fields can be unticked).
// view: Pad Make Chapter
export function padMakeChapter(view) {
  const lineRows = l => `<div class="pad-make-scn">${l.rows.map(r => `<div class="pad-scn-row"><span class="pad-scn-label${r.label.length > 1 ? ' pad-scn-sym' : ''}">${escapeHtml(r.label)}</span><span class="pad-scn-text">${escapeHtml(r.text)}</span></div>`).join('')}${l.warnings.map(w => `<div class="pad-make-warn" role="alert">⚠ ${escapeHtml(w)}</div>`).join('')}</div>`;
  const line = l => `
        <li class="pad-make-line" data-role="${l.role}" ${l.included ? '' : 'data-off="true"'}>
          <label>${l.tickable ? `<input type="checkbox" data-pad-line="${escapeHtml(l.key)}" ${l.included ? 'checked' : ''} aria-label="Include ${escapeHtml(l.text)}">` : ''}
            ${l.role === 'field' ? '' : `<span class="pad-make-role">${l.label ?? l.role}</span>`}<span class="pad-make-name">${escapeHtml(l.name)}</span>${l.note || l.via ? `<span class="pad-make-note">${escapeHtml(l.note || `from ${l.via}`)}</span>` : ''}</label>
          ${(l.role === 'scenario' || l.role === 'screen' || l.role === 'automation') && l.included ? lineRows(l) : ''}
        </li>`;
  const slice = s => `
      <section class="pad-make-slice" data-frame="${escapeHtml(s.frameId)}">
        <label class="pad-make-label" for="padSlice_${escapeHtml(s.frameId)}">Slice name</label>
        <input class="sheet-input" id="padSlice_${escapeHtml(s.frameId)}" data-pad-make="slice" data-frame="${escapeHtml(s.frameId)}" value="${escapeHtml(s.name)}" maxlength="120" autocomplete="off">
        ${s.why ? `<div class="pad-make-why">${escapeHtml(s.why)}</div>` : `<ul class="pad-make-lines">${s.lines.map(line).join('')}</ul>`}
      </section>`;
  return `
    <div class="pad-make" data-component="Pad make chapter" data-key="pad-make">
      <div class="sheet-title">Make a chapter</div>
      <label class="pad-make-label" for="padChapterName">Chapter name</label>
      <input class="sheet-input" id="padChapterName" data-pad-make="chapter" value="${escapeHtml(view.chapterName)}" maxlength="120" autocomplete="off">
      <div class="pad-make-sub">This book's board${view.existing ? ' (joins the chapter of that name)' : ''} · ${view.summary}</div>
      ${view.leftOut.map(l => `<div class="pad-make-warn" role="alert">⚠ Left out of ${escapeHtml(l.slice || 'a frame')}: ${l.names.map(escapeHtml).join(', ')} (a slice has one command or view)</div>`).join('')}
      ${view.madeTwice.map(w => `<div class="pad-make-warn" role="alert">⚠ ${escapeHtml(w.event)} is also made by ${w.others.map(escapeHtml).join(', ')} (one command makes an event)</div>`).join('')}
      ${view.slices.map(slice).join('')}
      <div class="pad-make-actions">
        <button class="sheet-btn" data-pad-action="make-cancel">Cancel</button>
        <button class="sheet-btn primary" data-pad-action="make-go" ${view.canMake ? '' : 'disabled'}>Make chapter</button>
      </div>
    </div>`;
}

// Update chapter…: what will change on the board, and what stays there though the sketch no longer has it. view: Pad Update Chapter
export function padUpdateChapter(view) {
  return `
    <div class="pad-update" data-component="Pad update chapter" data-key="pad-update">
      <div class="sheet-title">Update chapter</div>
      <div class="pad-make-sub">${escapeHtml(view.chapterName)}</div>
      ${view.changes.length ? `<ul class="pad-update-list">${view.changes.map(c => `<li>${escapeHtml(c.text)}</li>`).join('')}</ul>` : '<div class="pad-make-sub">Nothing changes on the board.</div>'}
      ${view.notRemoved.length ? `<div class="pad-make-warn">Not removed on the board: ${view.notRemoved.map(escapeHtml).join(', ')}</div>` : ''}
      ${view.notChanged.length ? `<div class="pad-make-warn">Not changed: ${view.notChanged.map(escapeHtml).join(', ')}</div>` : ''}
      <div class="pad-make-actions">
        <button class="sheet-btn" data-pad-action="update-cancel">Cancel</button>
        <button class="sheet-btn primary" data-pad-action="update-go">${view.changes.length ? 'Update chapter' : 'Mark up to date'}</button>
      </div>
    </div>`;
}

// Make scenario…: the scenario note the selected strip will make: its name, a must-have star, the Given / When / Then it says and what could not be placed.
// view: Pad Make Scenario
export function padMakeScenario(view) {
  return `
    <div class="pad-make-scenario" data-component="Pad make scenario" data-key="pad-make-scenario">
      <div class="sheet-title">Make a scenario</div>
      <label class="pad-make-label" for="padScenarioName">Scenario name</label>
      <input class="sheet-input" id="padScenarioName" data-pad-scenario="name" value="${escapeHtml(view.name)}" maxlength="120" autocomplete="off">
      <label class="pad-scn-must"><input type="checkbox" data-pad-scenario="must" ${view.mustHave ? 'checked' : ''}> ★ Must-have</label>
      <div class="pad-make-scn">${view.rows.map(r => `<div class="pad-scn-row"><span class="pad-scn-label">${escapeHtml(r.label)}</span><span class="pad-scn-text">${escapeHtml(r.text)}</span></div>`).join('')}${view.warnings.map(w => `<div class="pad-make-warn" role="alert">⚠ ${escapeHtml(w)}</div>`).join('')}</div>
      <div class="pad-make-sub">${escapeHtml(view.where)}</div>
      <div class="pad-make-actions">
        <button class="sheet-btn" data-pad-action="scenario-cancel">Cancel</button>
        <button class="sheet-btn primary" data-pad-action="scenario-go" ${view.canMake ? '' : 'disabled'}>Make scenario</button>
      </div>
    </div>`;
}

// Under the toolbar when the selection is a strip of example notes (Make scenario…) or one scenario note (Lay out as notes). view: Pad Scenario Strip
export function padScenarioStrip(view) {
  if (!view.visible) return '';
  return `
    <div class="pad-strip-bar" data-component="Pad scenario strip" data-key="pad-scenario-strip">
      <button type="button" class="pad-maker-jump" data-pad-action="${view.action}" title="${escapeHtml(view.title)}">${escapeHtml(view.label)}</button>
    </div>`;
}
