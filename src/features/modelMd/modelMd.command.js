// ===========================================
// MODEL.MD - Import Model Md (SC) and Export Model Md (SC)
// Import: the text is read (modelMd.parse.rules.js), turned into plan steps (modelMd.plan.rules.js) and built into a NEW book with the
// commands the agent tools' add_steps and ☰ → Import of a plan file use, all in one go (one undo batch, saved once at the end).
// Nothing is created when no slice can be read. Export: the open book as model.md text (modelMd.render.rules.js).
// ===========================================

import * as es from '../../core/eventStore.js';
import * as pr from '../../core/projections.js';
import * as c from '../board/command.js';
import * as ol from '../outline/command.js';
import { setQueryFields } from '../viewQueries/command.js';
import { parsePropertyText } from '../../core/constants.js';
import { addStep, addScenario, chapterId, checkScenario, elementByName } from '../planFile/build.js';
import { parse } from './modelMd.parse.rules.js';
import { toPlan } from './modelMd.plan.rules.js';
import { render } from './modelMd.render.rules.js';

export const NO_SLICES = 'No slices found: a model.md has ## chapters with slices (a name, then 🟦/🟧/🟩 lines)';

// Is this text a model.md (a ## chapter with a code block of stickies)? Used to tell it from a draft in ☰ → Import
export const looksLikeModelMd = text => /^##\s/m.test(text) && /^\s*```/m.test(text) && /^\s*(🟦|🟧|🟨|🟫|🟩|⏰|⚙)/mu.test(text);

const state = () => pr.projectState();
const nameOfFile = f => String(f || '').replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();

// Fields on the stickies a step made: each sticky keeps the fields its own line lists; one already there keeps what it has
function putFields(list) {
  list.forEach(({ type, name, fields }) => {
    const el = ol.findByName(type, name, state());
    if (!el) return;
    const text = fields.join(', ');
    parsePropertyText(text, 'string', el.properties.map(p => p.name)).parsed.forEach(({ name: field, type: propertyType, items }) =>
      es.appendEvent(es.EventTypes.PropertyAdded, { elementId: el.id, propertyId: c.newId('prop'), name: field, propertyType, ...(items ? { items } : {}) }));
    setQueryFields(el.id, parsePropertyText(text, 'string', []).parsed);
  });
}

// → { refused } (nothing created), or { id, name, counts: { chapters, slices, scenarios }, skippedLines, refined (slices marked ✓ in the file) }
export function importModelMd({ markdown, fileName } = {}) {
  const parsed = parse(markdown);
  if (!parsed.slices.length) return { refused: NO_SLICES };
  const { plan, skipped } = toPlan(parsed, nameOfFile(fileName));
  const before = es.getCurrentModelId();
  const id = es.createModel();
  const counts = { chapters: 0, slices: 0, scenarios: 0 };
  const problems = [];
  try {
    es.withoutSaving(() => {
      c.nameModel(plan.name);
      if (plan.description) c.describeModel(plan.description);
      for (const ch of plan.chapters) {
        const chId = chapterId(ch.name);
        counts.chapters++;
        for (const { scenarios, fieldsBySticky, ...step } of ch.steps) {
          try {
            // An automation reads a view: one the book has not got yet is a sticky of its own (its See slice may come later), not a second slice
            if (step.using && !ol.findByName('readModel', step.using, state())) elementByName('readModel', step.using);
            const sliceId = addStep(step, chId);
            putFields(fieldsBySticky);
            counts.slices++;
            for (const x of scenarios) {
              try { checkScenario(x); addScenario(state().slices[sliceId], x); counts.scenarios++; }
              catch (e) { problems.push({ chapter: ch.name, slice: step.name, line: x.name, kept: e.message }); }
            }
          } catch (e) { problems.push({ chapter: ch.name, slice: step.name, line: step.name, kept: `not built: ${e.message}` }); }
        }
      }
    });
  } catch (e) {
    es.deleteModel(id);
    if (before) es.openModel(before);
    throw e;
  }
  return { id, name: plan.name, counts, skippedLines: [...parsed.skippedLines, ...skipped, ...problems], refined: parsed.slices.filter(s => s.refined).length };
}

// The open book as model.md text. notation: 'v1.1' (default) or 'v1' (no marks)
export function exportModelMd({ notation = 'v1.1' } = {}) {
  return render(state(), { notation });
}
