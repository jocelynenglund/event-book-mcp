// ===========================================
// PAD - Shelf (SV: Pad Shelf)
// The slim shelf along the bottom of the Pad: one chip per CHAPTER with shelved frames (the Pad draws neither those frames nor their notes:
// sketch.js), "✓ <the chapter's name> · 3 frames"; a tap on a chip brings all of the chapter's frames back where they were. A chapter is on the
// shelf when any of its frames is (frames shelved one by one, before chapters were shelved whole, are grouped here). A shelved frame without a
// chapter (not expected) gets a chip of its own, named by the frame. While made frames are still on the canvas, "Shelve all chapters (N)" puts every
// chapter on the shelf at once (one chapter is shelved from the head of one of its frames, when selected).
// Nothing when there is nothing on the shelf and nothing made to put on it.
// -> { visible, editable, chips: [{ key, frameIds, label, count, title }], shelveAll: { count, label, title } | null }
// ===========================================

import { padFrames } from './padFrames.read.js';

const CHIP_MAX = 28;
const cut = s => (s.length > CHIP_MAX ? `${s.slice(0, CHIP_MAX - 1).trimEnd()}…` : s);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function padShelf(state, { editable = true } = {}) {
  const frames = padFrames(state, { editable, withShelved: true }).frames;
  const groups = new Map();
  frames.filter(f => f.shelved).forEach(f => {
    const key = f.chapter ? `chapter:${f.chapter.chapterId}` : `frame:${f.frameId}`;
    if (!groups.has(key)) groups.set(key, { key, name: f.chapter ? f.chapter.name : f.shownName, frameIds: [] });
    groups.get(key).frameIds.push(f.frameId);
  });
  const chips = [...groups.values()].map(g => ({
    key: g.key, frameIds: g.frameIds, label: `✓ ${cut(g.name)}`, count: `· ${plural(g.frameIds.length, 'frame', 'frames')}`,
    title: `${g.name}, ${plural(g.frameIds.length, 'frame', 'frames')}: tap to put the chapter back on the Pad`
  }));
  const todo = editable ? new Set(frames.filter(f => f.made && !f.shelved).map(f => f.chapter.chapterId)).size : 0;
  return {
    visible: !!chips.length || !!todo, editable, chips,
    shelveAll: todo ? { count: todo, label: `Shelve all chapters (${todo})`, title: `Put the ${plural(todo, 'chapter', 'chapters')} on the shelf: the Pad stops drawing their frames and notes` } : null
  };
}
