// ===========================================
// OUTLINE DESKTOP - The components (v2 of the Outline's parts, from 1100 px up), each drawn from its own view alone:
//   chapterRail      Outline Chapter Rail        bookCounts           Outline Book Counts
//   deskRow          Outline Desk Row            openSlice            Outline Open Slice (the scenarios come in as a slot)
//   scenarioColumnsCard  Scenario Columns        bookCommentsColumn   Book Comments (each link comes in as a slot)
//   commentTargetLink    Comment Target       sliceFieldChips      Outline Slice Fields
// What a part does when tapped is said in data-od (the screen's wire answers it). Nothing here reads the book.
// ===========================================

import { refinedPill } from '../outline/refinedPill.js';
import { fieldChip } from '../outline/outline.parts.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The rail's chapters: name, how far, a bar, and what asks a look (gaps: a tap to the list of them)
export function chapterRail(view) {
  return `<nav class="od-rail-list" data-component="Outline chapter rail" data-key="rail" aria-label="Chapters">
    <h4 class="od-lbl">Chapters</h4>
    ${view.chapters.map(c => `<div class="od-ch${c.on ? ' on' : ''}" data-chapter="${esc(c.id)}">
      <button class="od-ch-go" data-od="go" data-chapter="${esc(c.id)}"${c.on ? ' aria-current="true"' : ''}><b>${esc(c.name)}</b></button>
      <div class="od-ch-m">
        <span>${esc(c.text)}</span>
        ${c.gaps ? `<button class="od-gap" data-od="chapter-gaps" data-chapter="${esc(c.id)}">${esc(c.note)}</button>` : c.note ? `<span class="od-quiet">${esc(c.note)}</span>` : ''}
      </div>
      <div class="od-bar" aria-hidden="true"><i style="width:${c.percent}%"></i></div>
    </div>`).join('\n')}
  </nav>`;
}

// The book's counts under the show chips; gaps open the list of them
export function bookCounts(view) {
  return `<div class="od-counts" data-component="Outline book counts" data-key="counts">
    <span class="od-pill">${esc(view.slices)}</span>
    <span class="od-pill">${esc(view.scenarios)}</span>
    ${view.hasGaps ? `<button class="od-pill warn" data-od="book-gaps">${esc(view.gaps)}</button>` : `<span class="od-pill">${esc(view.gaps)}</span>`}
  </div>`;
}

// A slice's closed line; tapping it opens it in place
export function deskRow(view, slots = {}) {
  return `<div class="od-row od-${view.kind}${view.open ? ' open' : ''}" data-component="Outline desk row" data-key="${esc(view.sliceId)}" data-slice="${esc(view.sliceId)}"${view.traced ? ' data-traced="true"' : ''}>
    <button class="od-row-main" data-od="toggle" data-slice="${esc(view.sliceId)}" aria-expanded="${view.open}">
      <span class="od-car" aria-hidden="true">${view.open ? '▾' : '▸'}</span>
      <span class="od-tick${view.refined ? ' on' : ''}" aria-label="${view.refined ? 'Refined' : 'Not refined yet'}">${view.refined ? '✓' : ''}</span>
      <span class="od-k" aria-hidden="true"></span>
      <span class="od-ref">${esc(view.ref)}</span>
      <span class="od-n">${esc(view.title)}</span>
      <span class="od-s">${esc(view.summary)}</span>
      ${view.gaps ? `<span class="od-pill warn">${esc(view.gaps)}</span>` : ''}
      <span class="od-pill">${esc(view.scenarios)}</span>
      ${view.comments ? `<span class="od-mk">💬 ${view.comments}</span>` : ''}
    </button>
    ${slots.progress ? `<span class="od-row-progress">${slots.progress}</span>` : ''}
  </div>`;
}

// A slice's fields as chips: a tap opens the field's sheet (Comes from…, Trace), the ⤳ beside it traces it, a ⚠ says why it has no source
export function sliceFieldChips(view) {
  return view.fields.length ? `<div class="od-fields" data-component="Outline slice fields" data-key="${esc(view.sliceId)}">${view.fields.map(fieldChip(view.sliceId)).join('')}</div>` : '';
}

const chipClass = { command: 'cmd', event: 'evt', readModel: 'rm', processor: 'proc' };
const flowChip = f => chipClass[f.type] ? `<span class="od-chip ${chipClass[f.type]}">${esc(f.name)}</span>` : `<span class="od-quiet">${esc(f.name)}</span>`;

