// ===========================================
// PAD - What to suggest while typing (SV: Pad Suggestions uses these; pure)
// Where the caret is says what is being named, and so which names to offer:
//   scenario note   after Given / G: → events;  after Then / T: → events (and "rejected:" and "nothing:"; a view's Then names the view);
//                   after When / W: → commands (and "query (" on a view's frame); Q: → nothing; And / A: / &: go on with the keyword before;
//                   inside "Event (" or "Command (" → that one's fields (until its ":")
//   automation note after "reads" → read models;  after → or -> → commands and events
//   screen note     inside { } → read models;  inside ( ) → commands
//   other notes     the first line of a blue note → commands, of an orange one → events, of a green one → views
//   ＋ Events       each line → events
// The word being typed is matched by any part of a name ("conf" finds Product Configured; "prod conf" too), names in the same frame first.
// Nothing is ever overwritten but the word typed: a suggestion replaces [from, to) and nothing else.
// ===========================================

const SHORT_KEYS = { g: 'given', w: 'when', t: 'then', q: 'query', a: 'and', '&': 'and' };
const LONG_KEY = /^(given|when|then|and)(?::\s*|\s+)/i;                 // the keyword is done: a colon or a space follows it
const SHORT_KEY = /^([gwtqa&])\s*:\s*/i;
const READS = /^reads(?::\s*|\s+)/i;
const ARROW = /^(?:→|->|=>)\s*/;
const MARKER = /^\s*(?:(?:[-*•]|\d+[.)]|\[[ xX]?\])\s+)+/;
const SEPARATOR = /\s*,\s*|\s+and\s+/gi;                              // between the events of a Given

const LIMIT = 6;
const wordsOf = text => String(text).replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

// The word being typed on the line `before` (the text of its line up to the caret), after `skip` characters: where it starts and what it is
function tail(before, skip, splitLists = false) {
  let start = skip;
  if (splitLists) for (const m of before.slice(skip).matchAll(SEPARATOR)) start = skip + m.index + m[0].length;
  const word = before.slice(start), lead = word.length - word.trimStart().length;
  return { from: start + lead, query: word.trimStart() };
}

// The unclosed bracket the caret is in on this line: { open: '(' | '{' | '[', at } or null
function openBracket(before) {
  const stack = [];
  [...before].forEach((ch, i) => {
    if ('({['.includes(ch)) stack.push({ open: ch, at: i });
    else if (')}]'.includes(ch)) stack.pop();
  });
  return stack[stack.length - 1] || null;
}

// The keyword a scenario line is under: its own, or (for And) the last one before it. -> 'given' | 'when' | 'then' | 'query' | null (a line with no keyword)
function keywordAt(lines, index) {
  const word = i => { const long = lines[i].match(LONG_KEY), short = !long && lines[i].match(SHORT_KEY); return long ? long[1].toLowerCase() : short ? SHORT_KEYS[short[1].toLowerCase()] : null; };
  const own = word(index);
  if (own !== 'and') return own;
  for (let i = index - 1; i >= 1; i--) { const earlier = word(i); if (earlier && earlier !== 'and') return earlier; }
  return null;
}

