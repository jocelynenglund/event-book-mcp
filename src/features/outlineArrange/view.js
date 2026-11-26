// ===========================================
// OUTLINE ARRANGE - Screen (SV: Outline Arrange Rows, Outline Arrange Part Heading, Outline Arrange Bar, Outline Arrange Add Chapter)
// The Outline's Arrange mode (Jocelyn: "an edit mode in outline view, at least for setting up parts and chapters"):
// only the parts and chapters, slices hidden. Drag a chapter (or a whole part) by its ⠿ grip, tap a name to rename it,
// ＋ Part here between chapters, ＋ Chapter at a group's end, ✕ on a part, Alt+↑/↓ on a focused chapter. Every write is the
// book's own command (Arrange Chapters, Start/Rename/Remove Part, Rename Chapter, Add Chapter To Part), so the board,
// share links and editions see it as they do any arranging. The mode is this device's (not an event); it ends with
// Done, or when the book changes or can no longer be arranged here.
// The screen composes the parts and reads no state itself: the Outline hands it the one replay of the book per draw.
// ===========================================

import { outlineArrangeRows } from './outlineArrangeRows.read.js';
import { outlineArrangePartHeading as partHeadingView } from './outlineArrangePartHeading.read.js';
import { outlineArrangeBar as barView } from './outlineArrangeBar.read.js';
import { outlineArrangeAddChapter as addChapterView } from './outlineArrangeAddChapter.read.js';
import { outlineArrangeRow, outlineArrangePartHeading, outlineArrangeBar, outlineArrangeAddChapter } from './outlineArrange.parts.js';
import { arrangeSlots } from '../arrange/arrangeSlots.read.js';
import { armDrag } from '../arrange/drag.js';
import { dropChapter, dropPart, stepChapter, startPart, renamePart, removePart, addChapterToPart } from '../arrange/command.js';
import { renameChapter } from '../board/command.js';
import { toastWithUndo } from '../undo/command.js';
import { showToast } from '../../ui/toast.js';
import { render } from '../../ui/feed.js';
import { canArrangeCurrent, canEditCurrent, getCurrentModelId } from '../../core/eventStore.js';

let arrangingBook = null;   // the model the mode is on (null: off); another model, or one not arrangeable here, ends it
let editing = null;         // the one name being typed: { kind: 'rename-chapter' | 'rename-part' | 'new-part' | 'new-chapter', id }
let stateNow = null;        // the book as last drawn: what a drag asks for its slots
let focusChapter = null;    // the chapter whose row has the focus after the next draw (it was moved by the keyboard)
let pressed = false;        // a pointer is down (a blur then waits for the click)

export function isArranging() {
  if (arrangingBook && (arrangingBook !== getCurrentModelId() || !canArrangeCurrent())) { arrangingBook = null; editing = null; }
  return !!arrangingBook;
}

const is = (kind, id) => editing?.kind === kind && editing.id === id;

// Draws Arrange mode into the Outline's container, from the book the Outline replayed for this draw
export function renderArrange(container, state) {
  stateNow = state;
  const arrangeable = canArrangeCurrent();
  const rows = outlineArrangeRows(state, { arrangeable });
  const groups = rows.groups.length ? rows.groups : [{ partId: null, rows: [] }];
  const html = groups.map(g => {
    const heading = g.partId ? partHeadingView(state, g.partId, { arrangeable }) : null;
    const add = addChapterView(state, g.partId, { arrangeable });
    return `<section class="ola-group">
      ${heading ? outlineArrangePartHeading(heading, { renaming: is('rename-part', g.partId) }) : ''}
      ${g.rows.map(r => outlineArrangeRow(r, { renaming: is('rename-chapter', r.chapterId), naming: is('new-part', r.chapterId) })).join('')}
      ${add ? outlineArrangeAddChapter(add, { naming: is('new-chapter', g.partId || '') }) : ''}
    </section>`;
  }).join('');
  container.innerHTML = `<div class="ola">${outlineArrangeBar(barView(state))}${html}</div>`;
  armDrag(container.querySelector('.ola'), { axis: 'y', slotsFor: (kind, key) => arrangeSlots(stateNow, kind, key), onDrop });
  const focus = editing ? container.querySelector('[data-arrange-input]')
    : focusChapter && container.querySelector(`.ola-row[data-chapter="${focusChapter}"]`);
  focusChapter = null;
  if (focus) { focus.focus(); focus.select?.(); }
}

