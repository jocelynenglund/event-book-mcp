// The Pad tools of the MCP server: sketch first. An agent fills the Pad (frames of coloured notes) with the Pad's own commands
// and parsers, the person looks and rearranges, then pad_make_chapter builds the slices (the same Make chapter path as the app).
// The server hands in what it shares (the store, projections, its S-numbers and completeness hint); everything else is imported
// from src/features/pad, so the Pad and these tools can not drift apart.
const src = new URL('../../src/', import.meta.url);
const pad = await import(new URL('features/pad/command.js', src));
const make = await import(new URL('features/pad/makeChapter.command.js', src));
const upd = await import(new URL('features/pad/updateChapter.command.js', src));
const sk = await import(new URL('features/pad/sketch.js', src));
const { padMakeChapter } = await import(new URL('features/pad/padMakeChapter.read.js', src));
const { changedSince } = await import(new URL('features/pad/padMade.rules.js', src));
const { titleCase } = await import(new URL('features/pad/padNote.rules.js', src));
const { newId } = await import(new URL('features/board/command.js', src));

const { originalId } = sk;
const { NOTE_SIZE, SCREEN_WIDTH, NOTE_GAP, GROUP_MARGIN, GROUP_HEAD, ROW_OF, COLOURS, notesInFrame, placesOf } = sk;
const STEP = NOTE_SIZE + NOTE_GAP, COLS = 6;   // a frame's notes sit in a grid of up to COLS a row
const SCENARIO_WIDTH = 164;   // a scenario note is drawn a little narrower than a plain one
const S = { type: 'string' };

// What an agent calls a note, and the colour it is (a colour name works too).
const COLOUR_OF = { command: 'blue', event: 'orange', view: 'green', hotspot: 'red', note: 'white', scenario: 'scenario', screen: 'screen', automation: 'automation' };
const KIND_OF = Object.fromEntries(Object.entries(COLOUR_OF).map(([k, c]) => [c, k]));
const KINDS = Object.keys(COLOUR_OF).join(', ');
// Reading order inside a frame: what the slice is (command, view, screen), then its events, then everything else; scenarios go below
const RANK = { blue: 0, green: 0, automation: 0, orange: 1, screen: 2, red: 2, white: 2 };

