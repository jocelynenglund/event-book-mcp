#!/usr/bin/env node
// eventPAD as a local MCP server: an agent models in eventPAD with eventPAD's own commands
// (the same modules the app and its Given / When / Then tests run), and hands the model
// over as a share link (open it on the phone → Add to my library) or an import file.
//
//   claude mcp add eventpad -- node /path/to/eventpad/tools/eventpad-mcp/server.mjs
//
// Models live in one file on this machine (EVENTPAD_MCP_HOME, default ~/.eventpad-mcp).
// Few, chunky tools and short text replies, to keep the agent's tokens down.
// stdio JSON-RPC: one message per line. stdout is the protocol, so all logging goes to stderr.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import readline from 'node:readline';
import http from 'node:http';
import { spawn } from 'node:child_process';

console.log = console.error; // the event store logs every event

// The event store keeps models in browser storage: here, a map saved to a file
const home = process.env.EVENTPAD_MCP_HOME || path.join(os.homedir(), '.eventpad-mcp');
const storeFile = path.join(home, 'store.json');
// Every agent session runs its own copy of this server on the one store file. Each used to read it once and write
// its whole memory back, so a session's save dropped what other sessions had made since it started (Santa's plan,
// 2026-11-07). Now: what another session saved is picked up before reading, and a save writes only the keys this
// session changed, merged into the file as it is (written whole and renamed, so nobody reads half a file).
const readDisk = () => { try { return JSON.parse(fs.readFileSync(storeFile, 'utf8')); } catch (e) { return {}; } };
const mtime = () => { try { return fs.statSync(storeFile).mtimeMs; } catch (e) { return 0; } };
let mem = new Map(Object.entries(readDisk()));
let seen = mtime();
const dirty = new Map();   // key → its new value, or undefined when removed; not saved yet
function refresh() {
  const now = mtime();
  if (now === seen) return;
  const disk = readDisk();
  for (const k of [...mem.keys()]) if (!(k in disk) && !dirty.has(k)) mem.delete(k);
  for (const [k, v] of Object.entries(disk)) if (!dirty.has(k)) mem.set(k, v);
  seen = now;
}
globalThis.localStorage = {
  getItem: k => { refresh(); return mem.has(k) ? mem.get(k) : null; },
  setItem: (k, v) => { refresh(); mem.set(k, String(v)); dirty.set(k, String(v)); },
  removeItem: k => { mem.delete(k); dirty.set(k, undefined); },
  clear: () => { for (const k of mem.keys()) dirty.set(k, undefined); mem.clear(); },
  key: i => { refresh(); return [...mem.keys()][i]; },
  get length() { refresh(); return mem.size; }
};
const persist = () => {
  fs.mkdirSync(home, { recursive: true });
  const disk = readDisk();
  for (const [k, v] of dirty) { if (v === undefined) delete disk[k]; else disk[k] = v; }
  const tmp = `${storeFile}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(disk));
  fs.renameSync(tmp, storeFile);
  dirty.clear();
  mem = new Map(Object.entries(disk));
  seen = mtime();
  pushLive();
};

const src = new URL('../../src/', import.meta.url);
const es = await import(new URL('core/eventStore.js', src));
const pr = await import(new URL('core/projections.js', src));
const c = await import(new URL('features/board/command.js', src));
const sc = await import(new URL('features/scenarios/command.js', src));
const ol = await import(new URL('features/outline/command.js', src));
const cm = await import(new URL('features/comments/command.js', src));
const cmRead = await import(new URL('features/comments/read.js', src));
const { kindOf } = await import(new URL('features/testImport/spec.js', src));
const fromExport = await import(new URL('features/testImport/fromExport.js', src));
const { commentEventTypes } = await import(new URL('core/constants.js', src));
const { snapshotEvents } = await import(new URL('features/snapshot/command.js', src));
const gen = await import(new URL('features/specs/generate.js', src));
const ps = await import(new URL('features/press/command.js', src));
const bp = await import(new URL('features/buildProgress/command.js', src));
const { sliceProgress } = await import(new URL('features/buildProgress/sliceProgress.read.js', src));
const ar = await import(new URL('features/article/command.js', src));
const lit = await import(new URL('features/literature/command.js', src));
const litr = await import(new URL('features/literature/rules.js', src));
const sug = await import(new URL('features/literature/suggestions.js', src));
const auto = await import(new URL('features/automate/command.js', src));
// Steps and scenarios are built by the same code ☰ → Import uses for an Event Book plan file
const { addStep, addScenario, checkScenario, chapterId: chapterIdIn, checkPlan, buildPlan } = await import(new URL('features/planFile/build.js', src));
es.loadEventStream();

const lib = await import('./library.mjs');
const codec = await import('../snapshotCodec.mjs');

const PROD_API = 'https://labsapi-hmeva5cfhdfkejhz.westeurope-01.azurewebsites.net/api/eventpad';
const SHARE_API = process.env.EVENTPAD_SHARE_API || process.env.EVENTPAD_API || PROD_API;
const API = (process.env.EVENTPAD_API || PROD_API).replace(/\/$/, '');
const APP = process.env.EVENTPAD_APP || 'https://eventbook.itsybit.se/';

// ---------- Reading the model ----------

const state = () => pr.projectState();
const kindLabel = { SC: 'Do', SV: 'See', AU: 'Auto' };
const sliceRefs = st => pr.getOrderedSlices(st).map((s, i) => ({ ref: `S${i + 1}`, slice: s }));

// A slice by its S-number (from the outline), its id or its title
function findSlice(ref, st = state()) {
  const all = sliceRefs(st);
  const key = String(ref).trim().toLowerCase();
  const hit = all.find(x => x.ref.toLowerCase() === key || x.slice.id === ref)
    || all.find(x => pr.sliceTitle(x.slice, st).toLowerCase() === key);
  if (!hit) throw new Error(`No slice "${ref}" (use an S-number from the outline, or its title)`);
  return hit.slice;
}

const chapterId = name => chapterIdIn(name);
// What an event is beyond a plain event: an old table read as events, another system's, or one of ours published to other systems
const eventMark = el => (el.table ? ` (legacy table${typeof el.table === 'string' ? ': ' + el.table : ''})` : '') + (el.external ? ' (external)' : '')
  + (el.published && !el.external ? ` (integration${el.to?.length ? ' → ' + el.to.join(', ') : ''})` : '');
const props = el => (el.properties?.length ? ` (${el.properties.map(p => p.name + (p.type && p.type !== 'string' ? ':' + p.type : '')).join(', ')})` : '');

// A literature book's outline: paragraphs in order, each with its sentences numbered (where scenarios would be)
function literatureOutline(st, { chapter } = {}) {
  const tags = st.tags?.length ? ` [${st.tags.join(', ')}]` : '';
  const lines = [`${st.modelName || 'Untitled draft'}${st.modelDescription ? ': ' + st.modelDescription : ''}${tags} (literature)`];
  if (ar.inRounds(st)) lines.push(ar.reviewRounds(st).text);
  const open = litr.openSuggestions(st);
  if (open.length) lines.push(`${open.length} suggestion${open.length === 1 ? '' : 's'} open: only the author accepts them`);
  const refs = new Map(sliceRefs(st).map(x => [x.slice.id, x.ref]));
  pr.getBoardGroups(st).forEach(g => {
    if (chapter && g.chapter?.name.toLowerCase() !== chapter.toLowerCase()) return;
    if (!g.slices.length && !g.chapter) return;
    const refined = g.slices.filter(s => s.refined).length;
    lines.push('', `## ${g.chapter ? g.chapter.name : 'Not in a chapter'}${g.chapter?.parked ? ' (parked: not in the story or the post)' : ''}${g.slices.length && !g.chapter?.parked ? ` · ${pr.refinedLabel(refined, g.slices.length)}` : ''}`);
    g.slices.forEach(s => {
      const sentences = litr.sentencesOf(st, s.id);
      lines.push(`${refs.get(s.id)} [¶] ${pr.sliceTitle(s, st)}${!s.refined ? '' : ' · ☐ refined'}${litr.isOpenGap(st, s) ? ' · (a gap: only the author fills it)' : !sentences.length && !litr.pointText(st, s.id) ? ' · (empty)' : ''}`);
      if (s.description) lines.push(`   ${s.description}`);
      ar.paragraphsOf(st, s.id).forEach(p => lines.push(`   ¶ ${p.text}`));
      const said = threadsToRead(st, s.id);
      const talk = (id, indent) => said.filter(c => (c.scenarioId || null) === id).forEach(c => lines.push(...threadLines(c, indent, `${c.nickname}: ${c.text}`)));
      talk(null, '     ');
      sentences.forEach((x, i) => {
        lines.push(`   ${i + 1}. ${x.text}`);
        open.filter(o => o.sentenceId === x.id).forEach(o => lines.push(`       ✎ ${o.n}: "${o.find}" → ${o.replace ? `"${o.replace}"` : 'cut'} (${o.why})`));
        talk(x.id, '       ');
      });
    });
  });
  return lines.join('\n');
}

