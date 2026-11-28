// CLONE SLICE - Shared pure rules
import { sliceTitle, sliceRef } from '../../core/projections.js';

export const alternateName = title => `${title} (alternate)`;

// An automation's slice: run by a processor (the change half, or the to-do view half it reads)
const holdsProcessor = (slice, book) => !!book && slice.elements.some(id => book.elements[id]?.type === 'processor');
export const isAutomation = (slice, book) => !!slice && (slice.actor === 'processor' || !!slice.pairWith || holdsProcessor(slice, book));

// Why a slice is not cloned (the words), or null when it can be: a change or a view of its own, or the CHANGE half of an automation
// (its view half is not: clone the change half). An inferred slice is not either.
export function cloneRefusal(slice, sliceId = slice?.id, book = null) {
  if (!slice) return 'That slice is gone';
  if (String(sliceId).startsWith('au_inferred_')) return 'An inferred slice is not cloned';
  if (slice.type === 'SV' && isAutomation(slice, book)) return 'Clone the change half of an automation';
  if (slice.type !== 'SC' && slice.type !== 'SV') return 'That slice is not cloned';
  return null;
}

// What may be cloned
export const cloneable = (slice, sliceId = slice?.id, book = null) => cloneRefusal(slice, sliceId, book) === null;

// The kinds of sticky a slice of this type can keep, and what each is called to the person; the top lane is a screen
export const keepKinds = type => type === 'SV'
  ? [['readModel', 'read model'], ['screen', 'screen'], ['events', 'events']]
  : [['screen', 'screen'], ['processor', 'processor'], ['command', 'command'], ['events', 'events']];

// What a clone keeps when nothing is said: its screen, its processor (an automation), its command (a view: read model and screen); not its events, not its scenarios
export const defaultKeep = { screen: true, processor: true, command: true, readModel: true, events: false, scenarios: false };

// The slice's own title, for the clone's name
export const nameFor = (slice, book) => alternateName(sliceTitle(slice, book));

// The main-line slice an alternate stands in for: follow alternateOf (a chain from an older book: S5 of S4 of S3) to its end. A slice that is no
// alternate is its own root. A loop in the book's own events stops where it began.
export function alternateRoot(book, sliceId) {
  const seen = new Set();
  let id = sliceId;
  while (book.slices[id]?.alternateOf && book.slices[book.slices[id].alternateOf] && !seen.has(id)) { seen.add(id); id = book.slices[id].alternateOf; }
  return id;
}

// Why a slice cannot point at `targetId` as its original (the words), or null when it can; targetId null means "none" and always can
export function alternateOfRefusal(book, sliceId, targetId) {
  const slice = book.slices[sliceId];
  if (!slice) return 'That slice is gone';
  if (!targetId) return null;
  const target = book.slices[targetId];
  if (!target) return 'That slice is gone';
  if (targetId === sliceId) return 'A slice is not an alternate of itself';
  if ((target.chapterId || null) !== (slice.chapterId || null)) return "An alternate stays in its original's chapter";
  const seen = new Set();
  for (let id = targetId; id && book.slices[id] && !seen.has(id); id = book.slices[id].alternateOf) {
    if (id === sliceId) return `That would make a loop: ${sliceRef(book, sliceId)} would be an alternate of one of its own alternates`;
    seen.add(id);
  }
  return null;
}
