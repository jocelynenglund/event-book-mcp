// ===========================================
// MODEL.MD - Paste Form (SV) and Export Options (SV): the words on the import sheet and the two Export lines
// ===========================================

import { projectState } from '../../core/projections.js';
import { exportModelMd } from './modelMd.command.js';

export const FORMAT_PAGE = 'adventvibes.itsybit.se/event-model.md';

export const pasteForm = () => ({
  hint: `A model.md in the plain-text event model notation (${FORMAT_PAGE}): ## chapters with slices, 🟦 🟧 🟩 lines and Given / When / Then tests. It becomes a new book; lines it can't read are kept as notes.`,
  placeholder: '# My model\n\n## Chores\n\n```\nAddChore\n 🟦 AddChore(chore, stars)\n 🟧 ChoreAdded(chore, stars)\n When: AddChore(chore:dishes, stars:2)\n Then: ChoreAdded(chore:dishes, stars:2)\n```'
});

export const exportOptions = () => ({
  options: [
    { notation: 'v1.1', title: 'model.md', desc: `The plain-text event model (${FORMAT_PAGE}), with field types, screens, must-haves and ✓: to keep next to your code` },
    { notation: 'v1', title: 'model.md, plain (v1)', desc: 'The same without the optional marks: any reader of the first version reads it' }
  ]
});

// What ☰ → Export… → model.md saves: { name (the file's), text }, or null when the book has no slices
export function exportDownload(notation = 'v1.1') {
  const state = projectState();
  if (!state.sliceOrder.length) return null;
  const slug = String(state.modelName || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return { name: `${slug || 'model'}.model.md`, text: exportModelMd({ notation }) };
}
