// ===========================================
// SHARE LINKS - The sheets' controller: ☰ → Share links (the links you made: copy, rename, remove, each asked inside
// the sheet), and the Name field the share sheet gets when you make a copy link. It composes the parts, each drawn from
// its own view, and reads no book itself.
// ===========================================

import { showSheet, hideAllSheets } from '../../ui/sheets.js';
import { showToast } from '../../ui/toast.js';
import { account } from '../sync/client.js';
import { shareSourceEvents } from '../shareImage/sheet.js';
import { getEventStream } from '../../core/eventStore.js';
import { yourShareLinks } from './yourShareLinks.read.js';
import { shareLinkName, sharedBookName } from './shareLinkName.read.js';
import { adminLinkRemoval as adminLinkRemovalView } from './adminLinkRemoval.read.js';
import { shareLinkNameField, shareLinksList, adminLinkRemoval } from './shareLinks.parts.js';
import { fetchMine, renameShare, removeShare, shareIdOf, linkBase } from './client.js';

let state = { rows: [], removed: [], ui: {}, loading: false, failed: false, open: false };

const content = () => document.getElementById('boardSheetContent');   // the board sheet: content filled per interaction

function draw() {
  const view = yourShareLinks({ rows: state.rows, removed: state.removed, base: linkBase(), ui: state.ui });
  content().innerHTML = shareLinksList(view, state) + adminLinkRemoval(adminLinkRemovalView(account()));
  showSheet('boardSheet');
  content().querySelector('[data-share-link-name]')?.focus();
}

async function load() {
  state = { ...state, loading: true, failed: false };
  draw();
  try { state = { ...state, rows: await fetchMine(), loading: false }; } catch (e) { state = { ...state, loading: false, failed: true }; }
  if (state.open) draw();
}

export function openShareLinks() {
  state = { rows: [], removed: [], ui: {}, loading: true, failed: false, open: true };
  load();
}

async function act(button) {
  const action = button.dataset.shareLinkAction, id = button.dataset.shareId;
  const fail = e => showToast(e?.message || 'Something went wrong: try again');
  if (action === 'close') { state.open = false; hideAllSheets(); return; }
  if (action === 'copy') {
    try { await navigator.clipboard.writeText(button.dataset.link); showToast('Link copied'); } catch (e) { showToast('Couldn\'t copy: select the link and copy it'); }
    return;
  }
  if (action === 'rename') { state.ui = { renaming: id }; draw(); return; }
  if (action === 'remove') { state.ui = { confirming: id }; draw(); return; }
  if (action === 'cancel') { state.ui = {}; draw(); return; }
  if (action === 'rename-save') {
    const name = content().querySelector('[data-share-link-name]')?.value.trim();
    if (!name) { showToast('Give the link a name'); return; }
    try { await renameShare(id, name); state.rows = state.rows.map(r => (r.shareId === id ? { ...r, name } : r)); state.ui = {}; draw(); showToast('Renamed'); } catch (e) { fail(e); }
    return;
  }
  if (action === 'remove-confirm') {
    try { await removeShare(id); state.removed = [...state.removed, id]; state.ui = {}; draw(); showToast('Link removed'); } catch (e) { fail(e); }
    return;
  }
  if (action === 'admin-remove') {
    const field = content().querySelector('#shareLinkAdminPaste');
    const pasted = shareIdOf(field?.value);
    if (!pasted) { showToast('Paste a share link first'); return; }
    try { await removeShare(pasted); showToast('Link removed'); field.value = ''; } catch (e) { fail(e); }
  }
}

// The share sheet's Name field: filled each time the sheet opens, from the book being shared
function fillNameField() {
  const mount = document.getElementById('shareLinkNameMount');
  if (!mount) return;
  mount.innerHTML = shareLinkNameField(shareLinkName({ bookName: sharedBookName(shareSourceEvents() || getEventStream()) }));
}

// What the Name field says now (blank: the share service names it after the book and the day)
export const shareLinkNameNow = () => document.getElementById('shareLinkName')?.value.trim() || '';

export function initShareLinksSheet() {
  document.getElementById('shareLinksItem')?.addEventListener('click', () => { window.EventPad.toggleBurger(); openShareLinks(); });
  content()?.addEventListener('click', e => {
    const button = e.target.closest('[data-share-link-action]');
    if (button) act(button);
  });
  const share = document.getElementById('shareSheet');
  let was = false;
  if (share) new MutationObserver(() => {
    const now = share.classList.contains('active');
    if (now && !was) fillNameField();
    was = now;
  }).observe(share, { attributes: true, attributeFilter: ['class'] });
}
