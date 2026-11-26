// ===========================================
// SHARE LINKS - The share service's calls for naming, listing and removing links, and the delete keys this device holds.
// Signed in, the account owns a link. Signed out, the service gives a random delete key once: it is kept here per share id
// (localStorage) and is the only way to rename or remove that link. Only the key's hash is kept on the server.
// ===========================================

import { API_BASE, shareUrl } from '../shareLink/link.js';
import { account } from '../sync/client.js';

const KEYS = 'eventpad_share_keys';   // share id → delete key

export const heldKeys = () => { try { return JSON.parse(localStorage.getItem(KEYS) || '{}'); } catch (e) { return {}; } };
const setKeys = keys => { try { localStorage.setItem(KEYS, JSON.stringify(keys)); } catch (e) { /* storage full: the link stays, it just can't be removed from here */ } };

export function rememberKey(id, key) { if (key) setKeys({ ...heldKeys(), [id]: key }); }
export function forgetKey(id) { const keys = heldKeys(); delete keys[id]; setKeys(keys); }

// Who is asking: the signed-in account, and the delete key of this link (or all of them, to list)
export function shareHeaders({ id = null, all = false, json = false } = {}) {
  const who = account(), keys = heldKeys();
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(who?.token ? { Authorization: `Bearer ${who.token}` } : {}),
    ...(id && keys[id] ? { 'X-Share-Key': keys[id] } : {}),
    ...(all && Object.keys(keys).length ? { 'X-Share-Keys': Object.values(keys).join(',') } : {})
  };
}

export class ShareCallError extends Error { constructor(message, status) { super(message); this.status = status; } }

async function check(res, what) {
  if (res.ok) return res;
  const said = (await res.json().catch(() => null))?.error;
  throw new ShareCallError(said || `${what} (${res.status})`, res.status);
}

// The links made by this account and by the delete keys held here, newest first
export async function fetchMine() {
  const headers = shareHeaders({ all: true });
  if (!headers.Authorization && !headers['X-Share-Keys']) return [];
  const res = await check(await fetch(`${API_BASE}/shares/mine`, { headers }), 'Couldn\'t list your links');
  return res.json();
}

export const renameShare = async (id, name) =>
  void await check(await fetch(`${API_BASE}/shares/${encodeURIComponent(id)}/name`, { method: 'PUT', headers: shareHeaders({ id, json: true }), body: JSON.stringify({ name }) }), 'Couldn\'t rename it');

export async function removeShare(id) {
  await check(await fetch(`${API_BASE}/shares/${encodeURIComponent(id)}`, { method: 'DELETE', headers: shareHeaders({ id }) }), 'Couldn\'t remove it');
  forgetKey(id);
}

// The id in a pasted link (…?m=<id>) or the id itself; null when it isn't one
export function shareIdOf(text) {
  const t = String(text || '').trim();
  const id = /[?&]m=([^&#\s]+)/.exec(t)?.[1] || t;
  return /^[A-Za-z0-9]{10}$/.test(id) ? id : null;
}

// What a link starts with: …/?m=
export const linkBase = () => shareUrl('').replace(/\?m=$/, '?m=');

// The answer to opening a link, for the Opened Share view: the status, and the body when it is the "removed" one
export async function answerOf(res) {
  return { status: res.status, body: res.status === 410 ? await res.clone().json().catch(() => null) : null };
}
