// ===========================================
// PAD - Shelf (SV: Pad Shelf)
// The slim shelf along the bottom of the Pad: one chip per frame that Make chapter built into a chapter and that was shelved (the Pad draws neither
// that frame nor its notes: sketch.js), "✓ <the frame's name>"; a tap on a chip brings it back where it was. While made frames are still on the
// canvas, "Shelve all made (N)" puts them all on the shelf at once (a single frame is shelved from its own head, when selected).
// Nothing when there is nothing on the shelf and nothing made to put on it.
// -> { visible, editable, chips: [{ frameId, label, title }], shelveAll: { count, label, title } | null }
// ===========================================

import { padFrames } from './padFrames.read.js';

const CHIP_MAX = 28;
const cut = s => (s.length > CHIP_MAX ? `${s.slice(0, CHIP_MAX - 1).trimEnd()}…` : s);

export function padShelf(state, { editable = true } = {}) {
  const frames = padFrames(state, { editable, withShelved: true }).frames;
  const chips = frames.filter(f => f.shelved).map(f => ({
    frameId: f.frameId, label: `✓ ${cut(f.shownName)}`,
    title: `${f.shownName}${f.chapter ? `, in the chapter ${f.chapter.name}` : ''}: tap to put it back on the Pad`
  }));
  const todo = editable ? frames.filter(f => f.made && !f.shelved).length : 0;
  return {
    visible: !!chips.length || !!todo, editable, chips,
    shelveAll: todo ? { count: todo, label: `Shelve all made (${todo})`, title: `Put the ${todo} made ${todo === 1 ? 'frame' : 'frames'} on the shelf: the Pad stops drawing them and their notes` } : null
  };
}
