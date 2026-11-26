// ===========================================
// SHARE LINK - Upload the model, get a short link; open a shared link
// Backend: the `eventpad` module in the event-store-api host (this repo, api/).
// No build step, so the base URL branches on hostname like the other apps.
// ===========================================

import { beginBrowse, endBrowse, isBrowsing } from '../linkLoading/shareBrowse.js';
import { getEventStream, createModel, openModel, listModels, getCurrentModelId, setModelStartIn, previewEvents, endPreview } from '../../core/eventStore.js';
import { projectState } from '../../core/projections.js';
import { snapshotOf } from '../snapshot/command.js';
import { shareLinkSnapshot } from './read.js';
import { showSheet, hideAllSheets } from '../../ui/sheets.js';
import { showToast } from '../../ui/toast.js';
import { escapeHtml } from '../board/view.js';
import { drawLinkLoader, closeLinkLoader, initLinkLoader } from '../linkLoading/loader.js';
import { linkProblem } from '../linkLoading/linkLoadingState.read.js';
import { shareSourceEvents, shareSourceId, shareScopeNow, shareOpenOnPad } from '../shareImage/sheet.js';
import { initShareLinksSheet, shareLinkNameNow, shareHeaders, rememberKey, answerOf, openedShare } from '../shareLinks/index.js'; // feature: share-links

// The eventpad module is live on the shared host (event-store-api PR #201);
// flip to false to hide Copy link if it ever has to come down
const LINKS_LIVE = true;

const LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
export const API_BASE = LOCAL
  ? 'http://localhost:5199/api/eventpad'
  : 'https://labsapi-hmeva5cfhdfkejhz.westeurope-01.azurewebsites.net/api/eventpad';

// Shared links already added on this device, and links made here: share id → model id.
// Opening one of these opens that model rather than adding a frozen copy of it.
const IMPORTS_KEY = 'eventpad_shared_imports';
const readImports = () => { try { return JSON.parse(localStorage.getItem(IMPORTS_KEY) || '{}'); } catch (e) { return {}; } };

// onPad: the link opens the Pad (view=pad), not the outline
export function shareUrl(id, onPad = false) {
  return `${location.origin}${location.pathname}?m=${encodeURIComponent(id)}${onPad ? '&view=pad' : ''}`;
}

// A share link holds up to 1 MB. A bigger model goes up gzipped, as one string in
// the events list ("gz:<base64>"): the server keeps events opaque, so it needs no change.
const PACK_OVER = 900_000;
export class ShareTooBigError extends Error {}

