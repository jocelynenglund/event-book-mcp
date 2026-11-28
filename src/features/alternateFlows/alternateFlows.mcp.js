// What the agent tools say about alternate flows: flows_for_alternates, and the Outline's note on an alternate that is in a flow.
import { projectState, sliceFlow, chapterFlows } from '../../core/projections.js';
import { putAlternatesInFlows } from './alternateFlows.command.js';
import { renameFlow } from '../board/command.js';

// rename_flow {chapter, flow, name}: flows are named per chapter, so the same way through can end up with two names
export const renameFlowTool = () => ({
  name: 'rename_flow', edits: true,
  description: 'Rename a flow (a named way through a chapter, such as "it fails") of a chapter, by the chapter\'s name and the flow\'s current name (case-insensitive). The slices in it stay in it; the outline and the board say the new name. One undo.',
  inputSchema: { type: 'object', properties: { chapter: { type: 'string' }, flow: { type: 'string', description: 'The flow\'s current name' }, name: { type: 'string', description: 'Its new name' } }, required: ['chapter', 'flow', 'name'] },
  run: ({ chapter, flow, name } = {}) => {
    const st = projectState();
    const key = x => String(x ?? '').trim().toLowerCase();
    const ch = Object.values(st.chapters).find(x => key(x.name) === key(chapter));
    if (!ch) throw new Error(`No chapter "${chapter}" (chapters: ${st.chapterOrder.map(id => st.chapters[id]?.name).join('; ')})`);
    const flows = chapterFlows(ch.id, st);
    const f = flows.find(x => key(x.name) === key(flow));
    if (!f) throw new Error(`${ch.name} has no flow "${flow}" (its flows: ${flows.map(x => x.name).join('; ') || 'none'})`);
    const next = String(name ?? '').replace(/\s+/g, ' ').trim();
    if (!next) throw new Error('A flow needs a name');
    renameFlow(f.id, next);
    return `Renamed ${ch.name}'s flow "${f.name}" to "${next}".`;
  }
});

export const flowNote = (st, slice) => slice.alternateOf && sliceFlow(slice, st) ? ` · in flow "${sliceFlow(slice, st).name}"` : '';

export const alternateFlowsTool = () => ({
  name: 'flows_for_alternates', edits: true,
  description: 'Put alternate endings ("alternate of S5") in flows of their chapter, for books made before clone_slice and split_endings did it themselves. Each alternate with no flow goes in a flow named after its ending (its name\'s part after a colon, else its outcome event), reusing a flow of that chapter that the same original\'s other alternates are in, or one of the same name; the original stays on the main line. chapter: one chapter (name; default: every chapter). One undo; never changes a slice that is ☑ Refined.',
  inputSchema: { type: 'object', properties: { chapter: { type: 'string', description: 'Chapter name; default: all' } } },
  run: ({ chapter } = {}) => {
    const st = projectState();
    const ch = chapter ? Object.values(st.chapters).find(x => x.name.trim().toLowerCase() === String(chapter).trim().toLowerCase()) : null;
    if (chapter && !ch) throw new Error(`No chapter "${chapter}" (chapters: ${st.chapterOrder.map(id => st.chapters[id]?.name).join('; ')})`);
    const n = putAlternatesInFlows({ chapterId: ch?.id || null, skipRefined: true });
    return n ? `Put ${n} alternate${n === 1 ? '' : 's'} in flows.` : 'Every alternate is in a flow already (or has no ending to name one by).';
  }
});
