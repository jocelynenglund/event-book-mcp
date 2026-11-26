// ===========================================
// ELEMENT MENU - Unified edit entry point
// It reads the book only through its views (elementMenuState, elementMenuOptions, elementMenuReaders,
// elementMenuFlowChoices, elementMenuTrigger) and draws from elementMenu.parts.js.
// ===========================================

import { projectState } from '../../core/projections.js';
import { appendEvent, EventTypes } from '../../core/eventStore.js';
import { showSheet, hideAllSheets } from '../../ui/sheets.js';
import { render, showElementOnBoard } from '../../ui/feed.js';
import { showToast } from '../../ui/toast.js';
import { toastWithUndo } from '../undo/command.js';
import { secondTap } from '../../ui/secondTap.js';
import { openPropertySheet } from '../properties/sheet.js';
import { openThread } from '../comments/sheet.js';
import { deleteElement } from '../deleteElement/command.js';
import { removeFromSlice, setPublished, setTrigger, setTodo, setElementFlow } from '../board/command.js';
import { isReadOnly, openElementReadSheet } from '../readOnly/sheet.js';
import { elementMenuState } from './elementMenuState.read.js';
import { elementMenuOptions } from './elementMenuOptions.read.js';
import { elementMenuReaders } from './elementMenuReaders.read.js';
import { elementMenuFlowChoices } from './elementMenuFlowChoices.read.js';
import { elementMenuConsumers } from './elementMenuConsumers.read.js';
import { elementMenuTrigger } from './elementMenuTrigger.read.js';
import { elementMenuHome } from './elementMenuHome.read.js';
import { elementMenuProducer } from './elementMenuProducer.read.js';
import { elementMenuTitle, elementMenuBody, readersSection } from './elementMenu.parts.js';
import { openBoardSheet } from '../board/sheets/shared.js';
import { openScreenText } from '../pad/screenText.sheet.js';

let currentElementId = null;
let currentSliceId = null;

// The book as the menu last looked at it: read afresh whenever the menu opens or a tap needs it
let book = null;
const load = () => (book = projectState());

export function openElementMenu(elementId, sliceId = null) {
  if (isReadOnly()) { openElementReadSheet(elementId); return; }   // not checked out here: read it
  const el = elementMenuState(load(), elementId);
  if (!el) return;

  currentElementId = elementId;
  currentSliceId = sliceId && !sliceId.startsWith('au_inferred_') ? sliceId : null;

  const title = document.getElementById('elementMenuTitle');
  const options = document.getElementById('elementMenuOptions');

  // The name is the title, edited in place: tap it, type, Enter (or tap away) saves
  title.innerHTML = elementMenuTitle(el);
  const nameInput = document.getElementById('emName');
  const saveBtn = document.getElementById('emSave');
  // ✓ shows while the name is being edited; tapping it saves (the field keeps focus until then)
  nameInput.onfocus = () => { saveBtn.hidden = false; };
  nameInput.onblur = () => setTimeout(() => { saveBtn.hidden = true; }, 150);
  saveBtn.onpointerdown = e => e.preventDefault();
  saveBtn.onclick = () => { saveMenuName(nameInput); nameInput.blur(); };
  nameInput.onchange = () => saveMenuName(nameInput);
  nameInput.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); nameInput.blur(); } };

  options.innerHTML = elementMenuBody({
    flows: elementMenuFlowChoices(book, elementId, currentSliceId),   // an outcome event can belong to a flow
    options: elementMenuOptions(book, elementId, currentSliceId),
    consumers: elementMenuConsumers(book, elementId)                  // an integration event: who it goes to
  });
  const consumersInput = document.getElementById('emConsumers');
  if (consumersInput) {
    consumersInput.onchange = () => saveConsumers(consumersInput);
    consumersInput.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); consumersInput.blur(); } };
  }

  showSheet('elementMenuSheet');
}

// Rename: straight into the name at the top of the menu
export function menuRename() {
  const input = document.getElementById('emName');
  if (!input) return;
  input.focus();
  input.select();
}

function saveMenuName(input) {
  const el = elementMenuState(load(), currentElementId);
  if (!el) return;
  const name = input.value.trim();
  if (!name) { input.value = el.name; return; }
  if (name === el.name) return;
  appendEvent(EventTypes.ElementRenamed, { elementId: el.elementId, name });
  render();
  showToast('Renamed');
}

function saveConsumers(input) {
  if (!elementMenuConsumers(load(), currentElementId)) return;
  setPublished(currentElementId, true, input.value.split(','));
  render();
  showToast('Saved');
}

export function menuProperties() {
  hideAllSheets();
  if (currentElementId) {
    openPropertySheet(currentElementId);
  }
}