async function gzipBase64(text) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function gunzipBase64(b64) {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

export async function packEvents(events) {
  const json = JSON.stringify(events);
  if (json.length < PACK_OVER || typeof CompressionStream === 'undefined') return events;
  return ['gz:' + await gzipBase64(json)];
}

export async function unpackEvents(events) {
  if (Array.isArray(events) && events.length === 1 && typeof events[0] === 'string' && events[0].startsWith('gz:')) {
    return JSON.parse(await gunzipBase64(events[0].slice(3)));
  }
  return events;
}

// The share service keeps a name and a description of up to 500 characters each: a longer
// one goes up shortened (the model itself is all there)
export const SHARE_TEXT_MAX = 500;
export const shareText = t => (t && t.length > SHARE_TEXT_MAX ? t.slice(0, SHARE_TEXT_MAX - 1).trimEnd() + '…' : t);
export class ShareRefusedError extends Error {}

// Upload the open model; resolves to its link
// events: a particular model's (a shelf's, modelId); otherwise the share sheet's, or the open one
export async function createShareLink(given = null, modelId = null) {
  const events = given || shareSourceEvents() || getEventStream();
  const from = modelId || shareSourceId() || getCurrentModelId();
  // The sheet's scope (the chapters picked); a shelf's book from the library goes whole
  const onPad = !given && shareOpenOnPad();
  const book = shareLinkSnapshot(projectState(events), given ? null : shareScopeNow(), { keepPad: onPad });
  const res = await fetch(`${API_BASE}/shares`, {
    method: 'POST',
    headers: shareHeaders({ json: true }),   // feature: share-links (the account owns it; signed out, a delete key comes back)
    // Whoever opens the link needs the model, not the history of building it
    body: JSON.stringify({ name: given ? '' : shareLinkNameNow(), bookName: shareText(book.name), bookId: from, description: shareText(book.description), events: await packEvents(snapshotOf(book.state, events.length)) })   // feature: share-links: the link's name
  });
  if (res.status === 413) throw new ShareTooBigError('Too big for a share link');
  // Refused for a reason the server gives: say it
  if (res.status === 400) throw new ShareRefusedError((await res.json().catch(() => null))?.error || 'The share service refused it');
  if (!res.ok) throw new Error(`Share failed (${res.status})`);
  const { id, deleteKey } = await res.json();
  rememberKey(id, deleteKey);   // feature: share-links
  const imports = readImports();
  imports[id] = from;
  localStorage.setItem(IMPORTS_KEY, JSON.stringify(imports));
  return shareUrl(id, onPad);
}

// What to say when a link couldn't be made
export function linkError(e) {
  return e instanceof ShareTooBigError
    ? 'This model is too big for a share link: share the picture, or ☰ → Export the file'
    : e instanceof ShareRefusedError ? `Couldn't make a link: ${e.message}`
    : "Couldn't make a link — try again";
}

// From the share sheet: make the link, copy it, offer the phone's share sheet
// Copy that says whether it worked: the clipboard API, else the old
// select-and-copy on the visible field (some phones block the API)
async function copyText(url, field) {
  try { await navigator.clipboard.writeText(url); return true; } catch (e) { /* fall back */ }
  if (!field) return false;
  field.focus();
  field.select();
  field.setSelectionRange(0, url.length);
  try { return document.execCommand('copy'); } catch (e) { return false; }
}

// From the share sheet: make the link and show it, so you can see it worked
export async function copyShareLink(button) {
  const label = button.textContent;
  button.disabled = true;
  button.textContent = 'Making link…';
  try {
    const url = await createShareLink();
    const box = document.getElementById('shareLinkResult');
    box.innerHTML = `
      <input class="sheet-input sl-url" id="shareLinkUrl" readonly value="${escapeHtml(url)}">
      <div class="sl-actions">
        <button class="sheet-btn secondary" id="shareLinkCopy">Copy</button>
        ${navigator.share ? `<button class="sheet-btn secondary" id="shareLinkShare">Share…</button>` : ''}
      </div>
      <div class="sl-note">Anyone with the link can see this model and add a copy to their bookshelves.</div>`;
    box.hidden = false;
    const field = document.getElementById('shareLinkUrl');
    showToast(await copyText(url, field) ? 'Link copied' : 'Link ready — tap Copy');
    document.getElementById('shareLinkCopy').onclick = async () =>
      showToast(await copyText(url, field) ? 'Link copied' : 'Select the link and copy it');
    const share = document.getElementById('shareLinkShare');
    if (share) share.onclick = () =>
      navigator.share({ url, title: projectState().modelName || 'Event model' }).catch(() => { /* dismissed */ });
  } catch (e) {
    showToast(linkError(e));
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}

let pending = null; // { id, name, description, events } of the link being opened

// ?m=<id> in the address: while it loads, a book turning its pages covers the screen (index.html draws it on the
// first paint); then the shared book itself shows behind a card offering to add it to the bookshelves
export async function openSharedLinkFromUrl() {
  const params = new URLSearchParams(location.search);
  const id = params.get('m');
  if (!id) return;
  // view=pad: the link lands on the Pad. Drop the parameters so a reload doesn't ask again
  const onPad = params.get('view') === 'pad', land = () => (onPad ? window.EventPad.showPad() : window.EventPad.showOutline());
  params.delete('m');
  params.delete('view');
  history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : '') + location.hash);

  const known = readImports()[id];
  if (known && listModels().some(m => m.id === known)) {
    openModel(known);
    land();
    closeLinkLoader();
    showToast('Opened from your bookshelves');
    return;
  }

  let shared;
  try {
    const res = await fetch(`${API_BASE}/shares/${encodeURIComponent(id)}`);
    const opened = openedShare(id, await answerOf(res));   // feature: share-links: a removed link says so
    if (opened.state === 'removed') { drawLinkLoader({ kind: 'share', removed: opened.message }); return; }   // feature: share-links
    if (!res.ok) throw Object.assign(new Error(String(res.status)), { status: res.status });
    shared = await res.json();
    drawLinkLoader({ kind: 'share', name: shared.name });
    shared.events = await unpackEvents(shared.events);
  } catch (e) {
    drawLinkLoader({ kind: 'share', problem: linkProblem('share', shared ? { unreadable: true } : e) });
    return;
  }
  pending = { ...shared, onPad };
  // The shared book itself is what shows behind the card: a look, read only, nothing of it saved, none of yours shown
  previewEvents(shared.events);
  land();
  closeLinkLoader();
  const content = document.getElementById('boardSheetContent');
  content.innerHTML = `
    <div class="sheet-title">${escapeHtml(shared.name || 'Shared model')} <span class="bd-sheet-sub sl-sub">shared with you</span></div>
    ${shared.description ? `<p class="sl-desc">${escapeHtml(shared.description)}</p>` : ''}
    <button class="sheet-btn" data-shared-action="add">Add to my bookshelves</button>
    <button class="sheet-btn secondary" data-shared-action="dismiss">Not now</button>`;
  showSheet('boardSheet');
}

