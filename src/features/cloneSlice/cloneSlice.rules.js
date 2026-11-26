// CLONE SLICE - Shared pure rules
import { sliceTitle } from '../../core/projections.js';

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
