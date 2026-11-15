// The MCP server's rules for the library on the server, as plain functions (no files, no
// network): the device token's line in ~/.secrets/eventpad.env, the shelves listed next to
// the local models, and the agent on loan: a shelf opened for editing is checked out to the
// agent, which holds it until it closes it, goes idle, exits or the phone takes it back.
// Scenarios: tests/gwt/agent-tools.test.mjs (chapter "Agent tools").

export const TOKEN_KEY = 'EVENTPAD_DEVICE_TOKEN';
export const DISCONNECTED = 'disconnected — connect_library again';
export const CHANGED = 'changed on your phone — reopen it';
export const READ_ONLY = 'opened read-only — open_model {edit:true} to edit';
export const CHECKED_IN = 'checked in — open_model {edit:true} to edit again';
export const heldElsewhere = h => `checked out on ${h?.deviceName || 'another device'} — check it in on the phone first`;
export const takenBack = h => `taken back on ${h?.deviceName || 'another device'} — reopen it to read`;

// The agent signs in as an agent: the server records its kind, the phone shows it as one
export const DEVICE_KIND = 'agent';
// 15 minutes without a tool call and the agent checks in what it holds
export const IDLE_MS = 15 * 60 * 1000;

const isTokenLine = line => new RegExp(`^\\s*(export\\s+)?${TOKEN_KEY}\\s*=`).test(line);
const lines = text => (text ? text.replace(/\n$/, '').split('\n') : []);
const join = list => (list.length ? list.join('\n') + '\n' : '');