const firstLine = text => String(text ?? '').split(/\r?\n/).map(l => l.trim()).find(Boolean) || '';
const lower = s => String(s ?? '').trim().toLowerCase();
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function padTools({ es, pr, state, fsrc, sliceRefs, notLiterature }) {
  const sketch = () => state().pad || { notes: {}, frames: {} };

  // ---------- Finding things ----------
  function findFrame(ref) {
    const { frames } = sketch(), key = lower(ref);
    if (frames[ref]) return frames[ref];
    const named = Object.values(frames).filter(f => lower(f.name) === key);
    if (named.length > 1) throw new Error(`${named.length} frames are called "${ref}": use a frame id (${named.map(f => f.id).join(', ')})`);
    if (!named.length) throw new Error(`No frame "${ref}" on the Pad (pad_outline lists them)`);
    return named[0];
  }
  // A note by id or first line. Linked copies of one note are one match: the original, or the copy inside `frame` when that is one of them
  function findNote(ref, frame) {
    const { notes } = sketch(), key = lower(ref);
    if (notes[ref]) return notes[ref];
    const named = Object.values(notes).filter(n => lower(firstLine(n.text)) === key || lower(titleCase(firstLine(n.text))) === lower(titleCase(ref)));
    const roots = [...new Set(named.map(n => originalId(sketch(), n.id)))];
    if (roots.length > 1) throw new Error(`${roots.length} notes start with "${ref}": use a note id (${roots.join(', ')})`);
    if (!roots.length) throw new Error(`No note "${ref}" on the Pad (pad_outline lists them)`);
    const inside = frame && notesInFrame(sketch(), frame).map(m => m.id);
    return named.find(n => inside?.includes(n.id)) || notes[roots[0]];
  }
  const done = why => { if (why) throw new Error(why); };

  // ---------- Placing ----------
  // A note's real width (a screen is a wider window, a scenario a little narrower); every note is NOTE_SIZE tall
  const widthOf = colour => colour === 'screen' ? SCREEN_WIDTH : colour === 'scenario' ? SCENARIO_WIDTH : NOTE_SIZE;
  // How many grid cells (STEP wide) a note takes in a frame's rows, so a wide note never lies over its neighbour
  const spanOf = colour => Math.ceil((widthOf(colour) + NOTE_GAP) / STEP);
  const FRAME_GAP = 80;   // the space between frames, and what a frame keeps clear when it grows
  // Where a frame's next notes go: items [{ colour }] -> [{ x, y }] in the same order, and the size the frame needs to hold them.
  // Row 0 on: commands / views / screens, then events, then the rest, left to right (COLS a row); scenarios start on the row below.
  function placeIn(frame, items) {
    const taken = new Set(), isScenario = c => c === 'scenario';
    let lastMain = -1;
    for (const n of notesInFrame(sketch(), frame)) {
      const col = Math.round((n.x - frame.x - GROUP_MARGIN) / STEP), row = Math.round((n.y - frame.y - GROUP_MARGIN - GROUP_HEAD) / STEP);
      for (let k = 0; k < spanOf(n.colour); k++) taken.add(`${col + k},${row}`);
      if (!isScenario(n.colour)) lastMain = Math.max(lastMain, row);
    }
    const free = (from, span) => {
      for (let row = from; ; row++) for (let col = 0; col + span <= COLS; col++) {
        if (Array.from({ length: span }, (_, k) => `${col + k},${row}`).every(c => !taken.has(c))) { for (let k = 0; k < span; k++) taken.add(`${col + k},${row}`); return { col, row }; }
      }
    };
    const cells = new Array(items.length);
    const order = items.map((it, i) => ({ it, i })).sort((a, b) => (RANK[a.it.colour] ?? 3) - (RANK[b.it.colour] ?? 3) || a.i - b.i);
    for (const { it, i } of order.filter(o => !isScenario(o.it.colour))) { cells[i] = free(0, spanOf(it.colour)); lastMain = Math.max(lastMain, cells[i].row); }
    for (const { it, i } of order.filter(o => isScenario(o.it.colour))) cells[i] = free(lastMain + 1, spanOf(it.colour));
    const right = Math.max(0, ...cells.map((c, i) => c.col * STEP + widthOf(items[i].colour))), rows = Math.max(0, ...cells.map(c => c.row)) + 1;
    return {
      at: cells.map(c => ({ x: frame.x + GROUP_MARGIN + c.col * STEP, y: frame.y + GROUP_MARGIN + GROUP_HEAD + c.row * STEP })),
      w: right + 2 * GROUP_MARGIN, h: rows * STEP - NOTE_GAP + 2 * GROUP_MARGIN + GROUP_HEAD
    };
  }
  // Everything on the Pad: where it ends (notes by their real width), to put new things beyond it
  function extent() {
    const sk0 = sketch(), all = [...Object.values(sk0.frames).map(f => ({ x: f.x, y: f.y, r: f.x + f.w, b: f.y + f.h })), ...Object.values(sk0.notes).map(n => ({ x: n.x, y: n.y, r: n.x + widthOf(n.colour), b: n.y + NOTE_SIZE }))];
    return all.length ? { x: Math.min(...all.map(a => a.x)), y: Math.min(...all.map(a => a.y)), r: Math.max(...all.map(a => a.r)), b: Math.max(...all.map(a => a.b)), empty: false } : { x: 0, y: 0, r: 0, b: 0, empty: true };
  }
  // A tidy grid under everything else (loose notes), ROW_OF a row
  function looseGrid(count) {
    const e = extent(), y0 = e.empty ? 0 : e.b + 60;
    return Array.from({ length: count }, (_, i) => ({ x: e.x + (i % ROW_OF) * STEP, y: y0 + Math.floor(i / ROW_OF) * STEP }));
  }
  // A frame grows to hold what is put in it. Approach: whatever the grown frame would run into is pushed away, in one drag each:
  // everything right of it (frames with their notes, loose notes beside it) moves right, everything below it (frames, loose
  // notes under it) moves down, by just what is needed to keep a gap. Then the frame itself is resized.
  function growFrame(found, w, h) {
    const nw = Math.max(found.w, w), nh = Math.max(found.h, h);
    if (nw === found.w && nh === found.h) return;
    const oldR = found.x + found.w, oldB = found.y + found.h, newR = found.x + nw, newB = found.y + nh;
    const push = (pick, edge, right) => {
      const sk0 = sketch(), own = new Set(notesInFrame(sk0, found).map(n => n.id));
      const others = Object.values(sk0.frames).filter(f => f.id !== found.id), inOthers = new Set(others.flatMap(f => notesInFrame(sk0, f).map(n => n.id)));
      const frames = others.filter(f => pick(f.x, f.y, f.w, f.h, true)), notes = Object.values(sk0.notes).filter(n => !own.has(n.id) && !inOthers.has(n.id) && pick(n.x, n.y, widthOf(n.colour), NOTE_SIZE, false));
      const near = Math.min(...frames.map(edge), ...notes.map(edge));
      const need = (right ? newR : newB) + FRAME_GAP - near;
      if (Number.isFinite(near) && need > 0) done(pad.dragBy({ frameIds: frames.map(f => f.id), noteIds: notes.map(n => n.id) }, right ? need : 0, right ? 0 : need));
    };
    // right of the old edge: every frame, and the loose notes in the band the frame covers
    if (nw > found.w) push((x, y, w2, h2, isFrame) => x >= oldR - 1 && (isFrame || (y < newB && y + h2 > found.y)), r => r.x, true);
    // below the old bottom edge, under the grown frame
    if (nh > found.h) push((x, y, w2) => y >= oldB - 1 && x < newR && x + w2 > found.x, r => r.y, false);
    done(pad.changeFrame(found.id, { w: nw, h: nh }));
  }
  // The frame called name, made when it is new (right of everything on the Pad: frames and notes), grown when the notes need more room
  function frameFor(name, items) {
    const found = Object.values(sketch().frames).find(f => lower(f.name) === lower(name));
    if (found) {
      const p = placeIn(found, items);
      growFrame(found, p.w, p.h);
      return { frame: found.id, at: p.at, isNew: false };
    }
    const e = extent(), frame = { frameId: newId('pf'), x: e.empty ? 0 : e.r + FRAME_GAP, y: e.empty ? 0 : e.y, w: 0, h: 0, name: String(name).trim() };
    const p = placeIn({ ...frame, id: frame.frameId }, items);
    done(pad.addFrame({ ...frame, w: p.w, h: p.h }));
    return { frame: frame.frameId, at: p.at, isNew: true };
  }

  // ---------- Reading ----------
  const sliceName = id => { const r = sliceRefs(state()).find(x => x.slice.id === id); return r ? `${r.ref} ${pr.sliceTitle(r.slice, state())}` : null; };
  const noteLines = (n, positions, indent) => {
    const places = placesOf(sketch(), n.id).length, [head, ...rest] = String(n.text).split(/\r?\n/).filter(l => l.trim());
    return [`${indent}[${KIND_OF[n.colour] || n.colour}] ${head || '(empty)'} (${n.id})${places > 1 ? ` 🔗 ${places}` : ''}${positions ? ` @${n.x},${n.y}` : ''}`, ...rest.map(l => `${indent}    ${l.trim()}`)];
  };
  const frameLines = (f, positions) => {
    const st = state(), chapter = f.chapterId ? st.chapters[f.chapterId]?.name : null;
    const mark = f.chapterId ? `made into chapter "${chapter ?? f.chapterId}"${f.sliceId && sliceName(f.sliceId) ? ` (${sliceName(f.sliceId)})` : ''}${changedSince(sketch(), f) ? ', changed since (pad_update_chapter)' : ''}` : 'not made';
    return [`▭ ${f.name || '(unnamed)'}${positions ? ` @${f.x},${f.y} ${f.w}×${f.h} (x ${f.x}..${f.x + f.w})` : ''} — ${mark}`, ...notesInFrame(sketch(), f).flatMap(n => noteLines(n, positions, '   '))];
  };

  // What Make chapter would bring for the frames not made yet, without leaving anything behind: the preview's warnings, and the
  // information completeness gaps of the slices it would build (made on the book, then taken back)
  function wouldBring(frames) {
    const todo = frames.filter(f => !f.chapterId);
    if (!todo.length) return [];
    const st = state(), pv = padMakeChapter(st, { frameIds: todo.map(f => f.id), chapterName: 'preview' }), out = [];
    pv.slices.forEach(s => {
      if (!s.kind) out.push(`⚠ ${s.name || 'a frame'}: ${s.why}`);
      s.lines.filter(l => ['scenario', 'screen', 'automation'].includes(l.role)).forEach(l => (l.warnings || []).forEach(w => out.push(`⚠ ${s.name}: ${l.role} "${l.name}": ${w}`)));
    });
    pv.leftOut.forEach(l => out.push(`⚠ ${l.slice}: left out (a slice has one command or view): ${l.names.join(', ')}`));
    if (pv.slices.some(s => s.kind) && es.canEditCurrent()) {
      const id = es.getCurrentModelId(), before = es.getEventStream().slice();
      try {
        const r = make.makeChapter({ frameIds: todo.map(f => f.id), chapterName: 'preview' });
        if (!r.refused) {
          const after = state(), ids = todo.map(f => after.pad.frames[f.id]?.sliceId).filter(Boolean);
          const text = fsrc.completenessText(fsrc.gapCount(after, ids), fsrc.tidyCount(after, ids));
          if (text) out.push(`⚠ Information completeness (Make chapter would bring): ${text}`);
        }
      } finally { es.replaceModelEvents(id, before); }
    }
    return out;
  }

  // Frames that lie over each other: one warning line
  function overlaps(frames) {
    const pairs = [];
    frames.forEach((a, i) => frames.slice(i + 1).forEach(b => { if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) pairs.push(`${a.name || a.id} and ${b.name || b.id}`); }));
    return pairs.length ? [`⚠ frames overlap: ${pairs.join('; ')}`] : [];
  }

  function outlineText({ positions = false } = {}) {
    const sk0 = sketch(), frames = Object.values(sk0.frames), inFrames = new Set(frames.flatMap(f => notesInFrame(sk0, f).map(n => n.id)));
    const loose = Object.values(sk0.notes).filter(n => !inFrames.has(n.id));
    if (!frames.length && !loose.length) return 'The Pad is empty. Sketch first: pad_add_notes {frame: "Place order", notes: [{kind: "command", text: "place order\\n- orderId"}, {kind: "event", text: "order placed\\n- orderId"}]}.';
    return [
      `Pad of "${state().modelName}": ${plural(frames.length, 'frame', 'frames')}, ${plural(Object.keys(sk0.notes).length, 'note', 'notes')}${loose.length ? ` (${loose.length} loose)` : ''}`,
      ...frames.flatMap(f => frameLines(f, positions)),
      ...(loose.length ? ['Loose notes', ...loose.flatMap(n => noteLines(n, positions, '   '))] : []),
      ...wouldBring(frames),
      ...overlaps(frames)
    ].join('\n');
  }
  const framesOutline = (ids, positions) => ids.map(id => sketch().frames[id]).filter(Boolean).flatMap(f => frameLines(f, positions)).join('\n');

  // ---------- Tools ----------
  const sketchFirst = 'Sketch first: for a new feature, fill the Pad with notes and frames, let the person look and rearrange, then pad_make_chapter.';
  const formats = ' Formats: command/view/event notes: first line the name, then "- field" lines. scenario: "★ name" (★ or * = must have), then Given … / When … / Then … (short forms G: W: T: Q: A:; "Then rejected: reason"). screen (white window): first line its name, then "{ Read model }" or "{ Read model: field, field }" (a read model it shows), "[ Input ]" (a field of the command), "( Button )" (sends a command, matched by name). automation (lilac): first line its name, "reads <view>", "→ <command or event>"; a frame with an automation and no command or view makes an automation slice.';
  const noteSchema = { type: 'object', properties: { kind: { type: 'string', enum: Object.keys(COLOUR_OF) }, colour: { type: 'string', enum: COLOURS }, text: S, frame: S }, required: ['text'] };

  return [
    { name: 'pad_outline',
      description: `The open book's Pad as text: frames (made into a chapter? changed since?) with their notes by kind (${KINDS}: first line, then its lines), loose notes, linked copies (🔗 n), and what Make chapter would bring (warnings, information completeness gaps). positions:true adds x,y. ${sketchFirst}`,
      inputSchema: { type: 'object', properties: { positions: { type: 'boolean' } } },
      run: ({ positions }) => { notLiterature('a Pad'); return outlineText({ positions }); } },
    { name: 'pad_add_notes', edits: true,
      description: `Add notes to the Pad in one batch. Each: kind (${KINDS}; or colour blue|orange|green|red|white|scenario), text (first line the name; "- field" lines; scenario notes: ★ name, Given … / When … / Then …), frame (name; made if new, to the right of the others; notes sit left to right in it, commands and views first, events after, scenarios below). frame at the top is the default for every note; no frame = loose notes in a grid below. Returns ids and the frames as they are now. ${sketchFirst}${formats}`,
      inputSchema: { type: 'object', properties: { notes: { type: 'array', items: noteSchema }, frame: S }, required: ['notes'] },
      run: ({ notes, frame }) => {
        notLiterature('a Pad');
        if (!notes.length) throw new Error('Give some notes');
        const items = notes.map((n, i) => {
          const colour = n.colour || COLOUR_OF[n.kind];
          if (!colour || !COLOURS.includes(colour)) throw new Error(`Note ${i + 1}: kind is ${KINDS}${n.kind ? ` (not "${n.kind}")` : ''}`);
          if (!String(n.text ?? '').trim()) throw new Error(`Note ${i + 1} has no text`);
          return { colour, text: String(n.text), noteId: newId('pn'), frame: n.frame ?? frame ?? null };
        });
        const names = [...new Set(items.filter(n => n.frame).map(n => n.frame))], touched = [];
        for (const name of names) {
          const mine = items.filter(n => n.frame === name), placed = frameFor(name, mine);
          mine.forEach((n, i) => Object.assign(n, placed.at[i]));
          // added at once: a later frame growing may push this one, and its notes must move with it
          done(pad.addNotes(mine.map(({ noteId, x, y, colour, text }) => ({ noteId, x, y, colour, text }))));
          touched.push(placed.frame);
        }
        const loose = items.filter(n => !n.frame), grid = looseGrid(loose.length);
        loose.forEach((n, i) => Object.assign(n, grid[i]));
        if (loose.length) done(pad.addNotes(loose.map(({ noteId, x, y, colour, text }) => ({ noteId, x, y, colour, text }))));
        return [`Added ${plural(items.length, 'note', 'notes')}${touched.length ? ` to ${touched.map(id => `"${sketch().frames[id].name}"`).join(', ')}` : ' (loose)'}: ${items.map(n => `${firstLine(n.text)} (${n.noteId})`).join('; ')}`, framesOutline(touched)].filter(Boolean).join('\n');
      } },
    { name: 'pad_frame', edits: true,
      description: 'Put a frame (named) round notes already on the Pad (ids or first lines). The notes stay where they are.',
      inputSchema: { type: 'object', properties: { name: S, notes: { type: 'array', items: S } }, required: ['name', 'notes'] },
      run: ({ name, notes }) => {
        notLiterature('a Pad');
        if (!String(name).trim()) throw new Error('Name the frame');
        if (Object.values(sketch().frames).some(f => lower(f.name) === lower(name))) throw new Error(`A frame "${name}" exists: pad_move puts notes in it`);
        const ids = notes.map(r => findNote(r).id), frameId = newId('pf');
        done(pad.groupNotes(ids, { frameId, name: String(name).trim() }));
        return framesOutline([frameId]);
      } },
    { name: 'pad_link_copy', edits: true,
      description: 'A linked copy of a note (🔗: one text, shown in two places; editing either changes both), in a frame (named; made if new) or loose below the rest. note: id or first line.',
      inputSchema: { type: 'object', properties: { note: S, frame: S }, required: ['note'] },
      run: ({ note, frame }) => {
        notLiterature('a Pad');
        const n = findNote(note), noteId = newId('pn');
        const at = frame ? frameFor(frame, [{ colour: n.colour }]).at[0] : looseGrid(1)[0];
        done(pad.linkNotes([{ noteId, linkOf: n.id, x: at.x, y: at.y }]));
        return `Linked copy of "${firstLine(n.text)}" (${noteId})${frame ? ` in "${frame}"` : ''}: ${plural(placesOf(sketch(), n.id).length, 'place', 'places')}.`;
      } },
    { name: 'pad_move', edits: true,
      description: 'Move a note (id or first line) into a frame (to: {frame}; it takes the next free place there) or to a spot (to: {x, y}); or move a frame (to: {x, y}) with the notes inside it.',
      inputSchema: { type: 'object', properties: { note: S, frame: S, to: { type: 'object', properties: { frame: S, x: { type: 'number' }, y: { type: 'number' } } } }, required: ['to'] },
      run: ({ note, frame, to }) => {
        notLiterature('a Pad');
        const spot = 'x' in to && 'y' in to;
        if (!note === !frame) throw new Error('Say which: note or frame');
        if (frame) {
          if (!spot) throw new Error('A frame moves to {x, y}');
          const f = findFrame(frame);
          done(pad.dragBy({ frameIds: [f.id] }, Math.round(to.x - f.x), Math.round(to.y - f.y)));
          return `Moved "${f.name}" to ${Math.round(to.x)},${Math.round(to.y)} with its notes.`;
        }
        const target = to.frame && Object.values(sketch().frames).find(f => lower(f.name) === lower(to.frame));
        const n = findNote(note, target);
        if (spot) done(pad.moveNotes([{ noteId: n.id, x: to.x, y: to.y }]));
        else if (to.frame) { const at = frameFor(to.frame, [{ colour: n.colour }]).at[0]; done(pad.moveNotes([{ noteId: n.id, x: at.x, y: at.y }])); }
        else throw new Error('to is {frame} or {x, y}');
        return `Moved "${firstLine(n.text)}"${spot ? ` to ${Math.round(to.x)},${Math.round(to.y)}` : ` into "${to.frame}"`}.`;
      } },
    { name: 'pad_remove', edits: true,
      description: 'Take notes (ids or first lines) and/or frames (names or ids) off the Pad. A frame goes without its notes; a chapter already made stays on the board.',
      inputSchema: { type: 'object', properties: { notes: { type: 'array', items: S }, frames: { type: 'array', items: S } } },
      run: ({ notes = [], frames = [] }) => {
        notLiterature('a Pad');
        if (!notes.length && !frames.length) throw new Error('Give notes or frames to remove');
        const noteIds = notes.map(r => findNote(r).id), frameIds = frames.map(r => findFrame(r).id);
        done(pad.removeNotes(noteIds)); done(pad.removeFrames(frameIds));
        return `Removed ${plural(noteIds.length, 'note', 'notes')} and ${plural(frameIds.length, 'frame', 'frames')}.`;
      } },
    { name: 'pad_rename_frame', edits: true,
      description: 'Rename a frame (name or id).',
      inputSchema: { type: 'object', properties: { frame: S, name: S }, required: ['frame', 'name'] },
      run: ({ frame, name }) => { notLiterature('a Pad'); const f = findFrame(frame); done(pad.changeFrame(f.id, { name })); return `Renamed "${f.name}" to "${String(name).trim()}".`; } },
    { name: 'pad_make_chapter', edits: true,
      description: 'Make chapter from frames (names or ids), the Pad\'s own path: one slice per frame (blue command or green view, its orange events, fields from the lines, hotspots as comments, white notes as description, scenario notes as scenarios) in a chapter (made if new). Previews first and reports its warnings. A frame already made is refused (pad_update_chapter carries changes over). include: which of "hotspots", "notes", "scenarios" go in (default all). The notes stay as the sketch.',
      inputSchema: { type: 'object', properties: { frames: { type: 'array', items: S }, chapter: S, include: { type: 'array', items: { type: 'string', enum: ['hotspots', 'notes', 'scenarios'] } } }, required: ['frames', 'chapter'] },
      run: ({ frames, chapter, include }) => {
        notLiterature('a Pad');
        if (!frames.length) throw new Error('Give the frames to make');
        const fs = frames.map(findFrame), made = fs.filter(f => f.chapterId);
        if (made.length) throw new Error(`Already made: ${made.map(f => `"${f.name}" (chapter "${state().chapters[f.chapterId]?.name ?? f.chapterId}")`).join(', ')}. pad_update_chapter {frame} carries later changes over; nothing was made`);
        const ids = fs.map(f => f.id), st = state(), all = padMakeChapter(st, { frameIds: ids, chapterName: chapter });
        const role = { hotspots: 'hotspot', notes: 'note', scenarios: 'scenario' }, keep = new Set((include || Object.keys(role)).map(k => role[k]));
        const off = all.slices.flatMap(s => s.lines.filter(l => ['hotspot', 'note', 'scenario'].includes(l.role) && !keep.has(l.role)).map(l => l.key));
        const pv = padMakeChapter(st, { frameIds: ids, chapterName: chapter, off });
        const r = make.makeChapter({ frameIds: ids, chapterName: chapter, off });
        if (r.refused) throw new Error(r.refused);
        const after = state(), sliceIds = ids.map(id => after.pad.frames[id]?.sliceId).filter(Boolean);
        const warn = [];
        pv.slices.forEach(s => {
          if (!s.kind) warn.push(`⚠ "${s.name || 'a frame'}" made no slice: ${s.why}`);
          s.lines.filter(l => ['scenario', 'screen', 'automation'].includes(l.role) && l.included).forEach(l => (l.warnings || []).forEach(w => warn.push(`⚠ ${s.name}: ${l.role} "${l.name}": ${w}`)));
        });
        pv.leftOut.forEach(l => warn.push(`⚠ ${l.slice}: left out (a slice has one command or view): ${l.names.join(', ')}`));
        const text = fsrc.completenessText(fsrc.gapCount(after, sliceIds), fsrc.tidyCount(after, sliceIds));
        return [`Made chapter "${chapter}"${pv.existing ? ' (it existed: the slices were added to it)' : ''}: ${pv.summary}. ${sliceIds.map(sliceName).filter(Boolean).join(', ')}`, ...warn,
          ...(text ? [`⚠ Information completeness: ${text} (the outline lists them, fix_gaps offers the fixes: a hint, not a block)`] : [])].join('\n');
      } },
    { name: 'pad_update_chapter', edits: true,
      description: 'Carry what changed in a made frame\'s sketch over to its slice (renamed notes, new events, fields, comments, scenarios; nothing is ever removed from the board). frame: name or id.',
      inputSchema: { type: 'object', properties: { frame: S }, required: ['frame'] },
      run: ({ frame }) => {
        notLiterature('a Pad');
        const f = findFrame(frame), r = upd.updateChapter({ frameId: f.id });
        if (r.refused) throw new Error(r.refused);
        return r.changes ? `Updated "${f.name}": ${plural(r.changes, 'change', 'changes')} carried over to ${sliceName(f.sliceId) || 'its slice'}.` : `"${f.name}" had nothing new to carry over.`;
      } }
  ];
}
