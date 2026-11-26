// ===========================================
// MODEL.MD - Reading the plain-text event model (pure: text in, a model out)
// The notation is the Advent of Vibes page's (adventvibes.itsybit.se/event-model.md, v1.1): ## chapters, each with one code block of
// slices; a slice is its name, then its stickies (🟦 🟧 🟩 ⚙️ ⏰, v1.1 also ⏹️ 🟨 🟫), then its tests (Given / When / Then / Reply,
// At, ★, # comments). Real files drift: free text in a test, stickies between tests, a field written `via?`. Whatever can't be
// read as the notation is kept (skippedLines, and a note on the slice), never dropped.
//
//   parse(md) → { title, description, chapters: [{ name, slices }], slices, scenarios, skippedLines }
//   skippedLines: [{ chapter, slice, line, kept }]  (line: the line as written; kept: the part that was not read)
// ===========================================

const MARKS = { '🟦': 'command', '🟧': 'event', '🟨': 'external', '🟫': 'stored', '🟩': 'view', '⏹': 'screen', '⚙': 'processor', '⏰': 'time' };
const STICKY_LINE = /^(🟦|🟧|🟨|🟫|🟩|⏹|⚙|⏰)\uFE0F?\s*(.*)$/u;
const TEST_LINE = /^(★\s*)?(Given|When|Then|Reply|At)\s*:\s*(.*)$/i;
export const TYPES = { text: 'string', number: 'number', date: 'date', money: 'decimal', id: 'guid', bool: 'boolean', list: 'array' };

// Split at commas that are not inside (), [], {} or "…"
export function splitTop(text, sep = ',') {
  const out = [];
  let depth = 0, quote = false, cur = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) { cur += ch; if (ch === '\\') cur += text[++i] ?? ''; else if (ch === '"') quote = false; continue; }
    if (ch === '"') { quote = true; cur += ch; continue; }
    if ('([{'.includes(ch)) depth++;
    if (')]}'.includes(ch)) depth = Math.max(0, depth - 1);
    if (ch === sep && !depth) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim()).filter(Boolean);
}

// The index of the bracket that closes the one at `at`; -1 when it never closes
function closing(text, at) {
  const open = text[at], close = { '(': ')', '[': ']', '{': '}' }[open];
  let depth = 0, quote = false;
  for (let i = at; i < text.length; i++) {
    const ch = text[i];
    if (quote) { if (ch === '\\') i++; else if (ch === '"') quote = false; continue; }
    if (ch === '"') { quote = true; continue; }
    if (ch === open) depth++;
    if (ch === close && --depth === 0) return i;
  }
  return -1;
}

