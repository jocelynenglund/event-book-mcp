// ===========================================
// FIELD SOURCES - Fix List (SV)
// Every gap of a slice (or of every slice of a chapter), each with why and its one-tap fixes, slice by slice, and
// each sticky whose fields are written as prose as one row ("Tidy fields…"). Fixed gaps are not there any more.
// scope: { sliceId }, { chapterId } or { all: true } (the whole book, for an agent). readOnly: a book that can't be changed here lists the gaps and offers no fix.
// { scope: 'slice' | 'chapter' | 'book', id, title, readOnly, total,
//   groups: [{ sliceId, chapterId (to unfold it on the way there), slice, rows: [{ elementId, sticky, field (null for prose), why, refs: [{ id, name }] (the other stickies the why names: a tap goes to them), fixes: [{ id, kind, label }] }] }] }
// ===========================================

import { fieldSources } from './rules.js';
import { fixesOf, tidyFix } from './fixes.js';
import { sliceTitle, projectState } from '../../core/projections.js';

const quoted = names => names.map(n => `"${n}"`).join(', ');

export function fixList(state, { sliceId = null, chapterId = null, all = false } = {}, { readOnly = false } = {}) {
  const ids = all ? state.sliceOrder.filter(id => state.slices[id])
    : sliceId ? (state.slices[sliceId] ? [sliceId] : []) : state.sliceOrder.filter(id => state.slices[id]?.chapterId === chapterId);
  const { gaps, tidy } = fieldSources(state);
  const offer = fixes => (readOnly ? [] : fixes);
  const groups = ids.map(id => {
    const rows = [
      ...gaps.filter(g => g.sliceId === id).map(g => ({ elementId: g.elementId, sticky: g.sticky, field: g.field, why: g.why, refs: (g.from || []).filter(f => g.why.includes(f.name)), fixes: offer(fixesOf(g, state)) })),
      ...tidy.filter(t => t.sliceId === id).map(t => ({ elementId: t.elementId, sticky: t.sticky, field: null, why: `fields written as prose: ${quoted(t.fields)}`, refs: [], fixes: offer([tidyFix(t)]) }))
    ];
    return { sliceId: id, chapterId: state.slices[id].chapterId || null, slice: sliceTitle(state.slices[id], state), rows };
  }).filter(g => g.rows.length);
  return {
    scope: all ? 'book' : sliceId ? 'slice' : 'chapter', id: all ? null : sliceId || chapterId,
    title: all ? (state.modelName || '') : sliceId ? (state.slices[sliceId] ? sliceTitle(state.slices[sliceId], state) : '') : (state.chapters[chapterId]?.name || ''),
    readOnly, total: groups.reduce((n, g) => n + g.rows.length, 0), groups
  };
}

// What to paste to an agent: the gaps, and the fix of each to apply (the eventpad MCP's fix_gaps / apply_fix)
export function fixListText(view, modelName = '') {
  const named = r => (r.field && r.field !== '(the event)' ? `${r.sticky}.${r.field}` : r.sticky);
  const body = view.groups.map(g => [g.slice, ...g.rows.flatMap(r => [`- ${named(r)}: ${r.why}`, ...r.fixes.map(f => `  - apply_fix "${f.id}": ${f.label}`)])].join('\n'));
  return [`Information completeness gaps in the Event Book model "${modelName}". With the eventpad MCP, fix_gaps lists them and apply_fix {fix} applies one fix (it never changes a ☑ Refined slice):`, '', ...body.flatMap((b, i) => (i ? ['', b] : [b]))].join('\n');
}

// The same, read from the book as it is now (a tap on a count or a fix asks the open book)
export const fixListNow = (scope, opts) => fixList(projectState(), scope, opts);
export const fixListTextNow = scope => fixListText(fixList(projectState(), scope), projectState().modelName || '');
