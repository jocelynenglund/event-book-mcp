// ===========================================
// SYNC - Keep shelves on the server (docs/server-sync-plan.md)
// Sign in by email (invite only), then a shelf marked ☁ syncs its events: the ones
// the server lacks go up, the ones this device lacks come down, merged by id and
// time; an action undone on another device is dropped here too.
// Kept per device: the account (token), and per kept shelf its position and the ids
// the server already has.
// ===========================================

import { keptAfterKeep } from '../library/sections.js';
import { deviceLabel } from './deviceName.js';
import { readModelEvents, replaceModelEvents, listModels, getCurrentModelId, createModel, onAppend, onOpenModel, setEditGuard, setTypeGuard, deleteModel } from '../../core/eventStore.js';
import { EventTypes } from '../../core/constants.js';
import { isBuildBook } from '../buildVersions/rules.js';
import { packSnapshotsInBrowser, unpackSnapshotsInBrowser } from '../../core/packedSnapshot.js';

// Told when an edit was refused because the shelf isn't checked out here (the view offers to check out)
let onBlocked = () => {};
export function onEditBlocked(fn) { onBlocked = fn; }
let lastBlocked = 0;
function blocked(id) { if (Date.now() - lastBlocked > 1500) { lastBlocked = Date.now(); onBlocked(id); } }
import { projectState } from '../../core/projections.js';
import { commentEventTypes } from '../../core/constants.js';

const LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
let apiBase = LOCAL ? 'http://localhost:5199/api/eventpad'
  : 'https://labsapi-hmeva5cfhdfkejhz.westeurope-01.azurewebsites.net/api/eventpad';
export function setSyncApi(base) { apiBase = base; }   // tests
export const syncApiBase = () => apiBase;

const ACCOUNT_KEY = 'eventpad_account';      // { token, email, accountId, admin }
const KEPT_KEY = 'eventpad_kept';            // modelId → { serverId, position, synced: [event ids], holder }
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch (e) { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full: next time */ } };

export const account = () => read(ACCOUNT_KEY, null);
// Read often (every spine's foot, every sync step) and big (every synced event id): parsed
// again only when the stored text changes. Each look gets its own top-level copy: callers change entries and write them back
let keptSeen = { raw: undefined, value: {} };
export const kept = () => {
  let raw = null;
  try { raw = localStorage.getItem(KEPT_KEY); } catch (e) { /* none */ }
  if (raw !== keptSeen.raw) keptSeen = { raw, value: read(KEPT_KEY, {}) };
  return { ...keptSeen.value };
};
export const isKept = id => !!kept()[id];

// The comments written on this device that haven't reached the server yet (a library book, signed in); 0 otherwise
export function unsentComments(modelId) {
  const k = kept()[modelId];
  if (!account() || !k) return 0;
  const synced = new Set(k.synced);
  return readModelEvents(modelId).filter(e => e.type === 'CommentAdded' && !synced.has(e.id)).length;
}
// A build book is only read (and talked on): it is never checked out, a plan starts from it instead
export const isBuildShelf = id => isBuildBook(readModelEvents(id));
export const isReviewerAccount = () => account()?.kind === 'reviewer';
// The model's id on the server. Every device's first model is called 'default', so that
// one gets an id of its own when it's first kept; shelves downloaded keep the server's.
const serverIdOf = id => kept()[id]?.serverId || id;
const path = id => `/models/${encodeURIComponent(serverIdOf(id))}`;
export const serverIds = () => Object.entries(kept()).map(([id, k]) => k.serverId || id);

export class SyncError extends Error {
  constructor(status, body) { super(body?.error || `Server said ${status}`); this.status = status; this.body = body; }
}