// A value as written: "quoted text" → text; [a, b] and {a: 1} stay as written; anything else is bare text
export function value(text) {
  const t = String(text ?? '').trim();
  const q = t.match(/^"((?:[^"\\]|\\.)*)"$/s);
  return q ? q[1].replace(/\\(["\\])/g, '$1') : t;
}

// "person:astrid, party:p1, at:2026-11-30T09:15:00Z" → { person: 'astrid', … }; an entry with no colon is a key with no value
export function args(text) {
  const out = {};
  splitTop(text).forEach(entry => {
    const at = entry.indexOf(':');
    if (at < 1) { out[entry.replace(/^"|"$/g, '')] = ''; return; }
    out[entry.slice(0, at).trim()] = value(entry.slice(at + 1));
  });
  return out;
}

// What a sticky's brackets list: "chore, stars: number, open: added minus claimed, via?" → [{ name, type?, how?, optional? }]
export function fieldList(text) {
  return splitTop(text).map(entry => {
    const at = entry.indexOf(':');
    const head = (at < 0 ? entry : entry.slice(0, at)).trim();
    const tail = at < 0 ? '' : entry.slice(at + 1).trim();
    const optional = /\?$/.test(head);
    const name = head.replace(/\?$/, '').trim();
    if (!name) return null;
    const f = { name };
    if (optional) f.optional = true;
    if (tail) { if (TYPES[tail.toLowerCase()]) f.type = TYPES[tail.toLowerCase()]; else f.how = tail; }
    return f;
  }).filter(Boolean);
}

// The sticky at the start of a piece of text: Name, Name(a:1), Name[](a, b) or Name[(a:1), (b:2)]; then what follows it.
// A bare word counts only when it is all there is: "reply {ok: true}" is free text, not a sticky called reply.
// → { name, text (inside the brackets), list, rows (of Name[(…), (…)]), rest } or null
export function takeSticky(piece) {
  const t = String(piece).trim();
  // A name may have spaces ("Order placed(…)") when brackets follow; a bare name is one word
  const bracket = t.search(/[(\[]/);
  const name = (bracket < 0 ? t.match(/^[\p{L}_][\p{L}\p{N}_.\-]*/u)?.[0] : /^[\p{L}_][\p{L}\p{N}_.\- ]*$/u.test(t.slice(0, bracket)) ? t.slice(0, bracket).trim() : null) || null;
  if (!name) return null;
  let i = bracket < 0 ? name.length : bracket, list = false, rows = null, inner = '';
  if (t[i] === '[') {
    const end = closing(t, i);
    if (end < 0) return null;
    const body = t.slice(i + 1, end).trim();
    if (body === '') {
      list = true; i = end + 1;
      if (t[i] === '(') { const e2 = closing(t, i); if (e2 < 0) return null; inner = t.slice(i + 1, e2); i = e2 + 1; }
    } else if (body.startsWith('(')) { rows = splitTop(body).map(r => r.replace(/^\(/, '').replace(/\)$/, '')); list = true; i = end + 1; }
    else return null;
  } else if (t[i] === '(') {
    const end = closing(t, i);
    if (end < 0) return null;
    inner = t.slice(i + 1, end); i = end + 1;
  } else if (i < t.length) return null;          // a bare word followed by more words: free text
  return { name, text: inner, list, rows, rest: t.slice(i).trim() };
}

// A line's own stickies: "A(x:1), B(y:2) and reply {ok: true}" → { items: [{ name, args }], left: ['and reply {ok: true}'] }
function stickies(text) {
  const items = [], left = [];
  splitTop(text).forEach(piece => {
    const s = takeSticky(piece);
    if (!s) { left.push(piece); return; }
    items.push({ name: s.name, args: args(s.text), text: s.text, list: s.list, ...(s.rows ? { rows: s.rows.map(args) } : {}) });
    if (s.rest) left.push(s.rest);
  });
  return { items, left };
}

// The name, check mark and id on a slice's own line: "CloseWeek ✓ #s3"
function header(line) {
  let rest = line.trim(), refined = false, id = null, m;
  while ((m = rest.match(/\s+(✓|✔️?|#[\w-]+)$/u))) { if (m[1].startsWith('#')) id = m[1]; else refined = true; rest = rest.slice(0, m.index).trim(); }
  return { name: rest, refined, id };
}

const isContent = line => STICKY_LINE.test(line.trim()) || TEST_LINE.test(line.trim()) || /^★/.test(line.trim());

// The text of the file → its title, and its lines of slices by chapter (code blocks under ## headings)
function blocks(md) {
  const chapters = [];
  let title = null, cur = null, fence = null;
  const desc = [];
  for (const raw of String(md ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    if (fence) {
      if (new RegExp('^\\s*`{' + fence.size + ',}\\s*$').test(raw)) { fence = null; continue; }
      if (fence.model) cur.lines.push(raw);
      continue;
    }
    const open = raw.match(/^\s*(`{3,})\s*([\w-]*)/);
    if (open) {
      // An example of the file inside the file (```markdown): its fence is not a model
      const isMd = ['markdown', 'md'].includes(open[2].toLowerCase());
      fence = { size: open[1].length, model: !isMd };
      if (fence.model && !cur) chapters.push(cur = { name: null, lines: [] });
      continue;
    }
    const h2 = raw.match(/^##\s+(.+?)\s*#*\s*$/);
    if (h2) { chapters.push(cur = { name: h2[1].trim(), lines: [] }); continue; }
    const h1 = raw.match(/^#\s+(.+?)\s*$/);
    if (h1 && !title && !cur) { title = h1[1].trim(); continue; }
    if (!cur && title && raw.trim()) desc.push(raw.trim());
  }
  return { title, description: desc.join('\n'), chapters };
}

const newSlice = (h, chapter) => ({
  name: h.name, chapter, refined: h.refined, id: h.id, kind: null,
  screen: null, command: null, commands: [], events: [], views: [], reads: null, moment: null,
  comments: [], notes: [], tests: [], _order: 0
});

function parseSlice(s, lines, skip) {
  let test = null, afterBreak = true, pendingName = null, pendingMust = false;
  const start = key => {
    if (!test || afterBreak || (test.sawThen && /^(given|when|at)$/i.test(key))) {
      test = { name: pendingName, mustHave: false, at: null, given: [], when: null, then: null, reply: null, sawThen: false, notes: [] };
      s.tests.push(test); pendingName = null;
    }
    afterBreak = false;
    return test;
  };
  const note = (line, kept) => { skip(line, kept); s.notes.push(kept); };
  const dropName = () => { if (pendingName) { s.comments.push(pendingName); pendingName = null; } };
  lines.forEach(raw => {
    const line = raw.trim();
    if (!line) { afterBreak = true; dropName(); return; }
    if (line.startsWith('#')) { dropName(); pendingName = line.replace(/^#+\s*/, ''); return; }
    const sticky = line.match(STICKY_LINE);
    if (sticky && !TEST_LINE.test(line)) {
      dropName();
      const mark = MARKS[sticky[1]], body = sticky[2].trim();
      if (mark === 'time') { s.moment = s.moment || body; s._order++; return; }
      if (mark === 'processor') {
        const r = body.match(/^(?:(.*?)\s+)?reads\s+(?:🟩\uFE0F?\s*)?(.+)$/i);
        if (!r) { note(line, line); return; }
        const view = takeSticky(r[2]);
        s.reads = s.reads || { processor: r[1]?.trim() || null, view: (view?.name || r[2]).trim(), at: s._order };
        s._order++;
        return;
      }
      const forQuery = body.match(/^(.*?)\s+for\s+(.+)$/i);
      const sk = takeSticky(forQuery ? forQuery[1] : body);
      if (!sk) { note(line, line); return; }
      const item = { name: sk.name, fields: fieldList(sk.text), list: sk.list, at: s._order++ };
      if (mark === 'event' || mark === 'external' || mark === 'stored') s.events.push({ ...item, mark: mark === 'event' ? null : mark });
      else if (mark === 'command') { if (s.command) s.commands.push(item); else s.command = item; }
      else if (mark === 'screen') s.screen = s.screen || item;
      else if (mark === 'view') s.views.push({ ...item, query: forQuery ? forQuery[2].trim() : null });
      if (sk.rest) { skip(line, sk.rest); s.notes.push(sk.rest); }
      return;
    }
    const t = line.match(TEST_LINE) || (line.startsWith('★') ? [line, '★', '', ''] : null);
    if (!t) { dropName(); note(line, line); return; }
    const key = (t[2] || '').toLowerCase(), body = t[3].trim();
    if (!key) { afterBreak = true; pendingMust = true; return; }   // a ★ on a line of its own: the next test is a must-have
    const tt = start(key);
    if (t[1] || pendingMust) { tt.mustHave = true; pendingMust = false; }
    if (key === 'at') { tt.at = body; return; }
    if (key === 'reply') { tt.reply = body; return; }
    const kept = l => { skip(line, l); tt.notes.push(l); };
    if (key === 'given') {
      const { items, left } = stickies(body);
      tt.given.push(...items);
      left.forEach(kept);
      return;
    }
    if (key === 'when') {
      const time = body.match(/^time\s+reaches\s+(.+)$/i);
      if (time) { tt.when = { time: time[1].trim() }; return; }
      const { items, left } = stickies(body);
      if (items.length) tt.when = items[0]; else kept(body);
      items.slice(1).forEach(x => kept(`${x.name}(${x.text})`));
      left.forEach(kept);
      return;
    }
    tt.sawThen = true;     // Then
    const err = body.match(/^error\s*:\s*(.*)$/i);
    if (err) { tt.then = { kind: 'error', reason: value(err[1]) }; return; }
    const nothing = body.match(/^nothing\b\s*(.*)$/i);
    if (nothing) {
      const why = nothing[1].match(/^\((.*?)\)\s*(.*)$/);
      tt.then = { kind: 'nothing', reason: why ? why[1].trim() : '' };
      const rest = (why ? why[2] : nothing[1]).trim();
      if (rest) kept(rest);
      return;
    }
    const { items, left } = stickies(body);
    tt.then = items.length ? { kind: 'items', items } : null;
    left.forEach(kept);
  });
  dropName();
  s.tests.forEach(t => { delete t.sawThen; });
}

// Which kind of slice it is, from what it holds; what is missing is filled in and said (a note)
function classify(s) {
  if (s.moment !== null) s.kind = 'time';
  else if (s.reads) s.kind = 'automation';
  else if (s.command) s.kind = 'change';
  else if (s.views.length) s.kind = 'view';
  else s.kind = 'change';
  if (s.kind === 'view') {
    s.view = s.views[0];
    s.views.slice(1).forEach(v => s.notes.push(`Also a view: ${v.name}`));
  } else s.views.forEach(v => s.notes.push(`🟩 ${v.name} is not a view slice`));
  if ((s.kind === 'change' || s.kind === 'automation') && !s.command) {
    const w = s.tests.find(t => t.when?.name);
    s.command = { name: w?.when?.name || s.name, fields: [], list: false, at: 0, inferred: true };
    s.notes.push(`No 🟦 line: the command is named ${s.command.name}`);
  }
  if (s.kind === 'automation') {
    s.triggers = s.events.filter(e => e.at < s.reads.at);
    s.results = s.events.filter(e => e.at > s.reads.at);
    s.triggers.slice(1).forEach(e => s.notes.push(`Also wakes on ${e.name}`));
    s.triggers = s.triggers.slice(0, 1);
  }
  if (s.kind === 'time') {
    s.results = s.events; s.triggers = [];
    if (!s.command && !s.results.length) { s.command = { name: s.name, fields: [], list: false, at: 0, inferred: true }; s.notes.push(`No 🟦 or 🟧 line: the command is named ${s.name}`); }
  }
  s.commands.forEach(c => s.notes.push(`Also a command: ${c.name}`));
}

export function parse(md) {
  const { title, description, chapters: raw } = blocks(md);
  const skippedLines = [], chapters = [], slices = [], scenarios = [];
  raw.forEach(ch => {
    const chapter = { name: ch.name || title || 'Model', slices: [] };
    let s = null, buf = [];
    const flush = () => {
      if (!s) return;
      const here = s;
      parseSlice(here, buf, (line, kept) => skippedLines.push({ chapter: chapter.name, slice: here.name, line, kept }));
      classify(here);
      chapter.slices.push(here); slices.push(here);
      here.tests.forEach(t => scenarios.push({ slice: here.name, ...t }));
      s = null; buf = [];
    };
    ch.lines.forEach(raw => {
      const line = raw.replace(/\s+$/, '');
      if (!line.trim()) { buf.push(line); return; }
      const content = /^\s/.test(line) || isContent(line) || line.trim().startsWith('#');
      if (!content) { flush(); s = newSlice(header(line), chapter.name); return; }
      if (!s) { skippedLines.push({ chapter: chapter.name, slice: null, line: line.trim(), kept: line.trim() }); return; }
      buf.push(line);
    });
    flush();
    if (chapter.slices.length) chapters.push(chapter);
  });
  return { title, description, chapters, slices, scenarios, skippedLines };
}
