// ===========================================
// OUTLINE GOALS - Parts (feature: outline-goals)
// Each part draws from the one view named above it (see the component tests), and imports nothing of the book.
// ui is this device's local state (what is being edited) and whether the book can be changed here (editable, default true).
// ===========================================

import { RUNGS } from './rules.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const can = ui => ui.editable !== false;

// The goal (the book's preface, large) and its one line. Tap either to edit them. view: Outline Goal
export function outlineGoalCard(view, ui = {}) {
  if (!can(ui) && !view.goal && !view.oneLine) return '';
  const tap = (cls, text, ask, label) => can(ui)
    ? `<button class="${cls}${text ? '' : ' og-ask'}" data-goals-action="edit-goal" aria-label="${label}">${esc(text || ask)}</button>`
    : `<p class="${cls}">${esc(text)}</p>`;
  return `<section class="og-goal" data-component="Outline goal" data-key="goal">
    <div class="og-kicker">Goal</div>
    ${view.goal || can(ui) ? tap('og-goal-text', view.goal, 'What is this book for? Write its goal', 'Edit the goal') : ''}
    ${view.oneLine || can(ui) ? tap('og-oneline', view.oneLine, 'Add a one-line description', 'Edit the one-line description') : ''}
  </section>`;
}

// "3 criteria" and "5 chapters". view: Outline Summary
export function outlineSummaryPills(view) {
  return `<span class="og-pills" data-component="Outline summary pills" data-key="summary">
    <span class="og-pill">${count(view.criteria, 'criterion', 'criteria')}</span><span class="og-pill">${count(view.chapters, 'chapter', 'chapters')}</span>
  </span>`;
}

// "1 of 3 criteria proven by a must-have scenario": only once there are criteria. view: Criteria Proven
export function provenPill(view) {
  if (!view.total) return '';
  return `<span class="og-pill og-proven${view.proven === view.total ? ' all' : ''}" data-component="Proven pill" data-key="proven">${view.proven} of ${view.total} criteria proven by a must-have scenario</span>`;
}

// A criterion's chapter tags and its proof, as one line each
const tags = row => row.chapters.length ? `<span class="og-tags">${row.chapters.map(c => `<span class="og-tag">${esc(c.name)}</span>`).join('')}</span>` : '';
const proof = row => `<span class="og-proof">${row.proven ? `proven by ${count(row.proofs.length, 'scenario', 'scenarios')}` : 'not proven yet'}</span>`;

// The criteria, each with a ✓ once a must-have scenario proves it, its chapter tags and its proof; tap one to reword, tag, remove or
// link proofs. ＋ Add a criterion opens the same sheet empty. view: Acceptance Criteria
export function acceptanceCriteriaList(rows, ui = {}) {
  if (!rows.length && !can(ui)) return '';
  const item = row => `<li class="og-item">
      <button class="og-crit${row.proven ? ' proven' : ''}" data-goals-action="open-criterion" data-criterion="${esc(row.criterionId)}" aria-label="${esc(row.text)}: ${row.proven ? 'proven' : 'not proven yet'}. Tap to edit">
        <span class="og-mark" aria-hidden="true">${row.proven ? '✓' : '○'}</span>
        <span class="og-crit-body"><span class="og-crit-text">${esc(row.text)}</span>${tags(row)}${proof(row)}</span>
      </button></li>`;
  return `<section class="og-criteria" data-component="Acceptance criteria" data-key="criteria">
    <h3 class="og-title">Acceptance criteria</h3>
    ${rows.length ? `<ul class="og-list">${rows.map(item).join('')}</ul>` : '<p class="og-hint">None yet: say what has to be true for this book to be done.</p>'}
    ${can(ui) ? '<button class="og-add" data-goals-action="add-criterion">＋ Add a criterion</button>' : ''}
  </section>`;
}

