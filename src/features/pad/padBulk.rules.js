// ===========================================
// PAD - What a pasted list says (SV: Pad Bulk Lines)
// ＋ Events takes one note per line, for brainstorming. A line is the note's text as typed, less a leading list marker ("- ", "* ",
// "• ", "1. ", "1) ", "[ ] ", "- [x] "); blank lines are ignored. `Name(field, field)` is a note that draws as a typed one does,
// the name as its title and a "- field" line each below it (a field is kept as typed: "total:number" stays). A line with no
// name before its "(", or with no closing ")", is just the line. Nothing here refuses.
// ===========================================

const MARKER = /^\s*(?:(?:[-*•]|\d+[.)]|\[[ xX]?\])\s+)+/;
const CALL = /^([^(]*?)\s*\((.*)\)$/;

// "pnr, total:number, lines[]{sku, qty}" → ["pnr", "total:number", "lines[]{sku, qty}"]: a comma inside [], {} or () is part of the field
function fieldsOf(list) {
  const out = [];
  let depth = 0, current = '';
  for (const ch of list) {
    if ('[{('.includes(ch)) depth++;
    else if (']})'.includes(ch)) depth = Math.max(0, depth - 1);
    if (ch === ',' && !depth) { out.push(current); current = ''; } else current += ch;
  }
  return [...out, current].map(f => f.trim()).filter(Boolean);
}

function noteText(line) {
  const call = line.match(CALL), name = call?.[1].trim();
  if (/^external$/i.test(call?.[2].trim() ?? '')) return line;   // "Payment Received (external)" marks the event external, it has no field
  return name ? [name, ...fieldsOf(call[2]).map(f => `- ${f}`)].join('\n') : line;
}

// The text of each note a pasted list makes, in order
export const bulkLines = text => String(text ?? '').split(/\r?\n/).map(l => l.replace(MARKER, '').trim()).filter(Boolean).map(noteText);
