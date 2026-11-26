// ===========================================
// PAD - Resizing a chapter arrow (the gesture's two ends, kept out of view.js)
// A selected arrow has a handle at its head (.pad-arrow-grip). While it is dragged the arrow's element follows the pointer (nothing is recorded);
// on drop one PadNoteResized is (command.js resizeNote). dx is in screen pixels, k the zoom.
// ===========================================

import { resizeNote } from './command.js';
import { arrowWidth } from './sketch.js';
import { stretchedWidth } from './arrowStretch.rules.js';

// The press: the arrow's width now, to drag from
export const arrowStart = (scene, id) => ({ w: scene.notes.find(n => n.noteId === id)?.w });

// Under the pointer: the arrow as wide as the drag says, within its limits
export function arrowDrag(world, id, from, dx, k) {
  const el = world.querySelector(`[data-pad-note="${id}"]`);
  if (el) el.style.width = `${arrowWidth(from.w + dx / k)}px`;
}

// Let go: record the new width (null when it did not change, else why it was refused)
export const arrowDrop = (id, from, dx) => resizeNote(id, from.w + dx);

// Stretch over the frames below it (the Stretch button, or a double tap on the handle): one resize, or null when there is nothing to stretch over
export function stretchArrow(scene, id) {
  const arrow = scene.notes.find(n => n.noteId === id && n.colour === 'arrow');
  if (!arrow) return null;
  const w = stretchedWidth({ x: arrow.x, y: arrow.y, w: arrow.w }, scene.frames, scene.notes.filter(n => n.colour === 'arrow' && n.noteId !== id));
  return w === null ? 'No frames below this arrow to stretch over' : resizeNote(id, w);
}