function outline({ chapter, scenarios = false } = {}) {
  const st = state();
  if (litr.isLiterature(st) && Object.keys(st.slices).length) return literatureOutline(st, { chapter });
  if (!Object.keys(st.slices).length) return `${st.modelName || 'Untitled model'}${st.tags?.length ? ` [${st.tags.join(', ')}]` : ''}: no slices yet.`;
  const refs = new Map(sliceRefs(st).map(x => [x.slice.id, x.ref]));
  const lines = [`${st.modelName || 'Untitled model'}${st.modelDescription ? ': ' + st.modelDescription : ''}${st.tags?.length ? ` [${st.tags.join(', ')}]` : ''}`];
  if (ar.inRounds(st)) lines.push(ar.reviewRounds(st).text);
  pr.getBoardGroups(st).forEach(g => {
    if (chapter && g.chapter?.name.toLowerCase() !== chapter.toLowerCase()) return;
    if (!g.slices.length && !g.chapter) return;
    const refined = g.slices.filter(s => s.refined).length;
    lines.push('', `## ${g.chapter ? g.chapter.name : 'Not in a chapter'}${g.slices.length ? ` · ${pr.refinedLabel(refined, g.slices.length)}` : ''}`);
    g.slices.forEach(s => {
      const els = s.elements.map(id => st.elements[id]).filter(Boolean);
      const of = t => els.filter(e => e.type === t);
      const kind = c.sliceActor(s, st) === 'processor' ? 'Auto' : kindLabel[s.type] || s.type;
      const parts = [
        ...of('screen').map(e => `screen ${e.name}`), ...of('processor').map(e => `⚙ ${e.name}`),
        ...of('command').map(e => `cmd ${e.name}${props(e)}`),
        ...(s.type === 'SV' ? of('event').map(e => `evt ${e.name}${eventMark(e)}`) : []),
        ...of('readModel').map(e => `rm ${e.name}${e.list ? ' (list)' : ''}${props(e)}`),
        ...(s.type !== 'SV' ? of('event').map(e => `evt ${e.name}${eventMark(e)}${props(e)}`) : [])
      ];
      const scns = [...pr.getScenariosForSlice(s.id, st)].sort((a, b) => !!b.mustHave - !!a.mustHave);
      const must = scns.filter(x => x.mustHave).length;
      lines.push(`${refs.get(s.id)} [${kind}] ${pr.sliceTitle(s, st)}: ${parts.join(' → ') || '(empty)'}${scns.length ? ` · ${scns.length} scenario${scns.length > 1 ? 's' : ''}${must ? ` (${must} must)` : ''}` : ''}${!s.refined ? '' : s.built ? ' · ☑ done' : ` · ☐ ready${st.specs?.[s.id] ? ' · 🧪 specs written' : ''}`}${progressText(st, s.id)}`);
      if (s.description) lines.push(`   ${s.description}`);
      if (s.waived) lines.push(`   no scenario (waived)${s.waived.reason ? `: ${s.waived.reason}` : ''}`);
      ar.paragraphsOf(st, s.id).forEach(p => lines.push(`   ¶ ${p.text}`));
      const said = threadsToRead(st, s.id);
      const talk = scnId => said.filter(c => (c.scenarioId || null) === scnId).forEach(c => lines.push(...threadLines(c, '     ', `${c.nickname}${c.part ? ` on the ${c.part}` : ''}: ${c.text}`)));
      talk(null);
      if (scenarios) scns.forEach(x => { lines.push(`   ${x.mustHave ? '★' : '✓'} ${x.name}: ${gwtText(x, st)}`); talk(x.id); });
      else if (said.some(c => c.scenarioId)) lines.push(`     💬 ${said.filter(c => c.scenarioId).length} open on its scenarios (outline {scenarios:true} shows them)`);
    });
  });
  return lines.join('\n');
}

// Where a builder says the slice has got to (nothing once it is Done)
const progressText = (st, sliceId) => { const v = sliceProgress(st, sliceId); return v ? ` · ${v.icon} ${v.label}${v.ago ? ` (${v.ago})` : ''}` : ''; };

const vals = v => (v && Object.keys(v).length ? ' ' + JSON.stringify(v) : '');
// The threads an agent should read: the open ones, and resolved ones a person answered (she often
// replies and resolves in one go, and their answer is the point); each with its replies under it
const byPerson = r => !/^ItsyBOT/.test(r.nickname || '');
const threadsToRead = (st, sliceId) => cmRead.sliceComments(st, sliceId).threads.filter(c => !c.resolved || c.replies.some(byPerson));
const threadLines = (c, indent, head) => [`${indent}💬 ${c.commentId} ${head}${c.resolved ? ' (resolved)' : ''}`,
  ...c.replies.map(r => `${indent}   ↳ ${r.nickname}: ${r.text}`)];

function gwtText(x, st) {
  const name = id => st.elements[id]?.name || '(removed)';
  const given = (x.given || []).map(g => name(g.elementId) + vals(g.values)).join(', ') || 'nothing';
  const when = x.when?.commandId ? ` | When ${name(x.when.commandId)}${vals(x.when.values)}` : '';
  const t = x.then;
  const then = t?.type === 'event' ? name(t.eventId) + vals(t.values) : t?.type === 'rejection' ? `rejected: ${t.reason}`
    : t?.type === 'readModel' ? name(t.readModelId) + (t.rows?.length ? ' ' + JSON.stringify(t.rows) : vals(t.values)) : 'not set';
  return `Given ${given}${when} | Then ${then}`;
}

// ---------- Building ----------

// A literature book is paragraphs and sentences: no stickies, steps, scenarios or specs
const notLiterature = what => { if (litr.isLiterature(state())) throw new Error(`A literature book has paragraphs and their sentences, not ${what}: use import_draft, outline, add_comment`); };

// A slice's place in the order: right after another one
function placeAfter(id, afterId) {
  const order = state().sliceOrder, from = order.indexOf(id), at = order.indexOf(afterId);
  if (from < 0 || at < 0 || from === at + 1) return;
  es.appendEvent(es.EventTypes.SliceMoved, { sliceId: id, toIndex: from < at ? at : at + 1 });
}

// ---------- Handing it over ----------

const short = t => (t && t.length > 500 ? t.slice(0, 499).trimEnd() + '…' : t);
// A book in the library opens as itself from this link (to read or check out): what she does
// in it (Refined, comments) reaches the library. A share link is a copy that stays on their device.
const bookLink = serverId => `${APP}?book=${encodeURIComponent(serverId)}`;
async function shareLink() {
  const kept = links()[es.getCurrentModelId()];
  if (kept) return `${bookLink(kept.serverId)}\nIt's in the library: this link opens the book itself, so Refined ticks and comments reach the library.`;
  const events = es.getEventStream();
  const st = pr.projectState(events);
  if (!Object.keys(st.slices).length) throw new Error('Nothing to share yet');
  let packed = snapshotEvents(events);
  const json = JSON.stringify(packed);
  if (json.length > 900_000) packed = ['gz:' + zlib.gzipSync(json).toString('base64')];
  const res = await fetch(`${SHARE_API}/shares`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    // The share service keeps up to 500 characters of each: a longer one goes up shortened
    body: JSON.stringify({ name: short(st.modelName), description: short(st.modelDescription), events: packed })
  });
  if (res.status === 413) throw new Error('Too big for a share link: use export_file');
  if (!res.ok) throw new Error(`Share failed (${res.status})${res.status === 400 ? `: ${(await res.json().catch(() => null))?.error || ''}` : ''}`);
  const { id } = await res.json();
  return `${APP}?m=${encodeURIComponent(id)}\nA copy: what the person does in it (Refined, comments) stays on their device. To hand over a plan, keep_model and send its book link instead.`;
}

function exportFile(file, history = false) {
  const events = es.getEventStream();
  const st = pr.projectState(events);
  const name = (st.modelName || 'event-model').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'event-model';
  const out = path.resolve(file || path.join(home, 'exports', `${name}.json`));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(history ? events : snapshotEvents(events)));
  return out;
}

// ---------- Her library on the server ----------
// connect_library signs this machine in as one of the devices on the account, as an agent (email code, like
// the app). The device token lives in ~/.secrets/eventpad.env (0600) and is never printed. A
// shelf pulled with open_model is linked to the server (its id there, the position pulled, the
// actions undone so far, and whether the agent holds it). Agent on loan: open_model
// {edit:true} checks it out to the agent, which holds it while it works; every edit goes up
// as it's made. close_model, 15 idle minutes or this server stopping check it in. Her phone
// can take it back: the next edit is refused (docs/server-sync-plan.md, "Check out / check in").
// Plain open_model only reads.

const secretsDir = () => path.join(os.homedir(), '.secrets');
const secretsFile = () => path.join(secretsDir(), 'eventpad.env');
const tokensSeen = new Set();   // only to blank them out of replies
let pendingEmail = null;

function token() {
  let t = null;
  try { t = lib.readToken(fs.readFileSync(secretsFile(), 'utf8')); } catch (e) { /* not connected */ }
  if (t) tokensSeen.add(t);
  return t;
}
function saveToken(t) {
  tokensSeen.add(t);
  if (!fs.existsSync(secretsDir())) fs.mkdirSync(secretsDir(), { recursive: true, mode: 0o700 });
  const f = secretsFile();
  const text = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  fs.writeFileSync(f, lib.withToken(text, t), { mode: 0o600 });
  fs.chmodSync(f, 0o600);
}
function forgetToken() {
  const f = secretsFile();
  if (!fs.existsSync(f)) return;
  fs.writeFileSync(f, lib.withoutToken(fs.readFileSync(f, 'utf8')), { mode: 0o600 });
  fs.chmodSync(f, 0o600);
}

class ApiError extends Error {
  constructor(status, body) { super(lib.serverError(status, body)); this.status = status; this.body = body; }
}
const NOT_CONNECTED = 'Not connected to the library: connect_library {email} first';