// The sheet for a new or an existing criterion: its words, its chapters, and (once it exists) the must-have scenarios that prove it. view: Criterion Editor
export function criterionSheet(view) {
  const adding = view.mode === 'add';
  return `<div class="og-sheet" data-component="Criterion sheet" data-key="${esc(view.criterionId || 'new')}" data-criterion="${esc(view.criterionId || '')}">
    <div class="sheet-title">${adding ? 'Add a criterion' : 'Acceptance criterion'}</div>
    <textarea id="ogCritText" class="sheet-input og-text" rows="2" placeholder="What has to be true? e.g. A subscriber can cancel any time">${esc(view.text)}</textarea>
    <div class="bd-sheet-label">Chapters it is about</div>
    <div class="og-chips">${view.chapters.length ? view.chapters.map(c =>
      `<button class="og-chip${c.tagged ? ' on' : ''}" data-goals-action="toggle-chapter" data-chapter="${esc(c.chapterId)}" aria-pressed="${c.tagged}">${esc(c.name)}</button>`).join('')
      : '<span class="og-hint">The book has no chapters yet.</span>'}</div>
    ${adding ? '' : `<div class="bd-sheet-label">Proven by</div>
    <div class="og-proofs">${view.proofs.length ? view.proofs.map(p => `<button class="og-pick${p.linked ? ' on' : ''}" data-goals-action="toggle-proof" data-scenario="${esc(p.scenarioId)}" aria-pressed="${p.linked}">
        <span class="og-pick-name">${p.stale ? '☆' : '★'} ${esc(p.name)}</span><span class="og-pick-where">${esc(p.sliceTitle)}${p.stale ? ' · no longer a must have' : ''}</span></button>`).join('')
      : '<span class="og-hint">No must-have scenarios yet. Mark a scenario ★ must have in the Outline to let it prove a criterion.</span>'}</div>`}
    <button class="sheet-btn" data-goals-action="save-criterion">${adding ? 'Add criterion' : 'Save'}</button>
    ${adding ? '' : '<button class="sheet-btn danger" data-goals-action="remove-criterion">Remove criterion</button>'}
  </div>`;
}

// Under a chapter's heading: its description (tap to write it) and the criteria tagged to it. ui.editing: this chapter's description is being written. view: Chapter Brief
export function chapterBriefCard(view, ui = {}) {
  const id = esc(view.chapterId);
  const text = ui.editing
    ? `<textarea id="ogChapterDesc" class="sheet-input og-text" rows="2" placeholder="What is this chapter for?">${esc(view.description)}</textarea>
       <div class="og-row"><button class="og-small" data-goals-action="save-description" data-chapter="${id}">Save</button><button class="og-small" data-goals-action="cancel-description">Cancel</button></div>`
    : view.description
      ? (can(ui) ? `<button class="og-desc" data-goals-action="edit-description" data-chapter="${id}" aria-label="Edit the description of this chapter">${esc(view.description)}</button>` : `<p class="og-desc">${esc(view.description)}</p>`)
      : (can(ui) ? `<button class="og-desc og-ask" data-goals-action="edit-description" data-chapter="${id}">＋ Describe this chapter</button>` : '');
  const crits = view.criteria.length ? `<ul class="og-ch-crit">${view.criteria.map(c =>
    `<li><button class="og-ch-item${c.proven ? ' proven' : ''}" data-goals-action="open-criterion" data-criterion="${esc(c.criterionId)}"><span class="og-mark" aria-hidden="true">${c.proven ? '✓' : '○'}</span> ${esc(c.text)}</button></li>`).join('')}</ul>` : '';
  if (!text && !crits) return '';
  return `<div class="og-brief" data-component="Chapter brief" data-key="${id}">${text}${crits}</div>`;
}