// Every call to the server comes through here, so this is where a big ModelSnapshot is gzipped on
// the way up and unpacked on the way down (events arrive plain wherever they are stored or
// projected: sync, review links, shared books, build versions)
async function call(method, path, body) {
  const a = account();
  if (body?.events) body = { ...body, events: await packSnapshotsInBrowser(body.events) };
  let res;
  try {
    res = await fetch(apiBase + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(a?.token ? { Authorization: `Bearer ${a.token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (e) { throw new SyncError(0, { error: 'Offline: will try again' }); }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.status === 401 && a) { write(ACCOUNT_KEY, null); notify(); }   // signed out elsewhere
  if (!res.ok) throw new SyncError(res.status, data);
  if (Array.isArray(data?.events)) data.events = await unpackSnapshotsInBrowser(data.events);
  return data;
}

// The same calls for other features (review links): signed in when there's an account
export const api = call;
export const serverIdOfModel = id => serverIdOf(id);

// ---------- Signing in ----------

export const startSignIn = (email, invite) => call('POST', '/auth/start', { email, ...(invite ? { invite } : {}) });

export async function verifySignIn(email, code) {
  const deviceName = deviceLabel(navigator.userAgent);
  const r = await call('POST', '/auth/verify', { email, code, deviceName });
  // kind: 'member' (makes books) or 'reviewer' (invited to review books, none of its own)
  write(ACCOUNT_KEY, { token: r.token, email: r.email || email, accountId: r.accountId, admin: !!r.admin, kind: r.kind || 'member' });
  notify();
  return r;
}

export async function signOut() {
  try { await call('POST', '/auth/signout'); } catch (e) { /* signed out here either way */ }
  write(ACCOUNT_KEY, null);
  notify();
}

export const listDevices = () => call('GET', '/devices');
export const revokeDevice = id => call('DELETE', `/devices/${encodeURIComponent(id)}`);
export const createInvite = () => call('POST', '/invites');
export const serverLibrary = () => call('GET', '/library');

// ---------- Check out / check in ----------
// One device edits a kept shelf at a time. holder: { deviceId, deviceName, since, you } or
// null (checked in). A shelf kept on the server is read-only here unless it's checked out here.

// Agents signed in before they were ItsyBOT are still called "Claude on <host>": shown as ItsyBOT · <host>
export const agentDeviceName = name => String(name || '').replace(/^Claude(?:\s+on\s+(.+))?$/i, (m, host) => host ? `ItsyBOT · ${host}` : 'ItsyBOT');
export const holderOf = id => {
  const h = kept()[id]?.holder || null;
  return h?.deviceKind === 'agent' && h.deviceName ? { ...h, deviceName: agentDeviceName(h.deviceName) } : h;
};
export const canEdit = id => !account() || !isKept(id) || !!holderOf(id)?.you;
function setHolder(id, holder) {
  const k = kept();
  if (!k[id]) return;
  if ((k[id].holder?.deviceId || null) !== (holder?.deviceId || null)) refused.delete(id);
  k[id] = { ...k[id], holder: holder || null };
  write(KEPT_KEY, k);
}

export async function checkOut(modelId) {
  try {
    const r = await call('POST', `${path(modelId)}/checkout`);
    setHolder(modelId, r.holder);
  } catch (e) {
    if (e.status === 409 && e.body?.holder) setHolder(modelId, e.body.holder);
    notify();
    throw e;
  }
  notify();
  return syncModel(modelId, { force: true });   // the latest, now that it's yours
}

export async function checkIn(modelId) {
  await syncModel(modelId, { force: true });    // send the last changes first
  const r = await call('POST', `${path(modelId)}/checkin`);
  setHolder(modelId, r.holder);
  notify();
}

export async function takeOver(modelId) {
  const r = await call('POST', `${path(modelId)}/takeover`);
  setHolder(modelId, r.holder);
  notify();
  return syncModel(modelId, { force: true });
}

// Before changing a library book from its menu (rename): checked in, it's checked out here
// first; held by another device, it can't be. Resolves to null when it can be changed now,
// or the reason it can't.
export async function readyToChange(modelId) {
  if (canEdit(modelId)) return null;
  const h = holderOf(modelId);
  if (h && !h.you) return `Checked out on ${h.deviceName || 'another device'}: change it there, or take it over`;
  try { await checkOut(modelId); } catch (e) { return e.status === 409 ? `Checked out on ${e.body?.holder?.deviceName || 'another device'}` : `Couldn't check it out: ${e.message}`; }
  return null;
}

// A library book returned (taken off this device): whatever is only here goes up first, then it's
// checked in (if it was out here) and unlinked, so it shows as in the library, not on this
// device. Throws when the server can't be reached: deleting then would lose those changes.
export async function forgetHere(modelId) {
  if (!isKept(modelId)) return;
  if (holderOf(modelId)?.you) await checkIn(modelId);
  const k = kept();
  delete k[modelId];
  write(KEPT_KEY, k);
  delete status[modelId];
  notify();
}

// ---------- Shelves ----------

const status = {};            // modelId → 'syncing' | 'ok' | 'error: …'
export const shelfStatus = id => status[id] || (isKept(id) ? 'ok' : null);
const listeners = new Set();
export function onSyncChange(fn) { listeners.add(fn); }
// Events came down for a book: (modelId, count). The open screen redraws when it is the open book
const pulledListeners = new Set();
export function onPulled(fn) { pulledListeners.add(fn); }
function notify() { listeners.forEach(fn => { try { fn(); } catch (e) { /* a view's problem */ } }); }

export async function keepOnServer(modelId) {
  const serverId = modelId === 'default' ? 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) : modelId;
  // Keeping it checks it out here (the server does that on the first push): borrowed straight away
  write(KEPT_KEY, keptAfterKeep(kept(), modelId, serverId));
  notify();
  return syncModel(modelId, { force: true });
}

export async function stopKeeping(modelId) {
  const target = path(modelId);
  const k = kept();
  delete k[modelId];
  write(KEPT_KEY, k);
  delete status[modelId];
  notify();
  await call('DELETE', target);
}

// A shelf only on the server: fetch it onto this device (same id, so it stays in step)
// A second tap while it downloads, or a book already here, makes no second copy
const downloading = new Map();
export function download(modelId) {
  const here = Object.entries(kept()).find(([id, k]) => (k.serverId || id) === modelId && listModels().some(m => m.id === id));
  if (here) return Promise.resolve(here[0]);
  if (!downloading.has(modelId)) downloading.set(modelId, fetchShelf(modelId).finally(() => downloading.delete(modelId)));
  return downloading.get(modelId);
}
async function fetchShelf(modelId) {
  const r = await call('GET', `/models/${encodeURIComponent(modelId)}/events?after=0`);
  const events = dropUndone(r.events, r.undone);
  const localId = createModel(events, { id: modelId });
  const k = kept();
  k[localId] = { serverId: modelId, position: r.position, synced: r.events.map(e => e.id), holder: r.holder || null };
  write(KEPT_KEY, k);
  notify();
  return localId;
}

// Events in parts of at most ~800 KB of JSON (always at least one part, so an empty push still fetches)
function parts(events, max = 800_000) {
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

const byTime = (a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || ''));
const dropUndone = (events, undone = []) => { const u = new Set(undone); return events.filter(e => !u.has(e.batch)); };

// Up what the server lacks, down what this device lacks, then drop undone batches
const running = new Map();
// The brake: a book is asked of the server at most once per MIN_GAP_MS unless a person asked ({ force: true }: check in/out,
// send now, keep, take back, start-up, the tab coming back). Calls inside the gap share one trailing sync, so no loop
// elsewhere can flood the host (it once fetched a book's events dozens of times a second).
const MIN_GAP_MS = () => { try { return Number(localStorage.getItem('eventpad_sync_gap_ms')) || 5000; } catch (e) { return 5000; } };
const refused = new Set();      // modelIds the server answered 409 to: their unsent changes wait for a new holder
const lastRun = new Map();      // modelId → when its last sync started
const trailing = new Map();     // modelId → the one sync waiting for the gap to pass
export function syncModel(modelId, { force = false } = {}) {
  if (!account() || !isKept(modelId)) return Promise.resolve();
  if (running.has(modelId)) return running.get(modelId);
  if (!force) {
    const wait = (lastRun.get(modelId) || 0) + MIN_GAP_MS() - Date.now();
    if (wait > 0) {
      if (!trailing.has(modelId)) trailing.set(modelId, new Promise(resolve => setTimeout(() => { trailing.delete(modelId); resolve(syncModel(modelId)); }, wait)));
      return trailing.get(modelId);
    }
  }
  lastRun.set(modelId, Date.now());
  const job = (async () => {
    status[modelId] = 'syncing'; notify();
    try {
      await healLost(modelId);
      const k = kept()[modelId];
      const synced = new Set(k.synced);
      const local = readModelEvents(modelId);
      const fresh = local.filter(e => !synced.has(e.id));
      const name = projectState(local).modelName || null;
      // The server takes up to 1 MB a request: a big first upload goes in parts
      let r = null, after = k.position;
      const got = [];
      // Changes go up only from the device that has it checked out; anyone can fetch.
      // Comments are talk, not changes: they go up from any device
      // A book the server refused changes for (409) is not tried again until its holder changes or a person asks
      if (force) refused.delete(modelId);
      const mine = (!k.holder || k.holder.you) && !refused.has(modelId);
      const sendable = mine ? fresh : fresh.filter(e => commentEventTypes.has(e.type));
      let sentOk = true;
      for (const part of parts(sendable)) {
        try {
          r = await call('POST', `${path(modelId)}/events`, { after, events: part, ...(name ? { name } : {}) });
        } catch (e) {
          if (e.status !== 409) throw e;
          // Checked out elsewhere meanwhile: fetch instead; our changes stay here, unsent
          if (e.body?.holder !== undefined) setHolder(modelId, e.body.holder);
          refused.add(modelId);
          sentOk = false;
          r = await call('POST', `${path(modelId)}/events`, { after, events: [] });
        }
        got.push(...(r.events || []));
        after = r.position;
      }
      const have = new Set(local.map(e => e.id));
      const incoming = [...new Map(got.filter(e => !have.has(e.id)).map(e => [e.id, e])).values()];
      let merged = incoming.length ? [...local, ...incoming].sort(byTime) : local;
      merged = dropUndone(merged, r.undone);
      if (incoming.length || merged.length !== local.length) replaceModelEvents(modelId, merged);
      const now = kept();
      if (now[modelId]) {
        const sent = sentOk ? sendable.map(e => e.id) : [];
        now[modelId] = { ...now[modelId], serverId: k.serverId || modelId, position: r.position,
          synced: [...new Set([...k.synced, ...sent, ...incoming.map(e => e.id)])],
          ...(r.holder !== undefined ? { holder: r.holder } : {}) };
        write(KEPT_KEY, now);
      }
      status[modelId] = 'ok';
      if (incoming.length) pulledListeners.forEach(fn => { try { fn(modelId, incoming.length); } catch (e) { /* a view's problem */ } });
      return { up: fresh.length, down: incoming.length };
    } catch (e) {
      status[modelId] = `error: ${e.message}`;
      throw e;
    } finally {
      running.delete(modelId);
      notify();
    }
  })();
  running.set(modelId, job);
  return job;
}

// Events this device synced once but no longer has (a save that didn't stick: Safari can lose
// its IndexedDB connection, and the book came back empty) come down again from the start,
// with anything not sent yet kept. Otherwise the book looks synced and stays empty for good.
async function healLost(modelId) {
  const k = kept()[modelId];
  const local = readModelEvents(modelId);
  const have = new Set(local.map(e => e.id));
  if (!k?.synced?.some(id => !have.has(id))) return;
  const r = await call('GET', `${path(modelId)}/events?after=0`);
  const synced = new Set(k.synced);
  const unsent = local.filter(e => !synced.has(e.id));
  const fromServer = r.events.filter(e => !unsent.some(u => u.id === e.id));
  const merged = dropUndone([...fromServer, ...unsent].sort(byTime), r.undone);
  replaceModelEvents(modelId, merged);
  const now = kept();
  if (now[modelId]) {
    // What's here now came from the server, but for the unsent: that's what's synced
    now[modelId] = { ...now[modelId], position: r.position, synced: merged.filter(e => !unsent.includes(e)).map(e => e.id) };
    write(KEPT_KEY, now);
  }
}

// What the save chip needs to know of a book (read from what's here: no request): signed in, kept, how its last sync
// ended, how many changes still wait to go up (those this device may send), whether the server refused them (409)
export function saveFacts(id) {
  const k = kept()[id];
  let unsent = 0;
  if (account() && k) {
    const synced = new Set(k.synced);
    const mine = (!k.holder || k.holder.you) && !refused.has(id);
    unsent = readModelEvents(id).filter(e => !synced.has(e.id) && (mine || commentEventTypes.has(e.type))).length;
  }
  return { signedIn: !!account(), reviewer: isReviewerAccount(), kept: !!k, build: isBuildShelf(id),
    status: status[id] || null, unsent, parked: refused.has(id), backoffMs: syncBackoff() };
}

let allRunning = null, lastAll = 0;
// THE REQUEST BUDGET, in one place. The shared host (event-store-api Program.cs, GlobalLimiter) allows 60 requests per 10 s
// per client IP, a fixed window with no queue; CORS preflights (OPTIONS) count too, and its 429 carries no CORS headers (the
// browser reports it as status 0) and no Retry-After. Every call here costs 2 requests (preflight + POST), so a batch of book
// syncs runs at most 2 in flight and starts at most 2 a second (~4 requests/s, ~40 per 10 s with room for the person's own
// calls). A 429 or status 0 backs the whole batch off for at least the 10 s window (doubling to 2 min); then it resumes slowly.
const BUDGET = {
  parallel: 2,
  startGapMs: 500,          // between starts of book syncs in a batch: 2 a second at most
  backoffFirstMs: 10_000,   // the host's window
  backoffMaxMs: 120_000
};
const BATCH_START_GAP_MS = () => { try { return Number(localStorage.getItem('eventpad_batch_gap_ms')) || BUDGET.startGapMs; } catch (e) { return BUDGET.startGapMs; } };
const BACKOFF_FIRST_MS = () => { try { return Number(localStorage.getItem('eventpad_backoff_ms')) || BUDGET.backoffFirstMs; } catch (e) { return BUDGET.backoffFirstMs; } };
let backoffMs = 0, backoffUntil = 0, backoffTimer = null;
const overloaded = e => e instanceof SyncError && (e.status === 429 || e.status === 0);
function backOff() {
  backoffMs = backoffMs ? Math.min(backoffMs * 2, BUDGET.backoffMaxMs) : BACKOFF_FIRST_MS();
  backoffUntil = Date.now() + backoffMs;
  clearTimeout(backoffTimer);
  backoffTimer = setTimeout(() => { backoffTimer = null; syncAll({ force: true }).catch(() => {}); }, backoffMs);
}
export const syncBackoff = () => backoffUntil > Date.now() ? backoffUntil - Date.now() : 0;

export function syncAll({ force = false } = {}) {
  // Never re-enters itself: a call while one runs shares it, and one more than once per gap is skipped (a person's Sync is not)
  if (allRunning) return allRunning;
  if (!force && Date.now() - lastAll < MIN_GAP_MS()) return Promise.resolve();
  if (!force && syncBackoff() > 0) return Promise.resolve();   // waiting out a 429: the retry timer is set
  lastAll = Date.now();
  return allRunning = syncEverything().finally(() => { allRunning = null; });
}

// Does this kept book need a request? Its position differs from the server's count (the same unit: events stored), it has
// changes or comments not sent yet, events it synced are missing here, or its holder changed (checked by the caller).
function needsSync(id, row) {
  const k = kept()[id];
  if (!k) return false;
  if (!row) return !(k.position > 0) && !k.synced?.length;   // kept here, not on the server yet: it goes up (one the server let go of was unlinked already)
  if (row.count !== k.position) return true;
  const synced = new Set(k.synced || []);
  const local = readModelEvents(id);
  const mine = (!k.holder || k.holder.you) && !refused.has(id);
  if (local.some(e => !synced.has(e.id) && (mine || commentEventTypes.has(e.type)))) return true;
  const have = new Set(local.map(e => e.id));
  return (k.synced || []).some(sid => !have.has(sid));
}
const holderKey = h => h ? `${h.deviceId || ''}|${!!h.you}` : '';

async function syncEverything() {
  if (!account()) return;
  const changed = new Set();
  let rows;
  // Who holds what, and how far each book is, from the library listing: asked once
  try {
    rows = await serverLibrary();
    const byServerId = new Map(rows.map(r => [r.modelId, r]));
    const gone = [];
    Object.entries(kept()).forEach(([id, k]) => {
      const sid = k.serverId || id;
      const row = byServerId.get(sid);
      if (row) {
        if (holderKey(k.holder) !== holderKey(row.holder)) changed.add(id);
        setHolder(id, row.holder || null);
      }
      // Let go on the server (a replaced build book, released from another device): this copy
      // stays here as a private book, and nothing is pushed back, which would keep it again
      else if (k.position > 0 || k.synced?.length) gone.push(id);
    });
    const replaced = [];
    if (gone.length) {
      const links = kept();
      gone.forEach(id => {
        // A replaced build book with nothing unsent goes too: the new one is in the library
        const events = readModelEvents(id);
        if (isBuildBook(events) && events.every(e => links[id].synced?.includes(e.id))) {
          replaced.push([...events].reverse().find(e => e.type === 'ModelNamed')?.data?.name);
          deleteModel(id);
        }
        delete links[id];
      });
      write(KEPT_KEY, links);
    }
    notify();
    // …and its replacement comes down in its place, so the shelf keeps the book (the newer build)
    const here = new Set(Object.entries(kept()).map(([id, k]) => k.serverId || id));
    for (const name of replaced.filter(Boolean)) {
      const row = rows.find(r => r.name === name && !here.has(r.modelId));
      if (row) { try { await download(row.modelId); } catch (e) { /* it stays under "not on this device" */ } }
    }
  } catch (e) {
    // Offline or refused: the shelves say so, and the whole batch waits. Nothing is synced blind
    if (overloaded(e)) backOff();
    return;
  }
  const byServerId = new Map(rows.map(r => [r.modelId, r]));
  const queue = Object.keys(kept())
    .filter(id => listModels().some(m => m.id === id))
    .filter(id => changed.has(id) || needsSync(id, byServerId.get(kept()[id]?.serverId || id)));
  let stop = false, nextStart = 0;
  const worker = async () => {
    while (!stop && queue.length) {
      const id = queue.shift();
      const at = Math.max(Date.now(), nextStart);   // claimed before waiting, so the two workers keep the gap between them
      nextStart = at + BATCH_START_GAP_MS();
      if (at > Date.now()) await new Promise(r => setTimeout(r, at - Date.now()));
      if (stop) return;
      try { await syncModel(id, { force: true }); backoffMs = 0; }
      catch (e) { if (overloaded(e)) { stop = true; backOff(); } /* else shown on the shelf */ }
    }
  };
  await Promise.all(Array.from({ length: BUDGET.parallel }, worker));
}

// An action undone here that the server already has: undone on every device
export async function undoBatch(modelId, batch, poppedIds) {
  const k = kept()[modelId];
  if (!account() || !k || !batch || !poppedIds.some(id => k.synced.includes(id))) return;
  // Gone here on purpose: no longer counted as synced, so healLost doesn't bring them back
  const now = kept();
  if (now[modelId]) { now[modelId] = { ...now[modelId], synced: now[modelId].synced.filter(id => !poppedIds.includes(id)) }; write(KEPT_KEY, now); }
  try { await call('POST', `${path(modelId)}/undo`, { batchId: batch }); } catch (e) { status[modelId] = `error: ${e.message}`; notify(); }
}

// After a change: sync the open shelf a few seconds later; and when the tab comes back
let timer = null;
// A browser doesn't keep a book checked out for ever: in the background for a while (another
// device can then take it), it's sent and checked in; back again, if nobody took it meanwhile,
// it's checked out here again without a word. Closing the tab with nothing unsent checks it in too.
const AWAY_MS = () => { try { return Number(localStorage.getItem('eventpad_away_ms')) || 20 * 60 * 1000; } catch (e) { return 20 * 60 * 1000; } };
let awayTimer = null;
const returned = new Set();   // books checked in because this tab was away: taken back on return
const heldHere = () => Object.entries(kept()).filter(([, k]) => k.holder?.you).map(([id]) => id);

export async function checkInAway() {
  for (const id of heldHere()) {
    try { await checkIn(id); returned.add(id); } catch (e) { /* offline: it stays out, as before */ }
  }
}

async function takeBackReturned() {
  const ids = [...returned];
  returned.clear();
  for (const id of ids) {
    try { if (!holderOf(id)) await checkOut(id); } catch (e) { /* someone else has it now: read-only here */ }
  }
}

function checkInOnClose() {
  if (!account() || timer) return;   // changes still waiting to go up: leave it checked out
  const a = account();
  heldHere().forEach(id => {
    try {
      fetch(`${apiBase}${path(id)}/checkin`, { method: 'POST', keepalive: true, headers: { Authorization: `Bearer ${a.token}` } });
    } catch (e) { /* it'll be checked in by the away timer next time */ }
  });
}

// A book open here while another device holds it (the agent writing, say): it was only fetched at start-up
// and when the tab came back, so it showed the copy from then. Now it is fetched when opened, and while it
// stays open (visible tab, shelves closed) every 30 s: only the events after its position come down, and
// nothing at all is asked while this device holds it or the book isn't kept.
const POLL_MS = () => { try { return Number(localStorage.getItem('eventpad_poll_ms')) || 30_000; } catch (e) { return 30_000; } };
let lastPoll = 0;
function pollHeldElsewhere() {
  const id = getCurrentModelId();
  if (!account() || !isKept(id) || document.visibilityState !== 'visible' || document.body.classList.contains('library-mode')) return;
  const holder = holderOf(id);
  if (!holder || holder.you || Date.now() - lastPoll < POLL_MS()) return;
  lastPoll = Date.now();
  syncModel(id).catch(() => {});
}

let inited = false;
export function initSync() {
  if (inited) return;   // a second call would double every listener
  inited = true;
  onOpenModel(id => { if (account() && isKept(id)) { lastPoll = Date.now(); syncModel(id).catch(() => {}); } });
  setInterval(pollHeldElsewhere, 1000);
  // A shelf kept on the server changes only where it's checked out
  setEditGuard(id => canEdit(id), id => blocked(id));
  // A build book is never checked out, yet its reader may lay its chapters out: arranging goes onto it wherever it is kept
  const arranging = new Set([EventTypes.ChaptersArranged, EventTypes.PartStarted, EventTypes.PartRenamed, EventTypes.PartRemoved]);
  setTypeGuard((id, type) => arranging.has(type) && isKept(id) && isBuildShelf(id) ? true : null);
  onAppend(event => {
    const id = getCurrentModelId();
    if (!isKept(id) || !account() || (!canEdit(id) && !commentEventTypes.has(event?.type))) return;
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; syncModel(id).catch(() => {}); }, 3000);
  });
  document.addEventListener('visibilitychange', () => {
    clearTimeout(awayTimer);
    if (document.visibilityState === 'visible') syncAll().then(takeBackReturned, takeBackReturned);
    else if (account()) awayTimer = setTimeout(() => { if (document.visibilityState !== 'visible') checkInAway(); }, AWAY_MS());
  });
  window.addEventListener('pagehide', checkInOnClose);
  syncAll();
}
