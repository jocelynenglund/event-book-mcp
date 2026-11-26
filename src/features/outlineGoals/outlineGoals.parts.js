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

// The events drafted for a chapter, dashed; × drops one, ＋ event drafts another (ui.drafting: its name is being typed). view: Chapter Draft Events
export function chapterDraftChips(view, ui = {}) {
  if (!view.drafts.length && !can(ui)) return '';
  const id = esc(view.chapterId);
  const add = !can(ui) ? '' : ui.drafting
    ? `<span class="og-draft og-draft-new"><input id="ogDraftName" class="og-draft-input" type="text" placeholder="Event name" autocomplete="off" autocapitalize="sentences" enterkeyhint="done"><button class="og-small" data-goals-action="save-draft" data-chapter="${id}">Add</button><button class="og-small" data-goals-action="cancel-draft" aria-label="Cancel">✕</button></span>`
    : `<button class="og-draft og-draft-add" data-goals-action="add-draft" data-chapter="${id}">＋ event</button>`;
  return `<div class="og-drafts" data-component="Chapter draft events" data-key="${id}">${view.drafts.map(name => `<span class="og-draft">${esc(name)}${can(ui)
    ? `<button class="og-draft-x" data-goals-action="drop-draft" data-chapter="${id}" data-name="${esc(name)}" aria-label="Drop the draft event ${esc(name)}">×</button>` : ''}</span>`).join('')}${add}</div>`;
}

// Seven small rungs, filled up to the furthest one the chapter has reached. view: Chapter Ladder
export function chapterLadderRungs(view) {
  const at = RUNGS.indexOf(view.reached);
  const label = view.reached === 'none' ? 'nothing yet' : view.reached;
  return `<div class="og-ladder" role="img" aria-label="Chapter ladder: ${label}, ${at + 1} of ${RUNGS.length} rungs" data-component="Chapter ladder" data-key="${esc(view.chapterId)}">
    ${RUNGS.map((r, i) => `<span class="og-rung${i <= at ? ' on' : ''}" title="${r}"></span>`).join('')}<span class="og-ladder-label">${label}</span>
  </div>`;
}