// Every call to the server comes through here, so a big ModelSnapshot is gzipped on the way up and
// unpacked on the way down: the local store and everything that projects it keep the plain form
// (src/core/packedSnapshot.js)
async function api(method, p, body, { auth = true } = {}) {
  const t = auth ? token() : null;
  if (auth && !t) throw new Error(NOT_CONNECTED);
  body = await codec.packBody(body);
  let res;
  try {
    res = await fetch(API + p, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (e) { throw new Error(`Can't reach the Event Book server (${e.cause?.code || e.message})`); }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  // Revoked (from the phone's device list) or signed out: forget the stale token
  if (res.status === 401 && t) { forgetToken(); throw new Error(lib.DISCONNECTED); }
  if (!res.ok) throw new ApiError(res.status, data);
  return codec.unpackData(data);
}

// Local model id → { serverId, position, undone, holding, local } for shelves pulled from her
// library. holding: checked out to this agent (opened for editing). local: how many of the
// local model's events the server has (the rest are pending).
const LINKS_KEY = 'eventpad_mcp_cloud';
const links = () => { try { return JSON.parse(localStorage.getItem(LINKS_KEY) || '{}'); } catch (e) { return {}; } };
function setLink(id, link) { const all = links(); all[id] = link; localStorage.setItem(LINKS_KEY, JSON.stringify(all)); }
const modelPath = sid => `/models/${encodeURIComponent(sid)}`;

async function connectLibrary({ email, code, invite, as }) {
  if (code) {
    const who = (email || pendingEmail || '').trim();
    if (!who) throw new Error('Which email? Call connect_library with {email, code}');
    const body = lib.verifyBody(who, code, as);
    const name = body.deviceName;
    const r = await api('POST', '/auth/verify', body, { auth: false });
    if (!r?.token) throw new Error('The server signed in without a device token');
    saveToken(r.token);
    pendingEmail = null;
    return `Connected to ${r.email || who}'s library as "${name}". The device token is in ~/.secrets/eventpad.env. list_models now shows the ☁ shelves.`;
  }
  if (!email) throw new Error('connect_library needs {email} (an invite code too the first time), then {code}');
  await api('POST', '/auth/start', { email: email.trim(), ...(invite ? { invite: String(invite).trim() } : {}) }, { auth: false });
  pendingEmail = email.trim();
  return `Code sent to ${pendingEmail} — call connect_library with {code}`;
}

async function disconnectLibrary() {
  if (!token()) return 'Not connected.';
  try {
    const mine = lib.ownDevice(await api('GET', '/devices'));
    if (mine) await api('DELETE', `/devices/${encodeURIComponent(mine)}`);
    else await api('POST', '/auth/signout');
  } catch (e) {
    if (e.message !== lib.DISCONNECTED) throw e;   // already revoked: just forget it here
  }
  forgetToken();
  return 'Disconnected: this machine is signed out of the library and its token is gone from ~/.secrets/eventpad.env. Models pulled here stay on this machine.';
}

// Her server shelves (null when not connected); a problem is said in the second item
async function cloudShelves() {
  if (!token()) return [null, null];
  try { return [await api('GET', '/library'), null]; } catch (e) { return [null, e.message]; }
}

// Pull a server shelf into the local store (the same model again if it was pulled before).
// edit: check it out to this agent and hold it; refused while another device holds it.
async function pull(serverId, edit = false) {
  const p = modelPath(serverId);
  const r = await api('GET', `${p}/events?after=0`);
  const d = lib.decideOpen(r.holder, edit);
  if (d.refuse) throw new Error(d.refuse);
  let localId = Object.entries(links()).find(([id, l]) => l.serverId === serverId && es.listModels().some(m => m.id === id))?.[0];
  let holder = r.holder;
  if (d.checkout) {
    try { holder = (await api('POST', `${p}/checkout`)).holder; } catch (e) {
      if (e.status === 409) throw new Error(lib.heldElsewhere(e.body?.holder));
      throw e;
    }
  } else if (!edit && r.holder?.you) {
    // Opened to read a shelf it holds: give it back first
    if (localId && links()[localId]?.holding) await checkInLink(localId);
    else await api('POST', `${p}/checkin`);
    holder = null;
  }
  const events = lib.dropUndone(r.events, r.undone);
  if (localId) { es.openModel(localId); es.replaceModelEvents(localId, events); }
  else localId = es.createModel(events, { id: serverId });
  setLink(localId, { serverId, position: r.position, undone: r.undone || [], holding: d.mode === 'edit', local: events.length });
  touch();
  const head = d.mode === 'edit'
    ? '☁ Checked out to you from the library: edits go up as you make them. close_model checks it in (so does 15 minutes without a tool call); the phone can take it back.'
    : `☁ Pulled from the library, read-only (open_model {edit:true} to edit).${holder && !holder.you ? `\n(Checked out on ${holder.deviceName}: it can be opened for editing once it's checked in on the phone.)` : ''}`;
  return `${head}\n${outline()}`;
}

// Send what the server doesn't have yet of a held shelf, then check it in. Returns how many were sent.
async function checkInLink(id) {
  const link = links()[id];
  if (!link?.holding) return 0;
  const p = modelPath(link.serverId);
  const events = es.readModelEvents(id);
  const pending = events.slice(link.local ?? events.length);
  let position = link.position;
  if (pending.length) {
    const name = pr.projectState(events).modelName;
    position = (await api('POST', `${p}/events`, { after: link.position, events: pending, ...(name ? { name } : {}) })).position;
  }
  // 409: another device holds it already (taken back), so it isn't this agent's to check in
  try { await api('POST', `${p}/checkin`); } catch (e) { if (e.status !== 409) throw e; }
  setLink(id, { ...link, holding: false, position, local: events.length });
  return pending.length;
}

async function closeModel() {
  const id = es.getCurrentModelId();
  const link = links()[id];
  const events = es.getEventStream();
  const name = state().modelName || 'Untitled model';
  const d = lib.decideClose(link, link ? events.length - (link.local ?? events.length) : 0);
  if (d.nothing) return `${name}: ${d.nothing}.`;
  if (!token()) throw new Error(`${lib.DISCONNECTED} (this model is kept in the library)`);
  const sent = await checkInLink(id);
  return `Checked in ${name}${sent ? ` (sent the ${sent} event${sent === 1 ? '' : 's'} not sent yet first)` : ''}: the phone can check it out now. Open it with edit:true to edit again.`;
}

const count = (n, one) => `${n} ${one}${n === 1 ? '' : 's'}`;

// A file under the home folder, as ☰ → Import takes it: a new local model, opened
function importFile({ path: p }) {
  const home = os.homedir();
  const full = path.resolve(String(p).replace(/^~(?=$|\/)/, home));
  let real;
  try { real = fs.realpathSync(full); } catch (e) { throw new Error(`No such file: ${p}`); }
  if (!real.startsWith(home + path.sep)) throw new Error('Only files under the home folder can be imported');
  let json;
  try { json = JSON.parse(fs.readFileSync(real, 'utf8')); } catch (e) { throw new Error('not an Event Book model or test export (not JSON)'); }
  const kind = kindOf(json);
  const file = path.basename(real);
  if (kind === 'unknown') throw new Error('not an Event Book model or test export');
  if (kind === 'eventbook-plan') { const why = checkPlan(json); if (why) throw new Error(why); buildPlan(json); }
  else if (kind === 'events') es.createModel(json);
  else if (kind === 'export' || kind === 'scenarios') fromExport.modelFromTests([{ name: file, json, kind }], { es, c, sc });
  else fromExport.buildModel(fromExport.specFromPlan(json, json.name || json.project || 'Plan'), { es, c, sc });
  const st = state();
  const slices = Object.keys(st.slices).length, scns = Object.keys(st.scenarios).length;
  const chapters = st.chapterOrder.map(id => st.chapters[id]?.name).filter(Boolean);
  const what = kind === 'events' ? 'an Event Book model' : kind === 'plan' || kind === 'eventbook-plan' ? 'a plan' : 'a test export';
  return `Imported ${what} as a new model: ${st.modelName || 'Untitled model'} (id=${es.getCurrentModelId()}), ${count(chapters.length, 'chapter')} · ${count(slices, 'slice')} · ${count(scns, 'scenario')}${st.modelSource?.commit ? ` · built at ${String(st.modelSource.commit).slice(0, 7)}` : ''}.${chapters.length ? `\nChapters: ${chapters.join('; ')}` : ''}\nkeep_model puts it in the library; outline shows it.`;
}

// ---------- A plan being built (the press) ----------

// An app's build book from the library: its state and its newest edition's details
async function buildBookFromLibrary(app) {
  const [cloud, problem] = await cloudShelves();
  if (!cloud) throw new Error(problem || lib.DISCONNECTED);
  const row = cloud.find(r => (r.name || '').toLowerCase() === `${app} · built`.toLowerCase());
  if (!row) throw new Error(`${app} has no build book yet: deploy it once first`);
  const r = await api('GET', `${modelPath(row.modelId)}/events?after=0`);
  const events = lib.dropUndone(r.events, r.undone);
  const last = [...events].reverse().find(e => e.type === es.EventTypes.EditionPublished);
  if (!last) throw new Error(`${app}'s build book has no edition yet`);
  return { state: pr.projectState(events), edition: last.data };
}

// What's at the press: every plan in the library sent to press and waiting for a builder, and
// the ones being built (by whom). Read from each shelf's events; nothing is checked out.
async function pressQueueTool() {
  const [cloud, problem] = await cloudShelves();
  if (!cloud) throw new Error(problem || lib.DISCONNECTED);
  const waiting = [], building = [];
  for (const row of cloud) {
    let r;
    try { r = await api('GET', `${modelPath(row.modelId)}/events?after=0`); } catch { continue; }
    const st = pr.projectState(lib.dropUndone(r.events, r.undone));
    const p = st.press;
    if (!p || p.stage === 'built') continue;
    const line = `${st.modelName || row.name} (${p.app || '?'}, ${count((p.slices || []).length, 'slice')}${p.sentBy ? `, sent by ${p.sentBy}` : ''})`;
    (p.stage === 'press' ? waiting : building).push(p.stage === 'press' ? line : `${line}: being built by ${p.builder}`);
  }
  if (!waiting.length && !building.length) return 'Nothing at the press.';
  return [waiting.length ? `🖨 Waiting for a builder (${waiting.length}):\n${waiting.map(x => `  ${x}`).join('\n')}\nstart_building {plan} takes one.` : '',
    building.length ? `Being built (${building.length}):\n${building.map(x => `  ${x}`).join('\n')}` : ''].filter(Boolean).join('\n');
}

// ---------- Articles: two rounds, structure then text ----------

// outline_article: a new book whose chapters are the sections and whose slices are the points (a
// claim, the thought behind it, its sources marked public or private). No stickies: points are prose.
function outlineArticleTool({ title, standfirst, sections }) {
  const points = (sections || []).flatMap(x => x.points || []);
  if (!String(title || '').trim() || !points.length) throw new Error('An article needs a title and at least one point');
  es.createModel();
  c.nameModel(String(title).trim());
  // An article is literature from the start: Read / Outline, not a board, before any paragraph
  lit.chooseBookKind({ kind: 'literature' });
  if (standfirst) c.describeModel(String(standfirst));
  for (const sec of sections) {
    const chapterId = c.createChapter(String(sec.title || 'Section'));
    for (const p of sec.points || []) {
      const s = c.createSlice('SC', String(p.claim || 'A point'), { chapterId });
      const sources = (p.sources || []).map(x => typeof x === 'string' ? `${x} (public)` : `${x.ref} (${x.public === false ? 'private: not linked in the post' : 'public'})`);
      const text = [p.thought, sources.length ? `Sources: ${sources.join('; ')}` : ''].filter(Boolean).join('\n\n');
      if (text) c.describeSlice(s, text);
    }
  }
  return `Outlined "${title}": ${count(sections.length, 'section')}, ${count(points.length, 'point')}. keep_model puts it in the library; the person approves the structure (☰ ⋮ → Approve structure) before write_paragraphs.\n${outline()}`;
}

// import_draft: her Markdown becomes a literature book of its own
function importDraftTool({ markdown, title, author }) {
  const before = es.getCurrentModelId();
  const id = es.createModel();
  const why = lit.importDraft({ markdown, title: title || null, author: author || process.env.EVENTPAD_AUTHOR || null });
  if (why) { es.deleteModel(id); es.openModel(before); throw new Error(why); }
  const st = state();
  return `Imported "${st.modelName}" as a literature book: ${count(Object.keys(st.slices).length, 'paragraph')}, ${count(Object.keys(st.sentences).length, 'sentence')}, ${count(st.chapterOrder.length, 'chapter')}. keep_model puts it in the library; outline reads it back.\n${outline()}`;
}

// write_paragraphs: round two, a point's text (only once she has approved the structure)
function writeParagraphsTool({ slice, paragraphs, as }) {
  const s = findSlice(slice);
  if (!s) throw new Error(`No slice "${slice}"`);
  const by = lib.agentName(as, process.env);
  const list = (Array.isArray(paragraphs) ? paragraphs : [paragraphs]).map(String).filter(x => x.trim());
  if (!list.length) throw new Error('Write something first');
  for (const text of list) { const why = ar.writeParagraph({ sliceId: s.id, text, by }); if (why) throw new Error(why); }
  return `${count(list.length, 'paragraph')} on ${pr.sliceTitle(s, state())}. The author reads and ticks Refined on the slice when it's right.`;
}

// A sentence of a literature point, by its number in the outline or the start of its text
function sentenceOf(slice, ref, st = state()) {
  const sentences = litr.sentencesOf(st, slice.id), key = String(ref).trim().toLowerCase();
  const hit = /^\d+$/.test(key) ? sentences[Number(key) - 1] : sentences.find(x => x.text.toLowerCase() === key) || sentences.find(x => x.text.toLowerCase().startsWith(key));
  if (!hit) throw new Error(`${pr.sliceTitle(slice, st)} has no sentence "${ref}" (its number from the outline, or the start of it)`);
  return hit;
}
const isLit = () => { if (!litr.isLiterature(state())) throw new Error('Not a literature book: this is for a draft imported with import_draft'); };

// add_gap: an empty point after another, named by its question; she fills it
function addGapTool({ after, question, as }) {
  isLit();
  const a = after ? findSlice(after) : null;
  const why = lit.addGap({ question, afterSliceId: a ? a.id : null, by: lib.agentName(as, process.env) });
  if (why) throw new Error(why);
  return `Asked: "${String(question).trim()}"${a ? ` after ${pr.sliceTitle(a, state())}` : ' at the start'}. Only the author fills it.\n${outline()}`;
}

// suggest_edits: each one checked on its own; the refused come back with their reasons
function suggestEditsTool({ suggestions, as }) {
  isLit();
  const by = lib.agentName(as, process.env);
  if (!Array.isArray(suggestions) || !suggestions.length) throw new Error('Give suggestions: [{slice, sentence, find, replace, why}]');
  const done = [], refused = [];
  suggestions.forEach((x, i) => {
    let why;
    try {
      const sentence = sentenceOf(findSlice(x.slice), x.sentence);
      why = sug.suggestEdit({ sentenceId: sentence.id, find: x.find, replace: x.replace ?? '', why: x.why, by });
      if (!why) done.push(`${Math.max(...Object.values(state().suggestions).map(y => y.n))}: "${x.find}" → ${x.replace ? `"${x.replace}"` : 'cut'}`);
    } catch (e) { why = e.message; }
    if (why) refused.push(`#${i + 1} (${x.slice} ${x.sentence}): ${why}`);
  });
  if (!done.length) throw new Error(`Nothing was suggested.\nRefused:\n${refused.join('\n')}`);
  return `${count(done.length, 'suggestion')} recorded, numbered per book (the author can say "skip 2,5"):\n${done.join('\n')}${refused.length ? `\nRefused:\n${refused.join('\n')}` : ''}`;
}

// Take a plan at the press: checked out to this builder, its slices to build listed
async function startBuildingTool({ plan, as, from_commit }) {
  const opened = tools.find(t => t.name === 'open_model');
  await opened.run({ model: plan, edit: true });
  const builder = lib.agentName(as, process.env);
  try {
    const text = await writeBack(() => {
      const why = ps.startBuilding({ builder, fromCommit: from_commit || null });
      if (why) throw new Error(why);
      const st = state();
      const titles = st.press.slices.map(id => st.slices[id]).filter(Boolean).map(s => pr.sliceTitle(s, st));
      // An article: its text, in reading order, with every open comment to answer
      const article = Object.keys(st.paragraphs || {}).length ? '\n\n' + outline({ scenarios: true }) : '';
      return `Building ${st.modelName} for ${st.press.app} as ${builder}: checked out to you, nobody else edits it meanwhile.\n`
        + `To build (${count(titles.length, 'refined slice')}): ${titles.join(', ')}\n`
        + (article ? 'An article: put the post together from the paragraphs below, in this order (join and polish, don\'t rewrite what the person read), answer the open comments in the text, never link a source marked private. Sending it to press was the author\'s go to publish: put it together and publish it (no further approval needed), then link it back.' + article
          : 'generate_specs {repo} writes them as pending specs. As you build, report_progress {slice, step: started | red | green | pr | stuck} for each slice: the person sees it live. When the deploy has published the build, finish_building attaches it and checks the plan back in.');
    });
    return text;
  } catch (e) { await closeModel().catch(() => {}); throw e; }
}

// Back with the build: the app's newest build edition attached, the built slices Done, checked in
async function finishBuildingTool({ as }) {
  const st = state();
  // Checked in already: a newer build of its app (posted late) can still be attached
  const again = st.press?.stage === 'built';
  if (!again && st.press?.stage !== 'building') throw new Error('Nobody is building this plan (start_building first)');
  const { state: built, edition } = await buildBookFromLibrary(st.press.app);
  const by = lib.agentName(as, process.env);
  const found = { app: st.press.app, edition: edition.edition, commit: edition.commit, build: edition.build ?? null, scenarios: edition.scenarios ?? null,
    ...(edition.workflow ? { workflow: edition.workflow } : {}) };
  const text = await writeBack(() => {
    if (again) {
      const why = ps.attachNewerBuild({ ...found, built });
      if (why) throw new Error(why);
    } else {
      if (!st.press.build || st.press.build.edition !== edition.edition) {
        const why = ps.attachBuild({ ...found, createdAt: edition.createdAt || null, built });
        if (why) throw new Error(why);
      }
      const why = ps.checkInBuiltPlan({ by, built });
      if (why) throw new Error(why);
    }
    const s = ps.buildSummary(state(), built);
    return `Back with ${st.press.app}'s edition ${s.edition}${s.build ? ` (build ${s.build})` : ''}: ${count(s.slicesDone, 'slice')} done`
      + `${s.slicesStillToBuild.length ? `; still to build: ${s.slicesStillToBuild.join(', ')}` : ''}`
      + `${s.slicesBuiltButNotPlanned.length ? `; built but not planned: ${s.slicesBuiltButNotPlanned.join(', ')}` : ''}.`;
  });
  return `${text}\n${await closeModel()}`;
}

// report_progress: the builder says where a slice has got to; each refusal is one line
function reportProgressTool({ slice, step, note, pr: prIn, tests, as }) {
  const st = state();
  let found = null, missing = null;
  try { found = findSlice(slice, st); } catch (e) { missing = e.message; }
  // A number, a url or { number, url } for the pull request
  const pull = prIn == null ? null : typeof prIn === 'object' ? prIn
    : /^\d+$/.test(String(prIn).replace(/^#/, '')) ? { number: Number(String(prIn).replace(/^#/, '')) }
    : { url: String(prIn), ...(String(prIn).match(/\/pull\/(\d+)/) ? { number: Number(String(prIn).match(/\/pull\/(\d+)/)[1]) } : {}) };
  const why = bp.reportProgress({ sliceId: found ? found.id : null, step, note, pr: pull, tests, by: lib.agentName(as, process.env), state: st });
  if (why === 'No such slice' && missing) throw new Error(missing);
  if (why) throw new Error(why);
  const v = sliceProgress(state(), found.id);
  return `${pr.sliceTitle(found, state())}: ${v ? `${v.icon} ${v.label}` : step}.`;
}

// ---------- Board to failing specs ----------

// The repo's Given / When / Then harness: itsybit-gwt (JS) or ItsyBIT.EventStore.Testing (.NET)
function harnessOf(root) {
  const pkg = path.join(root, 'package.json');
  if (fs.existsSync(path.join(root, 'tests', 'gwt')) || (fs.existsSync(pkg) && fs.readFileSync(pkg, 'utf8').includes('itsybit-gwt'))) return 'js';
  const tests = path.join(root, 'tests');
  if (fs.existsSync(tests) && fs.readdirSync(tests).some(d => /\.Tests$/.test(d))) return 'dotnet';
  return null;
}

// What Event Book last wrote to each file, from the board's own history
function lastGenerated() {
  const out = {};
  es.getEventStream().filter(e => e.type === es.EventTypes.SpecsGenerated || e.type === es.EventTypes.SpecsRegenerated)
    .forEach(e => (e.data.files || []).forEach(f => { if (f.hash) out[f.path] = f.hash; }));
  return out;
}

// The harness's import name: the old GitHub Packages one where the repo still uses it, else itsybit-gwt from npmjs.org
function gwtPackageOf(root) {
  const pkg = path.join(root, 'package.json');
  const text = fs.existsSync(pkg) ? fs.readFileSync(pkg, 'utf8') : '';
  return { name: text.includes('"@jocelynenglund/itsybit-gwt"') ? '@jocelynenglund/itsybit-gwt' : gen.GWT_PACKAGE, installed: /"(@jocelynenglund\/)?itsybit-gwt"/.test(text) };
}

function generateSpecsTool({ repo, app, language, dir }) {
  const full = path.resolve(String(repo).replace(/^~(?=$|\/)/, os.homedir()));
  let root;
  try { root = fs.realpathSync(full); } catch { throw new Error(`No such folder: ${repo}`); }
  if (!fs.existsSync(path.join(root, '.git'))) throw new Error(`${repo} is not a git repo`);
  const lang = language || harnessOf(root);
  if (!lang) throw new Error('Couldn\'t tell the repo\'s Given/When/Then harness: say language (js)');
  const st = state();
  const gwt = gwtPackageOf(root);
  const existing = {}, generated = lastGenerated();
  const read = p => { const f = path.join(root, p); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; };
  // First what would be written, to know which files to read
  const probe = gen.generateSpecs(st, { app, language: lang, shelf: st.modelName, dir, gwtPackage: gwt.name });
  if (probe.refused) throw new Error(probe.refused);
  probe.files.forEach(f => { const text = read(f.path); if (text !== null) existing[f.path] = text; });
  const r = gen.generateSpecs(st, { app, language: lang, shelf: st.modelName, dir, existing, gwtPackage: gwt.name });
  const again = Object.keys(generated).some(p => r.files.some(f => f.path === p));
  // Specs are generated-only (rewritten); a stub already there is the builder's (kept)
  for (const f of r.files) {
    if (f.state === 'unchanged' || f.state === 'kept') continue;
    const target = path.join(root, f.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, f.content);
  }
  const slices = [...gen.slicesToGenerate(st).values()].flat().map(s => s.id);
  // Recorded with what was written, so a later run can tell hand edits apart
  const files = r.files.filter(f => f.state !== 'kept').map(f => ({ path: f.path, hash: gen.contentHash(f.content) }));
  es.appendEvent(again ? es.EventTypes.SpecsRegenerated : es.EventTypes.SpecsGenerated,
    { app: app || path.basename(root), repo: root, language: lang, slices, files });
  const label = { new: 'written', regenerated: 'rewritten', unchanged: 'unchanged', kept: 'yours, left as it is' };
  return `${again ? 'Regenerated' : 'Generated'} pending specs for ${count(r.slices.length, 'refined slice')} (${r.slices.join(', ')}) in ${root}:\n`
    + r.files.map(f => `  ${f.path}: ${label[f.state]}`).join('\n')
    + gen.waivedToSkip(st).map(s => `\n  ${pr.sliceTitle(s, st)}: no scenario (waived), no spec`).join('')
    + (lang === 'js' && !gwt.installed ? `\nThe specs need the harness: npm install --save-dev ${gwt.name} (run them with node --test).` : '')
    + `\nSpec files are generated: don't edit them, generate again instead. Each slice's stub throws NotBuiltYet: while it does, its scenarios are pending (CI and deploys stay green; GWT_RUN_PENDING=1 runs them red). Write the real slice in the stub's file; generating again never overwrites it. Needs @jocelynenglund/itsybit-gwt 0.2.0.`;
}

// Keep the open model in the library: the first push keeps the shelf (and checks it out to
// this agent), then it's checked in so the phone can open it. Later edits need open_model {edit:true}.
async function keepModel() {
  const id = es.getCurrentModelId();
  const name = state().modelName || 'Untitled model';
  if (links()[id]) return `${name} is in the library already: ${bookLink(links()[id].serverId)}`;
  if (!token()) throw new Error(NOT_CONNECTED);
  const events = es.getEventStream();
  if (!events.length) throw new Error('Nothing to keep yet: the model is empty');
  // Every machine's first model is 'default': on the server it gets an id of its own
  const serverId = id === 'default' ? 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) : id;
  const shelves = await api('GET', '/library');
  if (shelves.some(r => r.modelId === serverId)) throw new Error(`Her library already has a shelf with this model's id (${serverId}): open it with open_model cloud:${serverId}`);
  const p = modelPath(serverId);
  let position = 0;
  // The server takes up to 1 MB a request: a big model goes in parts
  for (const part of lib.parts(events)) position = (await api('POST', `${p}/events`, { after: position, events: part, name })).position;
  await api('POST', `${p}/checkin`);
  setLink(id, { serverId, position, undone: [], holding: false, local: events.length });
  return `Kept ${name} in the library (${events.length} events), checked in: it's on the bookshelves now. Send the person this link (the book itself, not a copy): ${bookLink(serverId)}\nopen_model {edit:true} to change it.`;
}

// An edit to the open model; when it's a pulled shelf, the new events go back up (or nothing changes)
async function writeBack(edit, { talk = false } = {}) {
  const id = es.getCurrentModelId();
  const link = links()[id];
  if (!link) return edit();
  if (!token()) throw new Error(`${lib.DISCONNECTED} (this model is kept in the library)`);
  if (!link.holding && talk) return talkBack(id, link, edit);
  if (!link.holding) throw new Error(lib.decideWrite(link, {}).refuse);
  const release = () => setLink(id, { ...links()[id], holding: false });
  const p = modelPath(link.serverId);
  const now = await api('GET', `${p}/events?after=${link.position}`);
  const d = lib.decideWrite(link, now);
  if (d.refuse) { if (d.release) release(); throw new Error(d.refuse); }
  const before = es.getEventStream().slice();
  const undo = () => es.replaceModelEvents(id, before);
  let text;
  try { text = await edit(); } catch (e) { undo(); throw e; }
  const fresh = es.getEventStream().slice(before.length);
  if (!fresh.length) return text;
  try {
    const name = state().modelName;
    const r = await api('POST', `${p}/events`, { after: link.position, events: fresh, ...(name ? { name } : {}) });
    // Something got in between the check and the push: the next edit asks to reopen
    const raced = (r.events || []).length > 0;
    setLink(id, { ...link, position: raced ? link.position : r.position, undone: r.undone || link.undone, local: es.getEventStream().length });
    return `${text}\n☁ Sent to the library (${fresh.length} event${fresh.length === 1 ? '' : 's'}).${raced ? ' It changed meanwhile: reopen it to see both.' : ''}`;
  } catch (e) {
    undo();
    if (e.status === 409) { const c = lib.afterConflict(e.body?.holder); release(); throw new Error(c.refuse); }
    throw e;
  }
}

// A comment on a shelf this agent doesn't hold: the server takes comment events from any
// device, so they go up without checking it out (nothing else may come along)
async function talkBack(id, link, edit) {
  const before = es.getEventStream().slice();
  const text = await edit();
  const fresh = es.getEventStream().slice(before.length);
  if (!fresh.length) return text;
  if (!fresh.every(e => commentEventTypes.has(e.type))) { es.replaceModelEvents(id, before); throw new Error(lib.READ_ONLY); }
  try {
    const r = await api('POST', `${modelPath(link.serverId)}/events`, { after: link.position, events: fresh });
    const got = (r.events || []);
    setLink(id, { ...link, position: got.length ? link.position : r.position, local: es.getEventStream().length });
    return `${text}\n☁ Sent to the library (${fresh.length} event${fresh.length === 1 ? '' : 's'}).`;
  } catch (e) { es.replaceModelEvents(id, before); throw e; }
}

// ---------- Letting go by itself: idle, and on the way out ----------
// After EVENTPAD_IDLE_MS (15 minutes) without a tool call, what the agent holds is checked
// in; and when this server stops (its session ends, or it's told to), it tries to.

const IDLE = lib.idleMs(process.env);
let lastCall = Date.now();
let idleTimer = null;

function touch() {
  lastCall = Date.now();
  clearTimeout(idleTimer);
  if (Object.values(links()).some(l => l.holding)) { idleTimer = setTimeout(checkInIdle, IDLE); idleTimer.unref?.(); }
}

async function checkInIdle() {
  const ids = lib.idleCheckIns(links(), lastCall, Date.now(), IDLE);
  if (!ids.length) return touch();   // woken a moment early: wait the rest
  for (const id of ids) {
    try { await checkInLink(id); console.error(`idle: checked in ${links()[id]?.serverId}`); }
    catch (e) { console.error(`idle: couldn't check in (${lib.scrub(e.message, token())})`); }
  }
  persist();
}

let leaving = false;
async function leave() {
  if (leaving) return;
  leaving = true;
  clearTimeout(idleTimer);
  const held = Object.entries(links()).filter(([, l]) => l.holding).map(([id]) => id);
  const all = (async () => { for (const id of held) { try { await checkInLink(id); } catch (e) { /* tried */ } } persist(); })();
  await Promise.race([all, new Promise(r => setTimeout(r, 3000))]);
  process.exit(0);
}
process.on('SIGTERM', leave);
process.on('SIGINT', leave);

// ---------- Live view ----------
// eventPAD itself, served from this repo on localhost, with ?live: the page listens on
// /live/stream and gets the open model on every change (server-sent events).

const repo = new URL('../../', import.meta.url).pathname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const watchers = new Set();
let liveUrl = null;

function pushLive() {
  if (!watchers.size) return;
  const data = `data: ${JSON.stringify({ events: es.getEventStream() })}\n\n`;
  watchers.forEach(res => res.write(data));
}

const liveServer = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/live/stream') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    watchers.add(res);
    res.write(`data: ${JSON.stringify({ events: es.getEventStream() })}\n\n`);
    req.on('close', () => watchers.delete(res));
    return;
  }
  let file = path.normalize(path.join(repo, decodeURIComponent(url.pathname)));
  // Only the app's own files: nothing outside the repo, nothing under its .git or .claude
  if (!file.startsWith(repo) || /(^|[\\/])\.(git|claude)([\\/]|$)/.test(file.slice(repo.length))) { res.writeHead(404); return res.end(); }
  if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
  fs.readFile(file, (err, body) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  });
});
// One port per running server (several sessions can each have one)
let port = Number(process.env.EVENTPAD_LIVE_PORT || 7979);
liveServer.on('error', e => {
  if (e.code === 'EADDRINUSE' && port < 7999) liveServer.listen(++port, '127.0.0.1');
  else console.error('live view off:', e.message);
});
liveServer.on('listening', () => { liveUrl = `http://localhost:${port}/?live`; });
liveServer.listen(port, '127.0.0.1');