// Done with a write: say it, with a way back
function wrote(refused, message) {
  render();
  if (refused) showToast(refused);
  else if (message) toastWithUndo(message);
  return !refused;
}

// A chapter or a part let go (Arrange Slots says where it may land)
function onDrop(kind, key, slot) {
  const refused = (kind === 'part' ? dropPart : dropChapter)(key, slot);
  wrote(refused, canEditCurrent() ? 'Chapters arranged' : null);
}

// Enter on a name being typed: the command for what it names
function save(input) {
  const name = input.value.trim(), ed = editing;
  if (!ed) return;
  if (!name) { showToast('Give it a name'); input.focus(); return; }
  editing = null;
  if (ed.kind === 'rename-chapter') {
    if (name === input.defaultValue) { render(); return; }
    renameChapter(ed.id, name);
    wrote(null, `Renamed to ${name}`);
  }
  else if (ed.kind === 'rename-part') wrote(renamePart(ed.id, name), `Renamed to ${name}`);
  else if (ed.kind === 'new-part') wrote(startPart(ed.id, name), `Part ${name} started`);
  else wrote(addChapterToPart(name, ed.id || null), `Chapter ${name} added`);
}

function onClick(e) {
  const t = e.target.closest('[data-outline-action]');
  const a = t?.dataset.outlineAction;
  if (!a?.startsWith('arrange')) return;
  if (a === 'arrange') { arrangingBook = getCurrentModelId(); editing = null; render(); }
  else if (a === 'arrange-done') { arrangingBook = null; editing = null; render(); }
  else if (a === 'arrange-remove-part') wrote(removePart(t.dataset.part), 'Part removed (its chapters stay)');
  else {
    editing = a === 'arrange-rename' ? { kind: 'rename-chapter', id: t.dataset.chapter }
      : a === 'arrange-rename-part' ? { kind: 'rename-part', id: t.dataset.part }
      : a === 'arrange-part-open' ? { kind: 'new-part', id: t.dataset.chapter }
      : { kind: 'new-chapter', id: t.dataset.part };
    render();
  }
}

function onKey(e) {
  if (!isArranging()) return;
  if (e.target.matches?.('[data-arrange-input]')) {
    if (e.key === 'Enter') { e.preventDefault(); save(e.target); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); editing = null; render(); }
    return;
  }
  // Alt+↑ / Alt+↓ on a chapter's row: one place earlier or later (one Arrange Chapters)
  const row = e.target.closest?.('.ola-row[data-chapter]');
  if (!row || !e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  e.preventDefault();
  focusChapter = row.dataset.chapter;
  wrote(stepChapter(focusChapter, e.key === 'ArrowUp' ? -1 : 1), null);
}

// A name left without Enter is let go, but not before the tap that left it has landed (a button it hit must still be there)
function onBlur(e) {
  if (!e.target.matches?.('[data-arrange-input]')) return;
  const settle = () => {
    if (pressed) { setTimeout(settle, 120); return; }
    if (editing && !document.querySelector('[data-arrange-input]:focus')) { editing = null; if (isArranging()) render(); }
  };
  setTimeout(settle, 160);
}

export function initOutlineArrange(view) {
  view?.addEventListener('click', onClick);
  view?.addEventListener('keydown', onKey);
  view?.addEventListener('focusout', onBlur);
  view?.addEventListener('pointerdown', () => { pressed = true; });
  document.addEventListener('pointerup', () => { pressed = false; });
  document.addEventListener('pointercancel', () => { pressed = false; });
}
