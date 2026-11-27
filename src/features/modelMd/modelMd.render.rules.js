// ===========================================
// MODEL.MD - Writing a book as the plain-text event model (pure: a projected book in, text out)
// render(state, { notation }) → model.md text. Chapters in timeline order, each a ## heading with one code block of slices; a slice is
// its name, its stickies, then its tests. notation 'v1.1' (default) adds the optional marks (field types, ⏹️ screens, 🟨 external,
// 🟫 stored elsewhere, ★ must-have, ✓ refined, # comments and scenario names); 'v1' leaves them out, so any v1 reader reads it.
// Not written: a slice's stable #id, a field's `?` or how it is made, a Reply or At line (the book has no place for them).
// ===========================================

import { getBoardGroups, getScenariosForSlice, sliceTitle } from '../../core/projections.js';
import { processorReads, processorTriggers } from '../board/processorReads.js';
import { isScreenField } from '../screenSelect/screenSelect.label.js'; // feature: screen-select
import { screenFieldText } from '../screenSelect/screenSelect.rules.js'; // feature: screen-select
import { queryParametersOf } from '../viewQueries/queryFields.js';

const TYPE_WORD = { number: 'number', date: 'date', decimal: 'money', guid: 'id', boolean: 'bool', array: 'list' };
const DEFAULT_NOTHING = 'accepted, changes nothing';

