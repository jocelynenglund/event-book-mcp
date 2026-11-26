// ===========================================
// PAD - The shelf and the folded strips on the screen (SV: Pad Shelf; and the parts of Pad Notes, Pad Frames, Pad Make Chapter and Pad Make Scenario that tap into them)
// The Pad's wiring for drawing less, kept out of view.js: the shelf along the bottom (a chip for each shelved frame, Shelve all made), a made frame's
// Shelve button, the ▸ N / ▾ N marker of a scenario note that holds its strip, and the jump that takes away what hides its target (a place of a linked
// note, "Made by ↗"). view.js hands it what it has (how to say a write was done, how to go to a frame); every write is the book's own
// command (shelf.command.js, foldStrip.command.js). The Make chapter and Make scenario sheets carry their own ticks (view.js, scenarioStrip.js).
// ===========================================

import { padShelf as shelfView } from './padShelf.read.js';
import { padBookName as bookNameView } from './padBookName.read.js';
import { padShelf, padBookName } from './pad.parts.js';
import { shelveFrames, shelveAllMade, unshelveFrames, revealNote, revealFrame } from './shelf.command.js';
import { foldStrip, unfoldStrip } from './foldStrip.command.js';
import { canEditCurrent } from '../../core/eventStore.js';

let host = null;   // { wrote(refused, message), jumpToFrame(frameId) }

// The shelf under the canvas, from the book feed.js replayed for this draw
export function drawShelf(state) {
  const view = document.getElementById('padView');
  if (!view) return;
  let slot = document.getElementById('padShelfSlot');
  if (!slot) { slot = document.createElement('div'); slot.id = 'padShelfSlot'; view.appendChild(slot); }
  slot.innerHTML = padBookName(bookNameView(state)) + padShelf(shelfView(state, { editable: canEditCurrent() }));
}

// Outline a frame for about a second (CSS .pad-note-flash), as a note is when a place of it is gone to
function flashFrame(frameId) {
  const el = document.querySelector(`[data-pad-frame="${CSS.escape(frameId)}"]`);
  if (!el) return;
  el.classList.remove('pad-note-flash');
  void el.offsetWidth;
  el.classList.add('pad-note-flash');
  setTimeout(() => el.classList.remove('pad-note-flash'), 1100);
}

// Something hidden is gone to (a jump): what hides it goes first. { noteId } or { frameId }
export function reveal({ noteId, frameId }) {
  host.wrote(noteId ? revealNote(noteId) : revealFrame(frameId), 'Taken off the shelf');
}

function onTap(e) {
  const t = e.target.closest('[data-pad-action]');
  if (!t) return;
  const a = t.dataset.padAction;
  if (a === 'shelve-frame') host.wrote(shelveFrames([t.dataset.frame]), 'Put on the shelf');
  else if (a === 'shelve-all') host.wrote(shelveAllMade(), 'Put the made frames on the shelf');
  else if (a === 'unshelve') {
    const id = t.dataset.frame;
    if (!host.wrote(unshelveFrames([id]), 'Taken off the shelf')) return;
    host.jumpToFrame(id);
    flashFrame(id);
  }
  else if (a === 'toggle-fold') host.wrote(t.dataset.open === 'true' ? foldStrip(t.dataset.note) : unfoldStrip(t.dataset.note), null);
}

export function initFold(api) {
  host = api;
  document.getElementById('padView').addEventListener('click', onTap);
}