// What a slice shows when opened: its flow, its fields (a slot), the Refined tick, ＋ Scenario, its scenarios (a slot)
export function openSlice(view, slots = {}) {
  const id = esc(view.sliceId);
  return `<div class="od-open-body" data-component="Outline open slice" data-key="${id}">
    <div class="od-flow">${view.flow.map(flowChip).join('\n<span class="od-arrow" aria-hidden="true">→</span>\n')}
      <span class="od-ico-row">
        <button class="od-ico od-ico-page" data-outline-action="open-slice" data-slice="${id}" aria-label="Open the slice page"></button>
        <button class="od-ico od-ico-menu" data-outline-action="edit" data-slice="${id}" aria-label="Edit the slice"></button>
      </span>
    </div>
    ${slots.fields || ''}
    <div class="od-acts">
      ${refinedPill({ sliceId: view.sliceId, refined: view.refined })}
      <span class="od-grow"></span>
      ${view.canAdd ? `<button class="od-pill od-add-btn" data-od="add-scenario" data-slice="${id}">＋ Scenario</button>` : ''}
    </div>
    ${view.adding ? `<form class="od-new" data-od-form="new-scenario" data-slice="${id}">
      <input class="od-new-name" name="name" placeholder="What the scenario shows, e.g. Order a footlong" autocomplete="off" aria-label="Name of the new scenario">
      <button class="od-pill" type="submit">Add</button> <button class="od-pill" type="button" data-od="cancel-add">Cancel</button>
    </form>` : ''}
    ${slots.scenarios || ''}
  </div>`;
}

// ----- Scenario Columns -----

// A sticky's chip with the values it carries, each a labelled box (or, where the book can't be changed, just the set ones)
function values(v, part, editable, extra = '') {
  return v.values.filter(x => editable || x.set).map(x => editable
    ? `<label class="od-val${x.set ? '' : ' empty'}"><b>${esc(x.key)}</b><input data-od-edit="${part}" data-key="${esc(x.key)}" data-scenario="${esc(v.scenarioId)}"${extra} value="${esc(x.text)}" autocomplete="off" spellcheck="false"></label>`
    : `<span class="od-val"><b>${esc(x.key)}</b> ${esc(x.text)}</span>`).join('\n');
}
const stickyBox = (v, cls, part, editable, extra = '') => `<span class="od-chip ${cls}">${esc(v.name)}</span>\n${values(v, part, editable, extra)}`;

function reasonBox(text, part, editable, scenarioId) {
  return editable
    ? `<input class="od-reason" data-od-edit="${part}" data-key="reason" data-scenario="${esc(scenarioId)}" value="${esc(text)}" placeholder="why" autocomplete="off" aria-label="Reason">`
    : text ? `<span class="od-val">${esc(text)}</span>` : '';
}

