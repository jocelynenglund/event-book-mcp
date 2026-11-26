// What the agent tools (tools/eventpad-mcp) do with model.md: import_model_md and export_model_md, over the same parse / render the app uses.
// The tools get the server's own helpers; files are only read and written under the home folder.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { importModelMd, exportModelMd } from './modelMd.command.js';
import { projectState } from '../../core/projections.js';
import { getCurrentModelId } from '../../core/eventStore.js';

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const underHome = (p, what) => {
  const home = os.homedir();
  const full = path.resolve(String(p).replace(/^~(?=$|\/)/, home));
  let real = full;
  if (what === 'read') { try { real = fs.realpathSync(full); } catch { throw new Error(`No such file: ${p}`); } }
  if (!real.startsWith(home + path.sep)) throw new Error(`Only files under the home folder can be ${what === 'read' ? 'imported' : 'written'}`);
  return full;
};

export const modelMdTools = ({ S }) => [
  { name: 'import_model_md',
    description: 'Bring a model.md (the plain-text event model, adventvibes.itsybit.se/event-model.md: ## chapters, each with a code block of slices with 🟦 🟧 🟩 ⚙️ ⏰ lines and Given/When/Then tests, v1 or v1.1) in as a NEW local book and open it, built the way add_steps builds. Give a path (under the home folder) or the markdown itself. Lines it cannot read are kept as notes on their slice and listed (never dropped); ✓ is not carried over (Refined is the person\'s tick); a text with no slices is refused and nothing is made. The reply has the counts, the skipped lines and the completeness gaps. keep_model puts it in the library.',
    inputSchema: { type: 'object', properties: { path: S, markdown: S }, },
    run: ({ path: p, markdown }) => {
      if (!p && !markdown) throw new Error('Give a path to a model.md, or the markdown');
      const text = p ? fs.readFileSync(underHome(p, 'read'), 'utf8') : markdown;
      const r = importModelMd({ markdown: text, fileName: p ? path.basename(p) : '' });
      if (r.refused) throw new Error(r.refused);
      const st = projectState();
      const lines = [`Imported ${r.name} as a new model (id=${getCurrentModelId()}): ${count(r.counts.chapters, 'chapter', 'chapters')} · ${count(r.counts.slices, 'slice', 'slices')} · ${count(r.counts.scenarios, 'scenario', 'scenarios')}.`];
      if (r.skippedLines.length) lines.push(`Kept as notes (${r.skippedLines.length}):`, ...r.skippedLines.slice(0, 25).map(k => `  ${k.slice || k.chapter}: ${k.kept}`), ...(r.skippedLines.length > 25 ? [`  … ${r.skippedLines.length - 25} more`] : []));
      else lines.push('No skipped lines.');
      if (r.refined) lines.push(`${count(r.refined, 'slice is', 'slices are')} marked ✓ in the file: not carried over (only the person ticks Refined).`);
      lines.push(`outline shows it${st.sliceOrder.length ? '; fix_gaps lists its completeness gaps' : ''}.`);
      return lines.join('\n');
    } },
  { name: 'export_model_md',
    description: 'Write the open book as a model.md (the plain-text event model, adventvibes.itsybit.se/event-model.md): chapters in timeline order, each a ## heading with one code block of slices, stickies with fields, tests with example values. notation: "v1.1" (default: adds field types, ⏹️ screens, 🟨 external and 🟫 kept-elsewhere events, ★ must-have, ✓ refined, # comments) or "v1" (without the marks). path: where to write it (under the home folder; default ~/exports/<book>.model.md); without a file the text is the reply when text:true.',
    inputSchema: { type: 'object', properties: { path: S, notation: { type: 'string', enum: ['v1.1', 'v1'] }, text: { type: 'boolean' } } },
    run: ({ path: p, notation = 'v1.1', text }) => {
      const md = exportModelMd({ notation });
      if (text && !p) return md;
      const name = (projectState().modelName || 'event-model').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'event-model';
      const out = p ? underHome(p, 'write') : path.join(os.homedir(), 'exports', `${name}.model.md`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, md);
      return `Saved ${out} (${notation}, ${count(md.split('\n').filter(l => /^\S/.test(l) && !/^(#|```)/.test(l)).length, 'slice', 'slices')}).`;
    } }
];
