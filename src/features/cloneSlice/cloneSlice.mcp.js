// What the agent tools (tools/eventpad-mcp) say about clones: the clone_slice tool, and "alternate of S5" in the outline.
import { cloneSlice } from './cloneSlice.command.js';
import { projectState, sliceRef } from '../../core/projections.js';

// In the outline, at the end of an alternate's line: " · alternate of S5" ('' for a slice that is no alternate, or whose original is gone)
export const alternateNote = (st, slice) => st.slices[slice.alternateOf] ? ` · alternate of ${sliceRef(st, slice.alternateOf)}` : '';

// The clone_slice tool, given the server's own helpers
export const cloneSliceTool = ({ findSlice, nameOf, S }) => ({
  name: 'clone_slice', edits: true,
  description: 'Clone a slice (#ref, S-number or title) as an alternate ending: a slice of its own, put right after it in its chapter, which REUSES the stickies it keeps (the same elements, not copies, so they stay one command and the board shows 🔗 on them). keep: { screen, command, events, scenarios }, default screen and command only (a view slice: readModel and screen); events are reused, scenarios are copied. ending: "Event Name" gives the clone a new event of that name carrying the command\'s fields (an event of the book with that name is reused); a view has no ending. An automation\'s change half is cloned too (its processor is reused and the clone is an automation of its own; its view half is not: clone the change half), and a clone sits in its original\'s flow. name: default "<slice> (alternate)". One undo. The outline marks it "alternate of S5".',
  inputSchema: { type: 'object', properties: { slice: S, name: S, ending: S, keep: { type: 'object', properties: { screen: { type: 'boolean' }, command: { type: 'boolean' }, readModel: { type: 'boolean' }, events: { type: 'boolean' }, scenarios: { type: 'boolean' } } } }, required: ['slice'] },
  run: ({ slice, name, ending, keep }) => {
    const s = findSlice(slice);
    const made = cloneSlice({ sliceId: s.id, name, keep: keep || {}, ending });
    if (typeof made === 'string') throw new Error(made);
    const st = projectState();
    return `Cloned ${nameOf(s, st)} as ${nameOf(st.slices[made.sliceId], st)}${ending ? `, ending in ${String(ending).trim()}` : ''}.`;
  }
});
