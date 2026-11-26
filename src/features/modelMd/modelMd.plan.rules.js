// ===========================================
// MODEL.MD - From what was read to Event Book's own plan steps (pure)
// toPlan(parsed) → { plan, skipped }: the book as the steps and scenarios the agent tools' add_steps / add_scenarios and ☰ → Import of a
// plan file already build (src/features/planFile/build.js). Each step also carries `fields` per sticky (the model.md lists a
// command's fields apart from its events'), which the builder puts on the stickies.
//
//   change (🟦)      → a Do step: screen ⏹️, command 🟦, events 🟧 (🟨 external, 🟫 stored elsewhere)
//   view (🟩)        → a See step: read model (a list when [] ), the events it reads, `for <query>` as query fields
//   automation (⚙️)  → an Auto step: the event before ⚙️ wakes it, it reads 🟩 (a to-do view), sends the command, records the events after
//   time (⏰)        → an Auto step with no trigger: Event Book has no clock sticky, so the moment is the first line of the slice's note
//                      ("⏰ Sunday 20:00"); the export reads it back
//   ✓                → NOT carried over (Refined is the person's tick); the report counts them
//   Reply / At / free text / extras → the slice's note ("Reply (name): …"), never lost
// ===========================================

const DEFAULT_NOTHING = 'accepted, changes nothing';
export const STORED = 'stored elsewhere';

const fieldText = f => `${f.name}${f.type === 'array' ? '[]' : f.type && f.type !== 'string' ? `:${f.type}` : ''}`;
const withFields = (name, fields) => ({ name, fields: (fields || []).map(fieldText) });
const eventSpec = e => ({ name: e.name, ...(e.mark === 'external' ? { external: true } : {}), ...(e.mark === 'stored' ? { storage: { kind: STORED } } : {}) });
const quote = v => (/[\s,:(){}"]/.test(v) && !/^[\[{]/.test(v) ? `"${v.replace(/"/g, '\\"')}"` : v);
const argsText = a => Object.entries(a || {}).map(([k, v]) => `${k}:${quote(String(v))}`).join(', ');

function outcome(t) {
  if (!t.then) return 'no outcome';
  if (t.then.kind === 'error') return `refused: ${t.then.reason}`;
  if (t.then.kind === 'nothing') return 'nothing happens';
  return t.then.items.map(i => i.name).join(' and ');
}

function scenarioOf(s, t, used, skip, notes) {
  const subject = s.kind === 'view' ? s.view.name : s.kind === 'change' ? s.command.name : s.name;
  const query = s.kind === 'view' && t.when?.text ? ` for ${t.when.text}` : '';
  let name = t.name || `${subject}${query}: ${outcome(t)}`;
  const n = (used.get(name) || 0) + 1;
  used.set(name, n);
  if (n > 1) name = `${name} (${n})`;
  const x = { name };
  if (t.mustHave) x.mustHave = true;
  if (t.given.length) x.given = t.given.map(g => ({ event: g.name, values: g.args }));
  if (s.kind === 'view') {
    if (t.when?.text) x.when = { query: t.when.text.replace(/\s*\n\s*/g, ' ') };
  } else if (t.when?.name) {
    x.when = { command: s.command.name, values: t.when.args };
    if (t.when.name.toLowerCase() !== s.command.name.toLowerCase()) notes.push(`When names ${t.when.name} (${name}); the slice's command is ${s.command.name}`);
  }
  if (t.then?.kind === 'error') x.then = { rejected: t.then.reason || 'rejected' };
  else if (t.then?.kind === 'nothing') x.then = { nothing: t.then.reason || DEFAULT_NOTHING };
  else if (t.then?.kind === 'items') {
    const [first, ...more] = t.then.items;
    if (s.kind === 'view') x.then = { values: first.args, ...(first.rows ? { rows: first.rows } : first.list ? { rows: [] } : {}) };
    else x.then = { event: first.name, values: first.args };
    more.forEach(m => { notes.push(`Then also ${m.name}(${m.text}) (${name})`); skip.push({ line: `Then: ${m.name}(${m.text})`, kept: `${m.name}(${m.text})`, why: 'a scenario records one event' }); });
  }
  if (t.reply) notes.push(`Reply (${name}): ${t.reply}`);
  if (t.at) notes.push(`At (${name}): ${t.at}`);
  t.notes.forEach(l => notes.push(`Kept (${name}): ${l}`));
  return x;
}

function stepOf(s, skipped) {
  const notes = [];
  const used = new Map();
  const skip = [];
  const fields = [];                        // [{ type, name, fields: ['stars:number', …] }]
  const addFields = (type, f) => { if (f) fields.push({ type, ...withFields(f.name, f.fields) }); };
  const how = (f) => (f.fields || []).filter(x => x.how).forEach(x => notes.push(`How: ${f.name}.${x.name}: ${x.how}`));
  const base = { name: s.name };
  let step;
  if (s.kind === 'view') {
    const v = s.view;
    step = { ...base, kind: 'see', readModel: v.name, ...(v.list ? { list: true } : {}), events: s.events.map(eventSpec) };
    const names = v.query ? v.query.split(',').map(x => x.trim()).filter(Boolean) : [];
    const queryNames = names.filter(n => /^[\p{L}\p{N}_-]+$/u.test(n));
    names.filter(n => !queryNames.includes(n)).forEach(n => notes.push(`For: ${n}`));
    fields.push({ type: 'readModel', name: v.name, fields: [...queryNames.map(n => `?${n}`), ...v.fields.map(fieldText)] });
    how(v);
    s.events.forEach(e => addFields('event', e));
  } else if (s.kind === 'automation' || s.kind === 'time') {
    step = { ...base, kind: 'auto', processor: s.reads?.processor || s.name, ...(s.command ? { command: s.command.name } : {}), events: (s.results || []).map(eventSpec) };
    if (s.kind === 'automation') {
      step.using = s.reads.view; step.todo = true;
      if (s.triggers[0]) step.when = eventSpec(s.triggers[0]);
      s.triggers.forEach(e => addFields('event', e));
    } else notes.unshift(`⏰ ${s.moment}`);
    addFields('command', s.command);
    (s.results || []).forEach(e => addFields('event', e));
  } else {
    step = { ...base, kind: 'do', command: s.command.name, events: s.events.map(eventSpec), ...(s.screen ? { screen: s.screen.name } : {}) };
    addFields('screen', s.screen); addFields('command', s.command);
    s.events.forEach(e => addFields('event', e));
  }
  s.comments.forEach(c => notes.push(c));
  s.notes.forEach(n => notes.push(n));
  step.scenarios = s.tests.map(t => scenarioOf(s, t, used, skip, notes));
  skip.forEach(k => skipped.push({ chapter: s.chapter, slice: s.name, ...k }));
  step.description = notes.join('\n');
  if (!step.description) delete step.description;
  step.fieldsBySticky = fields.filter(f => f.fields.length);
  return step;
}

export function toPlan(parsed, name) {
  const skipped = [];
  const plan = {
    format: 'eventbook-plan/1', name: (parsed.title || name || 'model.md').trim(), ...(parsed.description ? { description: parsed.description } : {}),
    chapters: parsed.chapters.map(ch => ({ name: ch.name, steps: ch.slices.map(s => stepOf(s, skipped)) }))
  };
  return { plan, skipped };
}

export { argsText };