// A screen: its text, like the Pad's screen note (the editor reads the book through `load`, as the menu does)
export function menuScreenText() {
  hideAllSheets();
  if (currentElementId) setTimeout(() => openScreenText(currentElementId, load), 150);
}

// A read model's or a command's slice: its events drawer (the events it reads, or produces)
export function menuSliceEvents() {
  hideAllSheets();
  const home = currentElementId && elementMenuHome(load(), currentElementId, currentSliceId);
  if (home) setTimeout(() => window.EventPad.openEventsSheet(home.sliceId), 150);
}

// Its slice's screen slot: name or reuse a screen, or go to the one it has
export function menuSliceScreen() {
  hideAllSheets();
  const home = currentElementId && elementMenuHome(load(), currentElementId, currentSliceId);
  if (!home) return;
  if (!home.screen) setTimeout(() => window.EventPad.openCellSheet(home.sliceId, 'screen'), 150);
  else setTimeout(() => { if (!showElementOnBoard(home.screen.id, home.sliceId)) showToast('Not on the board yet'); }, 150);
}

// An event: the read models that read it, each with its slice (tap to go)
export function menuReaders() {
  const readers = currentElementId && elementMenuReaders(load(), currentElementId);
  if (!readers) return;
  hideAllSheets();
  setTimeout(() => openBoardSheet(readersSection(readers)), 150);
}

// An event: go to the command that produces it, or say nothing does yet
export function menuProducer() {
  const producer = currentElementId && elementMenuProducer(load(), currentElementId);
  if (!producer) { hideAllSheets(); showToast('Nothing produces it yet'); return; }
  hideAllSheets();
  setTimeout(() => { if (!showElementOnBoard(producer.commandId, producer.sliceId)) showToast('Not on the board yet'); }, 150);
}

export function menuDelete(button) {
  if (!secondTap(button)) return;
  hideAllSheets();
  if (currentElementId) {
    deleteElement(currentElementId);
  }
}

export function menuToggleList() {
  hideAllSheets();
  const el = elementMenuState(load(), currentElementId);
  if (!el) return;
  appendEvent(EventTypes.ElementListSet, { elementId: el.elementId, list: !el.list });
  render();
}

export function menuToggleTodo() {
  hideAllSheets();
  const el = elementMenuState(load(), currentElementId);
  if (!el) return;
  setTodo(el.elementId, !el.todo);
  render();
}

export function menuUpdatedBy() {
  hideAllSheets();
  if (currentElementId) setTimeout(() => window.EventPad.openUpdatedByPicker(currentElementId), 150);
}

export function menuSetElementFlow(flowId) {
  if (!currentElementId) return;
  setElementFlow(currentElementId, flowId || null);
  render();
  openElementMenu(currentElementId, currentSliceId);
}

export function menuShowElement(elementId) {
  hideAllSheets();
  setTimeout(() => { if (!showElementOnBoard(elementId)) showToast('Not on the board yet'); }, 150);
}

export function menuProcessorInputs() {
  hideAllSheets();
  if (currentElementId) setTimeout(() => window.EventPad.openProcessorInputs(currentElementId, currentSliceId), 150);
}

export function menuToggleTrigger() {
  hideAllSheets();
  const trigger = currentElementId && elementMenuTrigger(load(), currentElementId, currentSliceId);
  if (!trigger) return;
  setTrigger(currentElementId, trigger.processorId, !trigger.triggering);
  render();
}

export function menuToggleExternal() {
  hideAllSheets();
  const el = elementMenuState(load(), currentElementId);
  if (!el) return;
  appendEvent(EventTypes.ElementExternalSet, { elementId: el.elementId, external: !el.external });
  render();
}

// While planning: a comment on the slice this sticky is in (its thread)
export function menuComment() {
  hideAllSheets();
  const sliceId = currentSliceId;
  if (sliceId) setTimeout(() => openThread(sliceId, null), 150);
}

// Integration event: published to other systems (outbound), or private again. Turning it on keeps the menu open for who it goes to.
export function menuTogglePublished() {
  const el = elementMenuState(load(), currentElementId);
  if (!el) return;
  const sliceId = currentSliceId;
  setPublished(el.elementId, !el.published);
  render();
  if (!el.published) openElementMenu(el.elementId, sliceId);   // now on: show the consumers field
  else hideAllSheets();
}

export function menuToggleTable() {
  hideAllSheets();
  const el = elementMenuState(load(), currentElementId);
  if (!el) return;
  appendEvent(EventTypes.ElementTableSet, { elementId: el.elementId, table: !el.table });
  render();
}

export function menuRemoveFromSlice() {
  hideAllSheets();
  if (currentElementId && currentSliceId) {
    removeFromSlice(currentSliceId, currentElementId);
    render();
    toastWithUndo('Removed from the slice');
  }
}

export function getCurrentMenuElementId() {
  return currentElementId;
}