// A name as a sticky line carries it: no brackets, commas or colons (they would end it)
const clean = s => String(s ?? '').replace(/[()\[\],:\n]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Unnamed';

// A value as the notation writes it: bare when it is one word or a number, in quotes when it has spaces or punctuation, [lists] and {objects} as they are
export function valueText(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  const s = String(v);
  if (/^\[.*\]$|^\{.*\}$/s.test(s)) return s;
  return s === '' || /[\s,(){}\[\]"]/.test(s) ? `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : s;
}
const valuesText = values => Object.entries(values || {}).filter(([, v]) => v !== '' && v !== null && v !== undefined).map(([k, v]) => `${k}:${valueText(v)}`).join(', ');

export function render(state, { notation = 'v1.1' } = {}) {
  const v11 = notation !== 'v1';
  const el = id => state.elements[id];
  const field = p => isScreenField(p) ? screenFieldText(p) : `${clean(p.name)}${v11 && TYPE_WORD[p.type] ? `: ${TYPE_WORD[p.type]}` : ''}`;   // feature: screen-select (a screen's pick-one, hidden and required fields)
  const sticky = (mark, e, extra = '') => {
    const fields = (e.properties || []).filter(p => !(e.queryFields && e.queryFields[String(p.name).toLowerCase()]) && !queryParametersOf(e).includes(p.name));
    return ` ${mark} ${clean(e.name)}${e.list ? '[]' : ''}(${fields.map(field).join(', ')})${extra}`;
  };
  const eventMark = e => (!v11 ? '🟧' : e.external ? '🟨' : e.storage ? '🟫' : '🟧');

  const testLines = (slice, subject, moment) => {
    const scns = getScenariosForSlice(slice.id, state);
    const blocks = scns.map(scn => {
      const lines = [];
      if (v11 && scn.name) lines.push(` # ${String(scn.name).replace(/\n/g, ' ')}`);
      const body = [];
      if (scn.given?.length) body.push(`Given: ${scn.given.map(g => `${clean(el(g.elementId)?.name || 'Removed')}(${valuesText(g.values)})`).join(', ')}`);
      if (moment) body.push(`When: time reaches ${moment}`);
      else if (scn.when?.commandId) body.push(`When: ${clean(el(scn.when.commandId)?.name)}(${valuesText(scn.when.values)})`);
      else if (scn.when?.query) body.push(`When: ${clean(subject)}(${scn.when.query})`);
      const t = scn.then;
      if (t?.type === 'rejection') body.push(`Then: Error: ${t.reason || 'rejected'}`);
      else if (t?.type === 'nothing') body.push(`Then: nothing${v11 && t.reason && t.reason !== DEFAULT_NOTHING ? ` (${t.reason})` : ''}`);
      else if (t?.type === 'event') body.push(`Then: ${clean(el(t.eventId)?.name || 'Removed')}(${valuesText(t.values)})`);
      else if (t?.type === 'readModel') {
        const name = clean(el(t.readModelId)?.name || subject);
        body.push(t.rows ? `Then: ${name}[${t.rows.map(r => `(${valuesText(r)})`).join(', ')}]` : `Then: ${name}(${valuesText(t.values)})`);
      }
      if (!body.length) return null;
      if (v11 && scn.mustHave) body[0] = `★ ${body[0]}`;
      lines.push(...body.map(l => (l.startsWith('★') ? ` ${l}` : ` ${l}`)));
      return lines;
    }).filter(Boolean);
    return blocks.flatMap((b, i) => (i ? ['', ...b] : b));
  };

  const sliceBlock = slice => {
    const els = slice.elements.map(id => el(id)).filter(Boolean);
    const of = type => els.filter(e => e.type === type);
    const name = String(slice.name || sliceTitle(slice, state)).replace(/\n/g, ' ').trim();
    const out = [`${name}${v11 && slice.refined ? ' ✓' : ''}`];
    const comments = (slice.description || '').split('\n').filter(l => l.trim());
    let moment = null, tested = name;
    if (slice.type === 'SV') {
      const views = of('readModel'), events = of('event');
      views.forEach(v => {
        const q = queryParametersOf(v);
        out.push(sticky('🟩', v, q.length ? ` for ${q.join(', ')}` : ''));
        tested = v.name;
      });
      events.forEach(e => out.push(sticky(eventMark(e), e)));
    } else {
      const proc = of('processor')[0];
      const commands = of('command'), screens = of('screen');
      const own = of('event');
      if (proc) {
        const triggers = processorTriggers(state, proc.id), reads = processorReads(state, proc.id);
        if (v11 && /^⏰ /.test(comments[0] || '')) moment = comments.shift().slice(2).trim();
        if (moment) out.push(` ⏰ ${moment}`);
        else {
          triggers.slice(0, 1).forEach(t => out.push(sticky(eventMark(el(t.id)), el(t.id))));
          if (reads.length) out.push(` ⚙️ ${clean(proc.name) !== clean(name) ? `${clean(proc.name)} ` : ''}reads 🟩 ${clean(reads[0].name)}`);
        }
        commands.forEach(c => out.push(sticky('🟦', c)));
        own.filter(e => !triggers.some(t => t.id === e.id)).forEach(e => out.push(sticky(eventMark(e), e)));
      } else {
        if (v11) screens.forEach(s => out.push(sticky('⏹️', s)));
        commands.forEach(c => out.push(sticky('🟦', c)));
        own.forEach(e => out.push(sticky(eventMark(e), e)));
        tested = commands[0]?.name || name;
      }
    }
    if (v11 && comments.length) out.push(...comments.map(l => ` # ${l}`), '');
    const tests = testLines(slice, tested, moment);
    if (tests.length) { if (out.at(-1) !== '' && v11 && comments.length === 0) { /* stickies, then tests */ } out.push(...tests); }
    while (out.at(-1) === '') out.pop();
    return out.join('\n');
  };

  const lines = [`# ${String(state.modelName || 'Untitled model').replace(/\n/g, ' ')}`];
  if (state.modelDescription) lines.push('', ...state.modelDescription.split('\n').filter(l => l.trim() && !/^#|^```/.test(l)));
  getBoardGroups(state).filter(g => g.slices.length).forEach(g => {
    lines.push('', `## ${g.chapter?.name || 'Slices'}`, '', '```', g.slices.map(sliceBlock).join('\n\n'), '```');
  });
  return `${lines.join('\n')}\n`;
}