// Not now (or the card closed some other way): the shared book stays open to look at, read only, under a banner that
// offers Add (src/features/linkLoading/shareBrowse.js). Nothing of it is saved.
function dismissPending() {
  if (!pending || isBrowsing()) return;
  hideAllSheets();
  beginBrowse({ name: pending.name, onAdd: addPending, onClose: closeBrowse, onLeave: () => { pending = null; endPreview(); } });
}

// ✕ on the banner: the look ends, and your own books are as they were
function closeBrowse() {
  endBrowse();
  pending = null;
  hideAllSheets();
  endPreview();
  window.EventPad.showLibrary();
}

function addPending() {
  if (!pending) return;
  endBrowse();
  endPreview();
  const modelId = createModel(pending.events || []);
  // A shared book opens as its outline (the board is a tap away), and starts there next time too
  setModelStartIn(modelId, 'outline');
  const onPad = pending.onPad;
  const imports = readImports();
  imports[pending.id] = modelId;
  localStorage.setItem(IMPORTS_KEY, JSON.stringify(imports));
  pending = null;
  hideAllSheets();
  onPad ? window.EventPad.showPad() : window.EventPad.showOutline();
  showToast('Added to your bookshelves');
}

export function initShareLink() {
  initLinkLoader({ toBookshelves: () => window.EventPad.showLibrary() });
  initShareLinksSheet();   // feature: share-links
  document.getElementById('boardSheetContent')?.addEventListener('click', e => {
    const t = e.target.closest('[data-shared-action]');
    if (!t) return;
    if (t.dataset.sharedAction === 'add') addPending();
    else dismissPending();
  });
  // Swiped or tapped away: the same as Not now
  const card = document.getElementById('boardSheet');
  if (card) new MutationObserver(() => { if (pending && !isBrowsing() && !card.classList.contains('active')) dismissPending(); }).observe(card, { attributes: true, attributeFilter: ['class'] });
  const linkBtn = document.getElementById('shareLinkBtn');
  if (linkBtn) {
    linkBtn.style.display = LINKS_LIVE || LOCAL ? '' : 'none';
    linkBtn.addEventListener('click', e => copyShareLink(e.currentTarget));
  }
  openSharedLinkFromUrl();
}
