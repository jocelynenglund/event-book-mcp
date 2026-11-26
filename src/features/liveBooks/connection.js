// ===========================================
// LIVE BOOKS - the connection to the server's hub (feature: live-books)
// While a kept book is open and the tab is visible, this device listens on /hubs/eventpad-books (the EventPad module's SignalR
// hub, beside its API). The hub never sends events, only that a book changed: {modelId, position, holder, kind}. A device pulls
// the new events through the ordinary sync (syncModel), so everything the sync already guards (ids, undo, holders) stays as it was.
// While connected the safety-net poll slows to every 5 minutes; when the connection is lost or can't be made, the poll is as it was.
// ===========================================

import { account, kept, isKept, isBuildShelf, isReviewerAccount, syncModel, serverIdOfModel, syncApiBase, onSyncChange, setPollOverride } from '../sync/client.js';
import { getCurrentModelId, onOpenModel } from '../../core/eventStore.js';

const SAFETY_POLL_MS = 5 * 60 * 1000;
const RETRY_MS = [30_000, 60_000, 120_000, 300_000];
const PULL_GAP_MS = 300;

// idle: nothing to listen to · live · reconnecting (connecting or finding its way back) · off (no connection: polling)
let link = 'idle';
export const liveLink = () => link;

const linkListeners = new Set();
export function onLiveLink(fn) { linkListeners.add(fn); }
function setLink(next) {
  if (next === link) return;
  link = next;
  linkListeners.forEach(fn => { try { fn(link); } catch (e) { /* a view's problem */ } });
}

// The hub for this host: the API's address with /hubs/eventpad-books in place of /api/eventpad
const hubUrl = () => syncApiBase().replace(/\/api\/eventpad\/?$/, '') + '/hubs/eventpad-books';

// A connection, made once the book needs it. The page may provide its own (window.__itsyLiveHub(url, accessToken): the tests'
// fake); otherwise SignalR, loaded when first needed (the build bundles it; unbundled development has no bare imports: polling).
async function makeConnection(url, accessToken) {
  const hook = globalThis.__itsyLiveHub;   // test hook
  if (typeof hook === 'function') return hook(url, accessToken);
  const { HubConnectionBuilder, LogLevel } = await import('@microsoft/signalr');
  return new HubConnectionBuilder()
    .withUrl(url, { accessTokenFactory: () => accessToken })
    .withAutomaticReconnect([0, 2000, 5000, 10_000, 30_000])
    .configureLogging(LogLevel.None)
    .build();
}

// Which book wants a connection: the open one, when signed in with an account that keeps books, the tab is visible, the
// bookshelves aren't showing, and it is a kept book that is edited (not a build book, which is only read)
function wanted() {
  if (!account() || isReviewerAccount() || document.visibilityState !== 'visible' || document.body.classList.contains('library-mode')) return null;
  const id = getCurrentModelId();
  return id && isKept(id) && !isBuildShelf(id) ? id : null;
}

let conn = null;        // the connection, once made
let joined = null;      // the local id of the book joined on it
let busy = null;        // the reconcile in progress
let again = false;      // something changed while it ran
let retryTimer = null, failures = 0;

export function reconcile() {
  if (busy) { again = true; return busy; }
  busy = run().catch(() => {}).finally(() => { busy = null; if (again) { again = false; reconcile(); } });
  return busy;
}

async function run() {
  const id = wanted();
  if (!id) return release();
  if (conn && joined === id) return;
  if (!conn && link === 'off' && retryTimer) return;   // waiting for the next try
  clearTimeout(retryTimer); retryTimer = null;

  if (!conn) {
    setLink('reconnecting');
    try {
      const made = await makeConnection(hubUrl(), account().token);
      made.on('bookChanged', onMessage);
      made.onreconnecting(() => { if (conn === made) setLink('reconnecting'); });
      made.onreconnected(() => { if (conn === made) { joined = null; reconcile(); } });
      made.onclose(() => { if (conn === made) lost(); });
      await made.start();
      conn = made;
    } catch (e) { return fail(); }
  }
  if (joined && joined !== id) { try { await conn.invoke('LeaveBook', serverIdOfModel(joined)); } catch (e) { /* the connection is going */ } joined = null; }
  if (wanted() !== id) return;   // closed or changed while connecting: the next reconcile settles it
  try { await conn.invoke('JoinBook', serverIdOfModel(id)); }
  catch (e) { return stopAndFail(); }
  joined = id;
  failures = 0;
  setLink('live');
  setPollOverride(() => SAFETY_POLL_MS);
  // What changed while there was no connection (a message missed on the way): one ordinary sync
  syncModel(id).catch(() => {});
}

// No connection: the poll is back to normal and another try comes later (30 s, growing to 5 min)
function fail() {
  conn = null; joined = null;
  setPollOverride(null);
  setLink('off');
  const wait = RETRY_MS[Math.min(failures++, RETRY_MS.length - 1)];
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => { retryTimer = null; reconcile(); }, wait);
}
function lost() { fail(); }
async function stopAndFail() {
  const was = conn;
  conn = null;   // so its closing is not counted as a second failure
  try { await was?.stop(); } catch (e) { /* gone already */ }
  fail();
}

// Nothing to listen to (signed out, tab hidden, bookshelves, a book not kept): leave the hub and close the connection
async function release() {
  clearTimeout(retryTimer); retryTimer = null; failures = 0;
  const was = conn;
  conn = null; joined = null;
  setPollOverride(null);
  setLink('idle');
  if (!was) return;
  try { await was.stop(); } catch (e) { /* gone already */ }
}

// ---------- A message: pull what is new ----------

let pending = null, pulling = false;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function onMessage(m) {
  const id = joined;
  if (!id || !m || m.modelId !== serverIdOfModel(id)) return;
  pending = m;
  pull();
}

// Beyond what this device has? Newer events, or a different holder. A message about a position already here (this device's own
// push, echoed back) and nothing new about the holder asks nothing of the server. Bursts are served one pull at a time.
async function pull() {
  if (pulling) return;
  pulling = true;
  try {
    for (let tries = 0; pending && tries < 6; tries++) {
      const m = pending;
      pending = null;
      const id = joined, k = id && kept()[id];
      if (!k) break;
      const holderNow = k.holder?.deviceName ?? null;
      const holderChanged = m.kind !== 'appended' && (m.holder ?? null) !== holderNow;
      if (!(m.position > k.position) && !holderChanged) continue;
      try { await syncModel(id, { force: true }); } catch (e) { break; }   // offline or refused: the poll is the net
      const after = kept()[id];
      if (after && m.position > after.position) pending = m;   // the server was still writing: once more
      await sleep(PULL_GAP_MS);
    }
  } finally { pulling = false; }
}

// ---------- Start ----------

let started = false;
export function startLiveBooks() {
  if (started) return;
  started = true;
  onOpenModel(() => reconcile());
  onSyncChange(() => reconcile());
  document.addEventListener('visibilitychange', () => reconcile());
  // The bookshelves open and close by a class on the body
  new MutationObserver(() => reconcile()).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  reconcile();
}
