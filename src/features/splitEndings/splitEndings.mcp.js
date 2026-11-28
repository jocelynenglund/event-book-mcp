// What the agent tools (tools/eventpad-mcp) say about Split into endings: the split_endings tool.
import { projectState } from '../../core/projections.js';
import { applyFix } from '../fieldSources/fixes.command.js';
import { fixId } from './splitEndings.rules.js';

export const splitEndingsTool = ({ findSlice, nameOf, S }) => ({
  name: 'split_endings', edits: true,
  description: 'Split a change slice (#ref, S-number or title) that shows 2+ outcome events into one slice per outcome (one command, one event: classic event modeling). The slice keeps the outcome most scenarios end in (ties: the first drawn); every other outcome gets a clone ("alternate of S5", its screen and command reused) with that event, taken off the original, and the scenarios whose Then is that event move to it. The same as fix_gaps\' "Split into endings" for the "look like alternate outcomes" gap. One undo; never changes a slice that is ☑ Refined.',
  inputSchema: { type: 'object', properties: { slice: S }, required: ['slice'] },
  run: ({ slice }) => {
    const s = findSlice(slice);
    const why = applyFix(fixId(s.id), { agent: true });
    if (why) throw new Error(`Not done: ${why}`);
    const st = projectState();
    const parts = [st.slices[s.id], ...Object.values(st.slices).filter(x => x.alternateOf === s.id)];
    return `Split into endings: ${parts.map(x => `${nameOf(x, st)} → ${x.elements.filter(id => st.elements[id]?.type === 'event').map(id => st.elements[id].name).join(', ')}`).join('; ')}.`;
  }
});