// What is being named at the caret. colour: the note's ('blue', 'orange', 'green', 'scenario', 'automation', 'screen', … or 'bulk' for ＋ Events).
// viewFrame: the note's frame is a view's (it holds a green note). ->
//   { kind: 'event' | 'command' | 'readModel' | 'commandOrEvent' | 'eventOrReadModel' | 'field', from, to, query, literals: [text to offer as they are], of: the name whose fields (kind field) } | null
export function contextAt(text, caret, colour, { viewFrame = false } = {}) {
  const upto = String(text ?? '').slice(0, caret), lines = upto.split('\n'), index = lines.length - 1, before = lines[index];
  const out = (kind, skip, extra = {}, split = false) => ({ kind, ...tail(before, skip, split), to: caret, literals: [], ...extra });
  const at = ctx => ctx && { ...ctx, from: ctx.from + upto.length - before.length };

  if (colour === 'bulk') {
    const marker = before.match(MARKER)?.[0].length || 0;
    return openBracket(before) ? null : at(out('event', marker));
  }
  if (['blue', 'orange', 'green'].includes(colour)) {
    return index === 0 && !openBracket(before) ? at(out({ blue: 'command', orange: 'event', green: 'readModel' }[colour], 0)) : null;
  }
  if (index === 0) return null;                                              // the first line of the other notes is a title

  if (colour === 'scenario') {
    const bracket = openBracket(before);
    if (bracket?.open === '(') {                                              // "Product Configured (unitPr…" → the fields of that event
      const name = before.slice(0, bracket.at).replace(LONG_KEY, '').replace(SHORT_KEY, '').split(SEPARATOR).pop().replace(/\s*[×x]\s*\d+\s*$/i, '').trim();
      const inside = before.slice(bracket.at + 1), piece = inside.slice(inside.lastIndexOf(',') + 1);
      if (!name || piece.includes(':') || /^\s*query\b/i.test(before.replace(LONG_KEY, '').replace(SHORT_KEY, ''))) return null;
      const skip = bracket.at + 1 + inside.lastIndexOf(',') + 1;
      return at(out('field', skip, { of: name }));
    }
    if (bracket) return null;
    const word = keywordAt(lines, index);
    if (!word) return null;                                                   // a line that starts no keyword is drawn as typed
    const skip = (before.match(LONG_KEY) || before.match(SHORT_KEY))[0].length, rest = before.slice(skip);
    if (word === 'query' || /^\s*[-•*(]/.test(rest) || /^\s*(rejected|nothing)\s*:/i.test(rest)) return null;
    if (word === 'when') return at(out('command', skip, { literals: viewFrame ? ['query ('] : [] }));
    if (word === 'then') return at(out(viewFrame ? 'readModel' : 'eventOrReadModel', skip, { literals: viewFrame ? [] : ['rejected: ', 'nothing: '] }, true));
    return at(out('event', skip, {}, true));
  }
  if (colour === 'automation') {
    const reads = before.match(READS), arrow = !reads && before.match(ARROW);
    if (reads) return at(out('readModel', reads[0].length));
    if (arrow) return at(out('commandOrEvent', arrow[0].length));
    return null;
  }
  if (colour === 'screen') {
    const bracket = openBracket(before);
    if (!bracket) return null;
    const skip = bracket.at + 1, inside = before.slice(skip);
    if (bracket.open === '{') {                                               // "{ Product List: sku, na…" → the fields of that read model
      const colon = inside.indexOf(':');
      if (colon < 0) return at(out('readModel', skip));
      const list = inside.slice(colon + 1), name = inside.slice(0, colon).trim();
      return name ? at(out('field', skip + colon + 1 + list.lastIndexOf(',') + 1, { of: name, used: list.split(',').slice(0, -1).map(f => f.trim()) })) : null;
    }
    return bracket.open === '(' ? at(out('command', skip)) : null;
  }
  return null;
}

// candidates: [{ name, inFrame }] → the best LIMIT for what was typed: by the words the name has (a part of any word counts), the same frame first.
// A name that is exactly what was typed is not offered again.
export function rank(candidates, query, limit = LIMIT) {
  const typed = String(query).trim().toLowerCase(), want = wordsOf(query);
  return candidates
    .filter(c => c.name.toLowerCase() !== typed)
    .map(c => {
      const have = wordsOf(c.name);
      let score = 0;
      for (const w of want) {
        if (have.some(h => h.startsWith(w))) continue;
        if (have.some(h => h.includes(w))) { score += 1; continue; }
        return null;
      }
      if (typed && c.name.toLowerCase().startsWith(typed)) score -= 2;
      if (c.inFrame) score -= 1.5;
      if (c.kind === 'literal') score += 0.1;                                 // the outcomes after the names
      return { ...c, score };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
    .slice(0, limit);
}