// ---------- Tools ----------

const S = { type: 'string' };
const tools = [
  { name: 'list_models', description: 'The Event Book models on this machine (* the open one, ☁ kept in the library), and when connected the library\'s shelves not pulled here yet (☁ … id=cloud:<id>; "checked out on <device>" when another device holds it).',
    inputSchema: { type: 'object', properties: {} },
    run: async () => {
      const open = es.getCurrentModelId(), linked = links();
      const local = es.listModels().map(m => {
        const st = pr.projectState(es.readModelEvents(m.id));
        return { id: m.id, name: st.modelName, slices: Object.keys(st.slices).length, tags: st.tags, open: m.id === open, serverId: linked[m.id]?.serverId };
      });
      const [cloud, problem] = await cloudShelves();
      return lib.libraryLines(local, cloud) + (problem ? `\n☁ ${problem}` : '');
    } },
  { name: 'open_model', description: 'Open a model by name or id; later tools work on it. A ☁ shelf (id=cloud:<id>, or a model kept in the library) is pulled fresh from the server, read-only. edit:true checks it out to you (refused while the phone has it): your edits go up to the library as you make them, until close_model (or 15 minutes without a tool call). The person can take it back from the phone; then edits are refused.',
    inputSchema: { type: 'object', properties: { model: S, edit: { type: 'boolean' } }, required: ['model'] },
    run: async ({ model, edit = false }) => {
      const sid = lib.parseCloudId(model);
      if (sid) return pull(sid, edit);
      const m = es.listModels().find(x => x.id === model || (pr.projectState(es.readModelEvents(x.id)).modelName || '').toLowerCase() === model.toLowerCase());
      // A book id she copied from the app (☰ ⋮ → Copy book id) that isn't on this machine: the library's
      if (!m && /^m_[A-Za-z0-9_-]{1,38}$/.test(String(model).trim()) && token()) return pull(String(model).trim(), edit);
      if (m) {
        const link = links()[m.id];
        if (link && token()) return pull(link.serverId, edit);
        es.openModel(m.id);
        return outline();
      }
      const [cloud] = await cloudShelves();
      const row = (cloud || []).find(r => (r.name || '').toLowerCase() === model.trim().toLowerCase());
      if (row) return pull(row.modelId, edit);
      throw new Error(`No model "${model}"`);
    } },
  { name: 'close_model', description: 'Done editing a ☁ shelf opened with edit:true: sends anything not sent yet and checks it in, so the phone can check it out.',
    inputSchema: { type: 'object', properties: {} }, run: closeModel },
  { name: 'new_model', description: 'Start a new model and open it. kind: "fact" (default: an event model with a board, scenarios and specs) or "literature" (writing: a point is a paragraph, its sentences take the scenarios\' place, Read / Outline instead of the board). To bring an existing draft in, import_draft makes a literature book from its Markdown.',
    inputSchema: { type: 'object', properties: { name: S, description: S, kind: { type: 'string', enum: ['fact', 'literature'] } }, required: ['name'] },
    run: ({ name, description, kind }) => {
      if (kind && !['fact', 'literature'].includes(kind)) throw new Error('kind is "fact" or "literature"');
      es.createModel();
      c.nameModel(name);
      if (description) c.describeModel(description);
      if (kind) { const why = lit.chooseBookKind({ kind }); if (why) throw new Error(why); }
      return `Opened new ${kind === 'literature' ? 'literature book' : 'model'} "${name}".`;
    } },
  { name: 'edit_model', edits: true, description: 'kind: "literature" turns an outline with no stickies or scenarios into a literature book (Read / Outline). Rename the open model, replace its description (what it is: on its card, in the catalog, on the shared image), its preface (why it is being written: the first page the first time it is opened; a book without one shows its description) or set its tags (the whole set each time: leave one out to remove it; tidied to lower case, no repeats, at most 8, each up to 24 letters; [] clears them). A published book (a build book) takes a description, preface and tags, not a new name.',
    inputSchema: { type: 'object', properties: { name: S, description: S, preface: S, tags: { type: 'array', items: S }, kind: { type: 'string', enum: ['literature'] } } },
    run: ({ name, description, preface, tags, kind }) => {
      if (!name && description === undefined && preface === undefined && tags === undefined && !kind) throw new Error('Give a name, a description, a preface, tags, a kind or any of them');
      // An outline made as a fact book (an article before outline_article chose literature) can
      // become literature, but only while it has no stickies or scenarios: never a real event model
      if (kind) {
        const st = state();
        if (kind !== 'literature') throw new Error('kind can only be "literature" here');
        if (st.kind === 'literature') throw new Error('It is literature already');
        if (Object.values(st.slices).some(x => x.elements.length) || Object.keys(st.scenarios || {}).length) throw new Error('This book has stickies or scenarios: it stays a fact book');
        const why = lit.chooseBookKind({ kind });
        if (why) throw new Error(why);
      }
      if (name) c.nameModel(name.trim());
      if (description !== undefined) c.describeModel(description);
      if (preface !== undefined) c.writePreface(preface);
      if (tags !== undefined) c.tagBook(tags);
      return `Updated the model: ${state().modelName}${kind ? ` (now ${kind})` : ''}.`;
    } },
  { name: 'outline', description: 'The open model as a short outline: chapters (with "N of M refined"), slices (S-numbers to refer to them; "☐ ready" once refined, ready to build; "☑ done" once confirmed built from the tests), stickies with fields, scenario counts. scenarios:true lists each Given/When/Then (★ must have, ✓ nice to have).',
    inputSchema: { type: 'object', properties: { chapter: S, scenarios: { type: 'boolean' } } }, run: outline },
  { name: 'add_steps', edits: true,
    description: 'Add steps to a chapter (made if new), in order. Each step: kind "do" (screen?, command, event|events), "see" (events, readModel, list?, screen?) or "auto" (when? event, external?, using? readModel, todo?, processor, command, result|events). An event is a name or {name, table?, external?, published?, to?}: table is the name of a legacy table (old storage read as events), external says another system records it (inbound), published: true marks one of OUR events as an integration event, published to other systems (outbound, a contract: its fields are what they rely on; an external event cannot also be published) and to: ["Billing", "CRM"] names who consumes it; on a do or see step with one event, table / published / to beside it are shorthand (external: true also for several). list: true on a see step makes the read model a list of rows. Marks are set once on a reused sticky. Optional per step: name, fields (e.g. "orderId, size, items[]"; go on its command/event or read model), description. Stickies with the same name are reused.',
    inputSchema: { type: 'object', properties: { chapter: S, steps: { type: 'array', items: { type: 'object' } } }, required: ['steps'] },
    run: ({ chapter, steps }) => {
      notLiterature('steps');
      const chId = chapterId(chapter);
      const ids = steps.map(s => addStep(s, chId));
      const st = state(), refs = new Map(sliceRefs(st).map(x => [x.slice.id, x.ref]));
      return `Added ${ids.length} step${ids.length === 1 ? '' : 's'}: ${ids.map(id => `${refs.get(id)} ${pr.sliceTitle(st.slices[id], st)}`).join(', ')}`;
    } },
  { name: 'add_scenarios', edits: true,
    description: 'Add Given/When/Then scenarios to a slice (S-number or title). Each: name, given [{event, values}], when {values, command?} (a Do slice; defaults to its command), then {event, values} | {rejected: reason} | {readModel?, values | rows} (a See slice), mustHave (true: an acceptance criterion; otherwise a nice to have).',
    inputSchema: { type: 'object', properties: { slice: S, scenarios: { type: 'array', items: { type: 'object' } } }, required: ['slice', 'scenarios'] },
    run: ({ slice, scenarios }) => {
      notLiterature('scenarios');
      const s = findSlice(slice);
      scenarios.forEach(checkScenario); // all checked before any is added
      scenarios.forEach(x => addScenario(s, x));
      return `Added ${scenarios.length} scenario${scenarios.length === 1 ? '' : 's'} to ${pr.sliceTitle(s, state())}.`;
    } },
  { name: 'edit_slice', edits: true, description: 'Rename, describe, add fields to, move to a chapter, mark refined (refined:true, needs scenarios or a waiver; any other edit clears it, and done with it), waive its scenarios (waived:true, optional waivedReason: nothing to test, so it can be refined without any and no spec is expected; only for a slice with no scenarios; waived:false lifts it), run a command slice from an automation (automation: {when: the event that starts it, processor, view: an existing view slice with no other half as its first half, else a new one just before it}; it keeps its command, event, fields and scenarios), give it back to a person (person:true) or delete a slice (S-number or title).',
    inputSchema: { type: 'object', properties: { slice: S, name: S, description: S, fields: S, chapter: S, refined: { type: 'boolean' }, waived: { type: 'boolean' }, waivedReason: S, ready: { type: 'boolean', description: 'Older name for refined' }, delete: { type: 'boolean' },
      automation: { type: 'object', properties: { when: S, processor: S, view: S }, required: ['when', 'processor'] }, person: { type: 'boolean' } }, required: ['slice'] },
    run: ({ slice, name, description, fields, chapter, refined, ready, waived, waivedReason, delete: del, automation, person }) => {
      if (refined === undefined) refined = ready;
      const s = findSlice(slice);
      if (del) { c.deleteSlice(s.id); return `Deleted ${pr.sliceTitle(s, state())}.`; }
      if (automation) {
        const odd = Object.keys(automation).filter(k => !['when', 'processor', 'view'].includes(k));
        if (odd.length) throw new Error(`automation takes when, processor and view; not ${odd.join(', ')}`);
        const why = auto.runSliceFromAutomation({ sliceId: s.id, processor: automation.processor, whenEvent: automation.when, viewSliceId: automation.view ? findSlice(automation.view).id : null });
        if (why) throw new Error(why);
      }
      if (person === true) { const why = auto.runSliceByPerson({ sliceId: s.id }); if (why) throw new Error(why); }
      if (name) c.nameSlice(s.id, name);
      if (description !== undefined) c.describeSlice(s.id, description);
      if (fields) ol.addOutlineProperties(s.id, fields);
      if (chapter) c.setSliceChapter(s.id, chapterId(chapter));
      // Waiving is an edit too (it takes refined back), so before refined below
      const by = lib.agentName(null, process.env);
      if (waived === true) { const refused = c.waiveScenarios({ sliceId: s.id, reason: waivedReason || '', by }); if (refused) throw new Error(`${pr.sliceTitle(s, state())} can't be waived: ${refused}`); }
      if (waived === false) { const refused = c.liftScenarioWaiver({ sliceId: s.id, by }); if (refused) throw new Error(`${pr.sliceTitle(s, state())} can't be un-waived: ${refused}`); }
      // After the edits above (each of which takes refined back)
      if (refined === false) c.clearSliceRefined(s.id);
      if (refined === true) { const refused = c.markSliceRefined(s.id); if (refused) throw new Error(`${pr.sliceTitle(s, state())} can't be marked refined: ${refused}`); }
      return `Updated ${pr.sliceTitle(state().slices[s.id], state())}.`;
    } },
  { name: 'set_fields', edits: true, description: 'Give one sticky of a slice (its command, event or read model, by name) exactly these fields: missing ones added, unlisted ones removed, types updated. The sticky is shared, so every slice it is on changes with it.',
    inputSchema: { type: 'object', properties: { slice: S, sticky: S, fields: S }, required: ['slice', 'sticky', 'fields'] },
    run: ({ slice, sticky, fields }) => {
      const s = findSlice(slice), st = state();
      const own = s.elements.map(id => st.elements[id]).filter(e => e && ['command', 'event', 'readModel'].includes(e.type));
      const el = own.find(e => e.name.trim().toLowerCase() === sticky.trim().toLowerCase());
      if (!el) throw new Error(`${pr.sliceTitle(s, st)} has no command, event or read model "${sticky}" (it has: ${own.map(e => e.name).join(', ') || 'none'})`);
      const n = ol.setElementProperties(el.id, fields);
      return `${el.name}${props(state().elements[el.id]) || ' (no fields)'}${n ? '' : ' (unchanged)'}`;
    } },
  { name: 'rename_sticky', edits: true, description: 'Rename a sticky in place: a command, event, read model, screen or processor (by its current name; slice narrows it down when two stickies share a name). The sticky keeps its id, so every slice it is on, its fields and the scenarios that use it follow the new name. Use this rather than exporting and importing a copy.',
    inputSchema: { type: 'object', properties: { sticky: S, name: S, slice: S }, required: ['sticky', 'name'] },
    run: ({ sticky, name, slice }) => {
      const st = state();
      const kinds = ['command', 'event', 'readModel', 'screen', 'processor'];
      const same = e => e && kinds.includes(e.type) && e.name.trim().toLowerCase() === sticky.trim().toLowerCase();
      const pool = slice ? findSlice(slice).elements.map(id => st.elements[id]) : Object.values(st.elements);
      const hits = [...new Map(pool.filter(same).map(e => [e.id, e])).values()];
      if (!hits.length) throw new Error(`No sticky "${sticky}"${slice ? ` on ${pr.sliceTitle(findSlice(slice), st)}` : ''}`);
      if (hits.length > 1) throw new Error(`${hits.length} stickies are called "${sticky}" (${hits.map(e => e.type).join(', ')}): give slice to say which`);
      const to = name.trim();
      if (!to) throw new Error('Give the new name');
      const el = hits[0];
      if (to === el.name) return `${el.name} is called that already (unchanged).`;
      es.appendEvent(es.EventTypes.ElementRenamed, { elementId: el.id, name: to });
      const on = Object.values(state().slices).filter(x => x.elements.includes(el.id)).length;
      return `Renamed the ${el.type === 'readModel' ? 'read model' : el.type} ${el.name} → ${to} (on ${on} ${on === 1 ? 'slice' : 'slices'}).`;
    } },
  { name: 'delete_scenario', edits: true, description: 'Delete one scenario of a slice, by its name (to change a scenario: delete it and add it again).',
    inputSchema: { type: 'object', properties: { slice: S, scenario: S }, required: ['slice', 'scenario'] },
    run: ({ slice, scenario }) => {
      const s = findSlice(slice), st = state();
      const scns = pr.getScenariosForSlice(s.id, st);
      const hit = scns.find(x => (x.name || '').trim().toLowerCase() === scenario.trim().toLowerCase());
      if (!hit) throw new Error(`${pr.sliceTitle(s, st)} has no scenario "${scenario}" (it has: ${scns.map(x => x.name).join('; ') || 'none'})`);
      sc.deleteScenario(hit.id, s.id);
      return `Deleted "${hit.name}" from ${pr.sliceTitle(s, st)}.`;
    } },
  { name: 'move_slice', edits: true, description: 'Put a slice (S-number or title) right after another one in the order (an automation moves with its other half). To move it to another chapter use edit_slice {chapter}.',
    inputSchema: { type: 'object', properties: { slice: S, after: S }, required: ['slice', 'after'] },
    run: ({ slice, after }) => {
      const s = findSlice(slice), a = findSlice(after), st = state();
      const halves = [s, st.slices[s.pairWith]].filter(Boolean).sort((x, y) => st.sliceOrder.indexOf(x.id) - st.sliceOrder.indexOf(y.id));
      if (halves.some(h => h.id === a.id)) throw new Error('A slice can\'t go after itself');
      let prev = a.id;
      halves.forEach(h => { placeAfter(h.id, prev); prev = h.id; });
      return `Moved ${pr.sliceTitle(s, st)} after ${pr.sliceTitle(a, st)}.`;
    } },
  { name: 'edit_chapter', edits: true, description: 'Rename a chapter, move it to a position (1 = first), or delete it (only when it has no slices left).',
    inputSchema: { type: 'object', properties: { chapter: S, name: S, position: { type: 'number' }, delete: { type: 'boolean' } }, required: ['chapter'] },
    run: ({ chapter, name, position, delete: del }) => {
      const st = state();
      const ch = Object.values(st.chapters).find(x => x.name.trim().toLowerCase() === chapter.trim().toLowerCase());
      if (!ch) throw new Error(`No chapter "${chapter}" (chapters: ${st.chapterOrder.map(id => st.chapters[id]?.name).join('; ')})`);
      if (del) {
        const left = Object.values(st.slices).filter(x => x.chapterId === ch.id).length;
        if (left) throw new Error(`${ch.name} still has ${left} slice${left > 1 ? 's' : ''}: move or delete them first`);
        c.deleteChapter(ch.id);
        return `Deleted chapter ${ch.name}.`;
      }
      if (name) c.renameChapter(ch.id, name.trim());
      if (position !== undefined) {
        const to = Math.round(position) - 1;
        if (to < 0 || to >= st.chapterOrder.length) throw new Error(`position is 1 to ${st.chapterOrder.length}`);
        c.moveChapter(ch.id, to);
      }
      const now = state();
      return `Chapters: ${now.chapterOrder.map((id, i) => `${i + 1}. ${now.chapters[id].name}`).join(', ')}`;
    } },
  { name: 'add_comment', edits: true, talk: true, description: 'Comment on a slice, or on one of its scenarios (scenario: its name; part: given, when or then); in a literature book on one of a paragraph\'s sentences (scenario: its number in the outline, or the start of it). Signed "ItsyBOT · <as>" (as: the name of this session, e.g. Harry; else EVENTPAD_AGENT_NAME, else plain "ItsyBOT"). Works on a shelf the person has checked out too: comments are talk, not changes.',
    inputSchema: { type: 'object', properties: { slice: S, scenario: S, part: S, text: S, as: S }, required: ['slice', 'text'] },
    run: ({ slice, scenario, part, text, as }) => {
      const s = findSlice(slice), st = state();
      let scenarioId = null;
      if (scenario && litr.isLiterature(st)) {
        // A sentence, by its number in the outline or its text (the start of it will do)
        const sentences = litr.sentencesOf(st, s.id), key = scenario.trim().toLowerCase();
        const hit = /^\d+$/.test(key) ? sentences[Number(key) - 1] : sentences.find(x => x.text.toLowerCase() === key) || sentences.find(x => x.text.toLowerCase().startsWith(key));
        if (!hit) throw new Error(`${pr.sliceTitle(s, st)} has no sentence "${scenario}" (its number from the outline, or the start of it)`);
        scenarioId = hit.id;
      } else if (scenario) {
        const hit = pr.getScenariosForSlice(s.id, st).find(x => (x.name || '').trim().toLowerCase() === scenario.trim().toLowerCase());
        if (!hit) throw new Error(`${pr.sliceTitle(s, st)} has no scenario "${scenario}"`);
        scenarioId = hit.id;
      }
      cm.setNickname(lib.agentName(as));
      const why = cm.addComment({ sliceId: s.id, scenarioId, part: part || null, text });
      if (why) throw new Error(why);
      return `Commented on ${scenario ? `"${scenario}" in ` : ''}${pr.sliceTitle(s, st)}.`;
    } },
  { name: 'resolve_comment', edits: true, talk: true, description: 'Resolve an open comment (its id from the outline, 💬 cm_…) once it has been dealt with. Works on a shelf the person has checked out too.',
    inputSchema: { type: 'object', properties: { comment: S, as: S }, required: ['comment'] },
    run: ({ comment, as }) => {
      cm.setNickname(lib.agentName(as));
      const why = cm.resolveComment(comment.trim());
      if (why) throw new Error(why);
      return `Resolved ${comment.trim()}.`;
    } },
  { name: 'outline_article', description: 'Outline an article (round one) as a new book: chapters are its sections, slices its points. Each point: claim (its name), thought (what the paragraph will say, as long as it needs), sources ([{ref, public}]: a private source is cited but never linked in the post; a point may have none). The author reads it in the outline or on the slice pages, comments, and approves the structure; then write_paragraphs. keep_model puts it in the library.',
    inputSchema: { type: 'object', properties: { title: S, standfirst: S, sections: { type: 'array', items: { type: 'object' } } }, required: ['title', 'sections'] },
    run: outlineArticleTool },
  { name: 'write_paragraphs', edits: true, description: 'Round two of an article: the actual text of a point (slice: S-number or its claim), one or more paragraphs in order, signed ItsyBOT · <as>. Refused until the author has approved the structure. The author edits, comments and ticks Refined on the point.',
    inputSchema: { type: 'object', properties: { slice: S, paragraphs: { type: 'array', items: S }, as: S }, required: ['slice', 'paragraphs'] },
    run: writeParagraphsTool },
  { name: 'import_draft', description: 'Bring a Markdown draft in as a new literature book (a story, no board and no scenarios) and open it: each Markdown heading (## … ######) starts a chapter named by it (the text before the first heading is a chapter named as the book; a heading is never a paragraph), each paragraph (blank-line separated) a point named by its first few words, each sentence a line of it, verbatim and in order, signed as hers (author; default EVENTPAD_AUTHOR). Allowed before Approve structure: it is the author\'s own text. Refused when the draft has no text. A leading "# Title" is the title. keep_model puts it in the library; outline reads it back; export_draft takes the post out.',
    inputSchema: { type: 'object', properties: { markdown: S, title: S, author: S }, required: ['markdown'] },
    run: importDraftTool },
  { name: 'export_draft', description: 'The open literature book as Markdown in reading order (## per chapter, paragraphs joined from their sentences, Parked and empty points left out): the post, for the writing vault and wp-publish.py.',
    inputSchema: { type: 'object', properties: {} },
    run: () => {
      const st = state();
      if (!litr.isLiterature(st)) throw new Error('Not a literature book: export_draft is for a draft imported with import_draft');
      const { markdown } = litr.draftMarkdown(st);
      if (!markdown) throw new Error('Nothing to export yet: no paragraph is in the story');
      return markdown;
    } },
  { name: 'add_gap', edits: true, description: 'Ask for a line in a literature book: an empty point right after another (after: S-number; leave out for the start), named by its question, e.g. "what does developer^x mean to you?". It shows in Read as a quiet [question]; the author writes it. You can never fill a gap: comment instead.',
    inputSchema: { type: 'object', properties: { after: S, question: S, as: S }, required: ['question'] },
    run: addGapTool },
  { name: 'fill_gap', edits: true, description: 'Always refused: only the author fills a gap (the author writes it, in the app). Suggest the wording in a comment instead.',
    inputSchema: { type: 'object', properties: { slice: S, text: S }, required: ['slice'] },
    run: ({ slice, text }) => { isLit(); const why = lit.fillGap({ sliceId: findSlice(slice).id, text, agent: true }); throw new Error(why); } },
  { name: 'suggest_edits', edits: true, description: 'Suggest smallest-possible changes to THE AUTHOR\'S sentences in a literature book, several at once: [{slice: S-number, sentence: its number in the outline (or the start of it), find: the exact words to change, which must match once in that sentence, replace: what goes there (empty = cut), why: a few words}]. Each is checked on its own and numbered per book; the refused come back with reasons. The author sees them inline as strike/insert and accepts them ("all in", "skip 2,5"): you can\'t accept them. outline lists the open ones.',
    inputSchema: { type: 'object', properties: { suggestions: { type: 'array', items: { type: 'object' } }, as: S }, required: ['suggestions'] },
    run: suggestEditsTool },
  { name: 'park_point', edits: true, description: 'Set a paragraph (S-number) aside in the Parked chapter: it stays in the book but never in the story or the post. unpark: true puts it back where it was.',
    inputSchema: { type: 'object', properties: { point: S, unpark: { type: 'boolean' } }, required: ['point'] },
    run: ({ point, unpark }) => {
      isLit();
      const sl = findSlice(point);
      const why = unpark ? lit.unparkPoint({ sliceId: sl.id }) : lit.parkPoint({ sliceId: sl.id });
      if (why) throw new Error(why);
      return `${unpark ? 'Back in the story' : 'Parked'}: ${pr.sliceTitle(sl, state())}.`;
    } },
  { name: 'press_queue', description: 'What is at the press: the plans in the library the person has sent to press, waiting for a builder (start_building takes one), and the ones being built and by whom. Reads only.',
    inputSchema: { type: 'object', properties: {} },
    run: pressQueueTool },
  { name: 'start_building', description: 'Take a plan the person has sent to press (their final go), to build it: it is checked out to you (as ItsyBOT · <as>) so nobody else edits it meanwhile, and its refined slices are listed. Refused when it is not at the press, already being built, or checked out elsewhere. Then generate_specs, build, deploy, finish_building. Report each slice\'s step as you go with report_progress (started, red, green, pr, stuck): the person sees it live on the slice and on the plan\'s spine.',
    inputSchema: { type: 'object', properties: { plan: S, as: S, from_commit: S }, required: ['plan'] },
    run: startBuildingTool },
  { name: 'finish_building', description: 'The open plan you are building, back with its build: the newest edition of the app\'s build book (published by the deploy) is attached, the slices it sent to press that the build has go Done, and it is checked back in with a build summary for the person. Slices not Done yet keep their last reported step (report_progress) until the build has them. Post the build first (systemctl --user start eventpad-models.service): a build made before building started, or at the commit you started from, is refused. On a plan already checked in (open_model {edit:true} first), it attaches a newer build of its app if the library has one.',
    inputSchema: { type: 'object', properties: { as: S } },
    run: finishBuildingTool },
  { name: 'report_progress', edits: true, description: 'While you build a plan you took with start_building: say where a slice (S-number or title) has got to, so the person sees it live on the slice and on the plan\'s spine, before any build book exists. step: started (you begin it), red (its spec fails for the right reason), green (its scenarios pass; tests {passing, total}), pr (a pull request is open; pr: its number, url or {number, url}) or stuck (say what is in the way in note). Report each slice at each step, as you go. Refused, each in one line: the plan is not checked out to you (start_building first); no such slice; stuck without a note; pr without a number or url; tests passing more than total; a step back after green (or pr): only stuck, or started (a new round), may. A Done slice shows no progress (Done wins). Signed with your name (as: the name of this session, as in start_building).',
    inputSchema: { type: 'object', properties: { slice: S, step: { type: 'string', enum: ['started', 'red', 'green', 'pr', 'stuck'] }, note: S, pr: { type: ['number', 'string', 'object'] }, tests: { type: 'object', properties: { passing: { type: 'number' }, total: { type: 'number' } } }, as: S }, required: ['slice', 'step'] },
    run: reportProgressTool },
  { name: 'generate_specs', edits: true, description: 'Board to failing specs: write the open board\'s refined slices (not built yet) into an app\'s repo as Given/When/Then spec files, one per slice (chapter = feature, When = the exact command name, Then = the planned outcome), each beside a stub that throws NotBuiltYet. While a stub throws, its scenarios are pending ("not built yet"): CI and deploys aren\'t blocked, GWT_RUN_PENDING=1 runs them red. Spec files are generated-only: run it again after refined slices change and they are rewritten. A stub is written once: the builder writes the real slice there, and it is never overwritten. Recorded on the board. Then report each slice\'s step as you go with report_progress (started when you begin it, red once its spec fails for the right reason). language: js (itsybit-gwt), found from the repo when left out; dir: where the specs go (default tests/gwt).',
    inputSchema: { type: 'object', properties: { repo: S, app: S, language: S, dir: S }, required: ['repo'] },
    run: a => { notLiterature('specs'); return generateSpecsTool(a); } },
  { name: 'import_file', description: 'Bring a file in as a new local model and open it: a combined test export (-built.json, latest-built.json: built as ☰ → Import does, a snapshot with repo, commit and build), raw .test.json scenarios, an Event Book export with or without history (-plan.json, a board export), or a plan (docs/slices.json). Only files under the home folder. keep_model then puts it in the library.',
    inputSchema: { type: 'object', properties: { path: S }, required: ['path'] }, run: importFile },
  { name: 'keep_model', description: 'Keep the open model in the library on the server (like Keep on server on the phone), checked in so the person can open it, and get its book link (?book=): how to hand over a plan, since Refined ticks and comments then reach the library. Needs connect_library.',
    inputSchema: { type: 'object', properties: {} }, run: keepModel },
  { name: 'live_view', description: 'A page on this machine that shows the open model live as you build it (opens it in the browser unless open:false).',
    inputSchema: { type: 'object', properties: { open: { type: 'boolean' } } },
    run: ({ open = true }) => {
      if (!liveUrl) throw new Error('The live view could not start (no free port 7979-7999)');
      if (open) { try { (process.platform === 'darwin' ? spawn('open', [liveUrl], { detached: true, stdio: 'ignore' }) : process.platform === 'win32' ? spawn('cmd', ['/c', 'start', '', liveUrl], { detached: true, stdio: 'ignore' }) : spawn('xdg-open', [liveUrl], { detached: true, stdio: 'ignore' })).on('error', () => { /* just the link */ }).unref(); } catch (e) { /* just the link */ } }
      return `Live view: ${liveUrl}`;
    } },
  { name: 'share_link', description: 'For a book in the library: its book link (?book=), the book itself. Otherwise: upload a copy (as it stands, without history) and get a ?m= link, for someone outside the library; anything done in a copy stays on that device. To hand over a plan, use keep_model.',
    inputSchema: { type: 'object', properties: {} }, run: shareLink },
  { name: 'export_file', description: 'Save the open model as a file to import in Event Book (☰ → Import). Without history unless history:true.',
    inputSchema: { type: 'object', properties: { path: S, history: { type: 'boolean' } } },
    run: ({ path: p, history }) => `Saved ${exportFile(p, history)}` },
  { name: 'connect_library', description: 'Connect to the Event Book library on the server, as one of the devices on the account. First {email} (and {invite} the first time they join): a code goes to that email. Then {code} (the person reads it to you). The device token is kept in ~/.secrets/eventpad.env and never shown.',
    inputSchema: { type: 'object', properties: { email: S, code: S, invite: S, as: S } }, run: connectLibrary },
  { name: 'disconnect_library', description: 'Sign this machine out of the library (the device is removed on the server and its token from ~/.secrets/eventpad.env).',
    inputSchema: { type: 'object', properties: {} }, run: disconnectLibrary }
];

