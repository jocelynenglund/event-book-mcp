// CLONE SLICE - Shared pure rules
import { sliceTitle } from '../../core/projections.js';

export const alternateName = title => `${title} (alternate)`;

// What may be cloned: a change or a view that is a slice of its own (not half of an automation, not an inferred one)
export const cloneable = (slice, sliceId = slice?.id) => !!slice && !String(sliceId).startsWith('au_inferred_') && (slice.type === 'SC' || slice.type === 'SV') && !slice.pairWith && slice.actor !== 'processor';

// The kinds of sticky a slice of this type can keep, and what each is called to the person; the top lane is a screen
export const keepKinds = type => type === 'SV'
  ? [['readModel', 'read model'], ['screen', 'screen'], ['events', 'events']]
  : [['screen', 'screen'], ['command', 'command'], ['events', 'events']];

// What a clone keeps when nothing is said: its screen, its command (a view: read model and screen); not its events, not its scenarios
export const defaultKeep = { screen: true, command: true, readModel: true, events: false, scenarios: false };

// The slice's own title, for the clone's name
export const nameFor = (slice, book) => alternateName(sliceTitle(slice, book));