// The events drafted for a chapter, as small dashed chips in the event colour. Tap a chip for "Remove" (ui.menu: the name whose menu is open;
// on a mouse a × shows on hover). ＋ event turns into a chip you type in place (ui.drafting). view: Chapter Draft Events
export function chapterDraftChips(view, ui = view.ui ?? {}) {
  if (!view.drafts.length && !can(ui)) return '';
  const id = esc(view.chapterId);
  const add = !can(ui) ? '' : ui.drafting
    ? `<span class="og-draft og-draft-typing"><input id="ogDraftName" class="og-draft-input" type="text" placeholder="Event name" aria-label="Event name" autocomplete="off" autocapitalize="sentences" enterkeyhint="next"></span><div class="pad-suggest-slot og-suggest" id="ogDraftSuggest" hidden></div>`
    : `<button class="og-draft og-draft-add" data-goals-action="add-draft" data-chapter="${id}">＋ event</button>`;
  const chip = name => {
    const n = esc(name), open = ui.menu === name;
    if (!can(ui)) return `<span class="og-draft">${n}</span>`;
    return `<span class="og-draft${open ? ' og-draft-open' : ''}"><button class="og-draft-name" data-goals-action="draft-menu" data-chapter="${id}" data-name="${n}" aria-haspopup="menu" aria-expanded="${open}">${n}</button>`
      + `<button class="og-draft-x" data-goals-action="drop-draft" data-chapter="${id}" data-name="${n}" aria-label="Drop the draft event ${n}" tabindex="-1">×</button>`
      + (open ? `<span class="og-draft-menu" role="menu"><button role="menuitem" class="og-draft-make" data-goals-action="make-slice" data-chapter="${id}" data-name="${n}">Make it a slice…</button><button role="menuitem" class="og-draft-remove" data-goals-action="drop-draft" data-chapter="${id}" data-name="${n}">Remove</button></span>` : '') + '</span>';
  };
  return `<div class="og-drafts" data-component="Chapter draft events" data-key="${id}">${view.drafts.map(chip).join('')}${add}</div>`;
}

const RUNG_NAME = { described: 'Described', criteria: 'Criteria', events: 'Events', slices: 'Slices', scenarios: 'Scenarios', refined: 'Refined', built: 'Built ✓' };

// Where the chapter has got to in words ("Events · next: slices"), a thin seven-step bar beneath; tap to list all seven steps (ui.open). view: Chapter Ladder
export function chapterLadderRungs(view, ui = view.ui ?? {}) {
  const at = RUNGS.indexOf(view.reached);
  const next = RUNGS[at + 1];
  const now = view.reached === 'none' ? 'Not started' : RUNG_NAME[view.reached];
  const rest = view.reached === 'built' ? '' : ` · next: ${view.reached === 'none' ? 'describe it' : next}`;
  const key = esc(view.chapterId);
  return `<div class="og-ladder" data-component="Chapter ladder" data-key="${key}">
    <button class="og-ladder-line" data-goals-action="toggle-ladder" data-chapter="${key}" aria-expanded="${!!ui.open}" aria-label="Chapter progress: ${at + 1 > 0 ? at + 1 : 0} of ${RUNGS.length} steps. ${esc(now + rest)}"><b>${now}</b>${rest}</button>
    <span class="og-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${RUNGS.length}" aria-valuenow="${at + 1}" aria-label="${at + 1} of ${RUNGS.length} steps">${RUNGS.map((r, i) => `<span class="og-rung${i <= at ? ' on' : ''}"></span>`).join('')}</span>
    ${ui.open ? `<ul class="og-steps">${RUNGS.map((r, i) => `<li class="og-step${i <= at ? ' on' : ''}"><span aria-hidden="true">${i <= at ? '✓' : '○'}</span> ${RUNG_NAME[r].replace(' ✓', '')}</li>`).join('')}</ul>` : ''}
  </div>`;
}

// Which command makes the draft event happen, and its fields (a comma list); the command's name is suggested from the book. view: Make Slice Sheet
export function makeSliceForm(view) {
  return `<div class="og-sheet" data-component="Make slice sheet" data-key="${esc(view.chapterId)}" data-chapter="${esc(view.chapterId)}" data-event="${esc(view.event)}">
    <div class="sheet-title">Make ${esc(view.event)} a slice</div>
    <label class="bd-sheet-label" for="ogMakeCommand">Which command makes it happen?</label>
    <input id="ogMakeCommand" class="sheet-input" type="text" value="${esc(view.command)}" placeholder="e.g. Submit profile" autocomplete="off" autocapitalize="sentences">
    <div class="pad-suggest-slot og-suggest og-suggest-sheet" id="ogMakeSuggest" hidden></div>
    <label class="bd-sheet-label" for="ogMakeFields">Its fields</label>
    <input id="ogMakeFields" class="sheet-input" type="text" value="${esc(view.fields)}" placeholder="e.g. profileId, interests, topics" autocomplete="off">
    <p class="og-hint">The slice goes at the end of ${esc(view.chapterName)}. The fields go on the command and on the event.</p>
    <button class="sheet-btn" data-goals-action="save-make-slice">Make the slice</button>
    <button class="sheet-btn" data-goals-action="cancel-make-slice">Cancel</button>
  </div>`;
}