// The token in a secrets file's text, or null
export function readToken(text) {
  const line = lines(text).find(isTokenLine);
  if (!line) return null;
  const value = line.slice(line.indexOf('=') + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
  return value || null;
}

// The file's text with the token line set (replaced where it was, else added); other lines kept
export function withToken(text, token) {
  const list = lines(text);
  const at = list.findIndex(isTokenLine);
  const line = `${TOKEN_KEY}=${token}`;
  const out = list.flatMap((l, i) => (i === at ? [line] : isTokenLine(l) ? [] : [l]));
  if (at < 0) out.push(line);
  return join(out);
}

// The file's text without the token line
export const withoutToken = text => join(lines(text).filter(l => !isTokenLine(l)));

// Text with every token in it blanked out
export function scrub(text, ...tokens) {
  let out = String(text ?? '');
  tokens.filter(t => t && String(t).length >= 4).forEach(t => { out = out.split(String(t)).join('[token]'); });
  return out;
}

// An agent signs as ItsyBOT, with its session's name when it has one: the tool's `as`, else
// EVENTPAD_AGENT_NAME (the MCP can't see Claude Code's session name), else plain "ItsyBOT"
export const agentName = (as = null, env = process.env) => {
  const n = String(as || env.EVENTPAD_AGENT_NAME || '').trim().slice(0, 40);
  return n ? `ItsyBOT · ${n}` : 'ItsyBOT';
};
// The device an agent connects as (its loans read "On loan to ItsyBOT · Harry")
export const deviceName = (as = null, env = process.env) => agentName(as, env);

// POST /auth/verify's body
export const verifyBody = (email, code, as = null, env = process.env) => ({ email, code: String(code).trim(), deviceName: deviceName(as, env), deviceKind: DEVICE_KIND });

// The idle time: EVENTPAD_IDLE_MS when it's a positive number (tests), else 15 minutes
export function idleMs(env = {}) {
  const n = Number(env.EVENTPAD_IDLE_MS);
  return Number.isFinite(n) && n > 0 ? n : IDLE_MS;
}

// What the server said no with
export const serverError = (status, body) => (body && typeof body.error === 'string' && body.error) || `Server said ${status}`;

// This device among her devices (GET /devices)
export const ownDevice = devices => (devices || []).find(d => d.current)?.deviceId || null;

// "cloud:<modelId>": a shelf that's on the server only
// "cloud:<id>", or a book link she pasted ("https://eventbook.itsybit.se/?book=<id>", or the old eventpad.itsybit.se)
export function parseCloudId(ref) {
  const text = String(ref || '').trim();
  const m = /^cloud:([A-Za-z0-9_-]{1,40})$/.exec(text) || /[?&]book=([A-Za-z0-9_-]{1,40})(?:[&#]|$)/.exec(text);
  return m ? m[1] : null;
}

// A shelf's events without the actions undone on any device
// Events in parts of at most ~800 KB of JSON (always at least one part): the server takes 1 MB a request
export function parts(events, max = 800_000) {
  const out = [[]];
  let size = 0;
  for (const e of events) {
    const n = JSON.stringify(e).length + 1;
    if (size + n > max && out[out.length - 1].length) { out.push([]); size = 0; }
    out[out.length - 1].push(e);
    size += n;
  }
  return out;
}

export const dropUndone = (events, undone = []) => { const u = new Set(undone || []); return (events || []).filter(e => !u.has(e.batch)); };

// open_model on a shelf whose holder (from the server) is holder: plain, it only reads;
// with edit it's checked out to the agent (or kept, when it holds it already). Held by
// another device: refused, no takeover.
export function decideOpen(holder, edit) {
  if (!edit) return { mode: 'read' };
  if (holder && !holder.you) return { refuse: heldElsewhere(holder) };
  return { mode: 'edit', checkout: !holder };
}

// May an edit go up to a shelf pulled at link {position, undone, holding}, the server now
// saying {position, events (since that position), undone, holder}? Only while the agent
// holds it: opened read-only, refused; taken back (or checked in meanwhile), refused and
// let go (release); changed since, refused. No silent merge, no takeover.
export function decideWrite(link, server) {
  if (!link.holding) return { refuse: READ_ONLY };
  const h = server.holder;
  if (!h || !h.you) return { refuse: h ? takenBack(h) : CHECKED_IN, release: true };
  const seen = new Set(link.undone || []);
  if ((server.events || []).length || (server.undone || []).some(b => !seen.has(b))) return { refuse: CHANGED };
  return { push: true };
}

// The push was refused (409) with holder: the phone took it in between the check and the push
export const afterConflict = holder => ({ refuse: holder && !holder.you ? takenBack(holder) : CHECKED_IN, release: true });

// close_model: send what's pending (events made here not yet on the server), then check in
export function decideClose(link, pending) {
  if (!link) return { nothing: 'not a shelf from the library: nothing to check in' };
  if (!link.holding) return { nothing: 'opened read-only: nothing to check in' };
  return { push: pending > 0, checkin: true };
}

// The shelves (local ids) to check in by themselves: all it holds, once idle for ms
export function idleCheckIns(links, lastCallAt, now, ms) {
  if (now - lastCallAt < ms) return [];
  return Object.entries(links || {}).filter(([, l]) => l?.holding).map(([id]) => id);
}

const when = iso => String(iso || '').slice(0, 16).replace('T', ' ');
const holderNote = h => (!h ? '' : h.you ? ', checked out to you' : `, checked out on ${h.deviceName || 'another device'}`);

// list_models: the local models (linked ones marked ☁), then the server shelves not here yet.
// local: [{id, name, slices, open, serverId?}]; cloud: GET /library rows, or null when not connected
export function libraryLines(local, cloud) {
  const rows = new Map((cloud || []).map(r => [r.modelId, r]));
  const out = local.map(m => {
    const row = m.serverId ? rows.get(m.serverId) : null;
    return `${m.open ? '* ' : '  '}${m.serverId ? '☁ ' : ''}${m.name || 'Untitled model'}${m.tags?.length ? ` [${m.tags.join(', ')}]` : ''} (${m.slices} slices${holderNote(row?.holder)}) id=${m.id}`;
  });
  const linked = new Set(local.map(m => m.serverId).filter(Boolean));
  (cloud || []).filter(r => !linked.has(r.modelId)).forEach(r =>
    out.push(`  ☁ ${r.name || 'Untitled model'} (${r.count} events, changed ${when(r.updatedAt)}${holderNote(r.holder)}) id=cloud:${r.modelId}`));
  return out.join('\n');
}

// null when every argument is one the tool takes; else why not
export function checkArgs(tool, args) {
  const allowed = Object.keys(tool.inputSchema?.properties || {});
  const extra = Object.keys(args || {}).find(k => !allowed.includes(k));
  if (extra === undefined) return null;
  return `${tool.name} has no argument "${extra}" (it takes: ${allowed.length ? allowed.join(', ') : 'none'})`.replace('takes: none', 'takes none');
}