// One scenario: header (must have, name, comments, must/nice chip), then Given | When | Then
export function scenarioColumnsCard(view) {
  const id = esc(view.scenarioId), ed = view.editable;
  const tag = v => ({ ...v, scenarioId: view.scenarioId });
  const given = view.given.length
    ? view.given.map(g => stickyBox(tag(g), 'evt', 'given', ed, ` data-index="${g.index}"`)).join('\n')
    : '<i class="od-quiet">nothing happened yet</i>';
  const when = view.when.kind === 'command' ? stickyBox(tag(view.when), 'cmd', 'when', ed)
    : view.when.kind === 'query' ? (ed ? `<input class="od-reason" data-od-edit="query" data-key="query" data-scenario="${id}" value="${esc(view.when.text)}" aria-label="Query" autocomplete="off">` : `<span class="od-val">${esc(view.when.text)}</span>`)
    : '<i class="od-quiet">not set</i>';
  const then = view.then.kind === 'event' ? stickyBox(tag(view.then), 'evt', 'then', ed)
    : view.then.kind === 'readModel' ? stickyBox(tag(view.then), 'rm', 'then', ed)
    : view.then.kind === 'rejected' ? `<span class="od-rej">Rejected</span>\n${reasonBox(view.then.reason, 'rejection', ed, view.scenarioId)}`
    : view.then.kind === 'nothing' ? `<span class="od-nothing">Nothing happens</span>\n${reasonBox(view.then.reason, 'nothing', ed, view.scenarioId)}`
    : '<i class="od-quiet">not set</i>';
  const chip = view.mustHave ? 'Must have' : 'Nice to have';
  return `<div class="od-sc${view.mustHave ? ' must' : ''}" data-component="Scenario columns" data-key="${id}" data-scenario="${id}">
    <header>
      <span class="od-star" aria-hidden="true">${view.mustHave ? '★' : '☆'}</span>
      <b class="od-sc-name">${esc(view.name)}</b>
      <button class="od-mk${view.comments ? ' has' : ''}" data-outline-action="comment" data-slice="${esc(view.sliceId)}" data-scenario="${id}" aria-label="${view.comments ? `${view.comments} open comments` : 'Comment'}">${view.comments ? `💬 ${view.comments}` : ''}</button>
      <span class="od-grow"></span>
      ${ed ? `<button class="od-ico od-ico-edit" data-outline-action="edit-scenario" data-scenario="${id}" aria-label="Edit in a sheet"></button>` : ''}
      ${ed ? `<button class="od-pill od-must-chip" data-od="must" data-scenario="${id}" aria-pressed="${view.mustHave}">${chip}</button>` : `<span class="od-pill">${chip}</span>`}
    </header>
    <div class="od-cols">
      <div class="od-col"><span class="od-lbl">Given</span>\n${given}</div>
      <div class="od-col"><span class="od-lbl">When</span>\n${when}</div>
      <div class="od-col"><span class="od-lbl">Then</span>\n${then}</div>
    </div>
  </div>`;
}

// ----- Book Comments -----

// The column: its title, Open / Resolved, each thread (who, when, words, replies, where it is, Reply · Resolve).
// slots.targets: commentId → the link (Comment Target's component)
export function bookCommentsColumn(view, slots = {}) {
  const card = c => `<div class="od-cm-card${c.highlight ? ' hl' : ''}${c.resolved ? ' done' : ''}" data-comment="${esc(c.commentId)}">
      <div class="od-cm-who"><b>${esc(c.author)}</b> <span class="od-quiet">${esc(c.ago)}</span></div>
      <p class="od-cm-text">${esc(c.text)}</p>
      ${c.replies.map(r => `<div class="od-cm-reply"><b>${esc(r.author)}</b> <span class="od-quiet">${esc(r.ago)}</span><p>${esc(r.text)}</p></div>`).join('\n')}
      ${(slots.targets || {})[c.commentId] || ''}
      ${c.replying ? `<form class="od-cm-form" data-od-form="reply" data-comment="${esc(c.commentId)}">
        <textarea name="text" rows="2" placeholder="Your reply" aria-label="Your reply"></textarea>
        <button class="od-pill" type="submit">Send</button> <button class="od-pill" type="button" data-od="cancel-reply">Cancel</button></form>`
      : `<div class="od-cm-act"><button data-od="reply" data-comment="${esc(c.commentId)}">Reply</button>${c.resolved ? '' : ` · <button data-od="resolve" data-comment="${esc(c.commentId)}">Resolve</button>`}</div>`}
    </div>`;
  return `<aside class="od-cmts-in" data-component="Book comments" data-key="comments" aria-label="Comments">
    <h3>${esc(view.title)}</h3>
    <div class="od-seg" role="group" aria-label="Which comments">
      <button data-od="show" data-show="open" class="${view.showing === 'open' ? 'on' : ''}" aria-pressed="${view.showing === 'open'}">${esc(view.tabs.open)}</button>
      <button data-od="show" data-show="resolved" class="${view.showing === 'resolved' ? 'on' : ''}" aria-pressed="${view.showing === 'resolved'}">${esc(view.tabs.resolved)}</button>
    </div>
    ${view.cards.map(card).join('\n')}
    ${view.empty ? `<div class="od-empty">${esc(view.empty)}</div>` : ''}
  </aside>`;
}

// Where a comment is, as a link: a tap goes there (a comment on a removed slice has nowhere to go)
export function commentTargetLink(view) {
  const root = `data-component="Comment target link" data-key="${esc(view.commentId)}"`;
  return view.kind === 'gone' || view.kind === 'book'
    ? `<span class="od-cm-link plain" ${root}>${esc(view.label)}</span>`
    : `<button class="od-cm-link" ${root} data-od="jump" data-comment="${esc(view.commentId)}">${esc(view.label)}</button>`;
}