// ---------- JSON-RPC over stdio ----------

const send = msg => process.stdout.write(JSON.stringify(msg) + '\n');
const reply = (id, result) => send({ jsonrpc: '2.0', id, result });

async function handle(msg) {
  const { id, method, params } = msg;
  if (method === 'initialize') {
    return reply(id, { protocolVersion: params?.protocolVersion || '2025-06-18', capabilities: { tools: {} },
      serverInfo: { name: 'eventpad', version: '0.2.0' },
      instructions: 'Model in Event Book: outline to read the model, add_steps / add_scenarios to build it a chapter or a slice at a time, keep_model to hand it over (send the person the ?book= link it gives: their Refined ticks and comments then reach the library). share_link makes a copy, for people outside the library.' });
  }
  if (method === 'ping') return reply(id, {});
  if (method === 'tools/list') return reply(id, { tools: tools.map(({ run, edits, ...t }) => t) });
  if (method === 'tools/call') {
    const tool = tools.find(t => t.name === params?.name);
    if (!tool) return send({ jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown tool ${params?.name}` } });
    // The device token never goes out, in a reply or an error
    const clean = text => lib.scrub(text, token(), ...tokensSeen);
    const args = params.arguments || {};
    const wrong = lib.checkArgs(tool, args);
    if (wrong) return reply(id, { content: [{ type: 'text', text: wrong }], isError: true });
    clearTimeout(idleTimer);   // busy: not idle while a tool runs
    try {
      const text = String(await (tool.edits ? writeBack(() => tool.run(args), { talk: !!tool.talk }) : tool.run(args)));
      persist();
      return reply(id, { content: [{ type: 'text', text: clean(text) }] });
    } catch (e) {
      persist();
      return reply(id, { content: [{ type: 'text', text: clean(e.message) }], isError: true });
    } finally { touch(); }
  }
  if (id !== undefined && !method?.startsWith('notifications/')) send({ jsonrpc: '2.0', id, error: { code: -32601, message: `No method ${method}` } });
}

// What starting up wrote (the first book's place in the index) is saved now, while the file is still as read:
// kept unsaved, it would win over what other sessions save meanwhile
if (dirty.size) persist();

// The session ended (stdin closed): check in what it holds, then stop
const input = readline.createInterface({ input: process.stdin });
input.on('close', leave);
input.on('line', line => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch (e) { return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
  handle(msg).catch(e => send({ jsonrpc: '2.0', id: msg.id ?? null, error: { code: -32603, message: e.message } }));
});
