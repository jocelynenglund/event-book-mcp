// Share links you can name, list and remove (the MCP side): share_link's name, list_shares, remove_share.
// A copy made while connected is the account's; one made without it comes back with a delete key (once), kept here per
// share id: the only way to remove it. The key is only ever sent to the share service, never printed.
// To remove the feature: see src/features/shareLinks/README.md.

export function createShares({ token, shareApi, app, storage }) {
  const KEYS = 'eventpad_mcp_share_keys';
  const keys = () => { try { return JSON.parse(storage.getItem(KEYS) || '{}'); } catch (e) { return {}; } };
  const setKeys = k => storage.setItem(KEYS, JSON.stringify(k));
  const linkOf = id => `${app}?m=${encodeURIComponent(id)}`;

  // Who is asking the share service: the connected account, and the delete keys held here
  const headers = (extra = {}) => ({ ...(token() ? { Authorization: `Bearer ${token()}` } : {}), ...extra });

  const idOf = linkOrId => {
    const text = String(linkOrId || '').trim();
    const id = /[?&]m=([^&#\s]+)/.exec(text)?.[1] || text;
    if (!/^[A-Za-z0-9]{10}$/.test(id)) throw new Error('Give the share link (…?m=…) or its id');
    return id;
  };

  return {
    headers,
    // What the share service answered to a new copy: keep the delete key, say what the link is called
    created({ id, name, deleteKey }) {
      if (deleteKey) setKeys({ ...keys(), [id]: deleteKey });
      return `${linkOf(id)}\nA copy${name ? ` called "${name}"` : ''}: what the person does in it (Refined, comments) stays on their device. list_shares shows your links, remove_share takes one away. To hand over a plan, keep_model and send its book link instead.`;
    },

    // Your share links, newest first: the account's (when connected) and the copies made here without it
    async list() {
      const held = Object.values(keys());
      if (!token() && !held.length) return 'No share links yet. share_link makes one.';
      const res = await fetch(`${shareApi}/shares/mine`, { headers: headers(held.length ? { 'X-Share-Keys': held.join(',') } : {}) });
      if (!res.ok) throw new Error(`Couldn't list share links (${res.status})`);
      const rows = await res.json();
      if (!rows.length) return 'No share links yet. share_link makes one.';
      return rows.map(r => `${r.name} · ${r.bookName || 'a book'} · ${String(r.createdAt).slice(0, 10)} · ${linkOf(r.shareId)}`).join('\n');
    },

    // Take a share link away: opening it then says it was removed. Only the one who shared it can
    async remove({ link, id }) {
      const shareId = idOf(link || id);
      const held = keys();
      const res = await fetch(`${shareApi}/shares/${encodeURIComponent(shareId)}`, {
        method: 'DELETE', headers: headers(held[shareId] ? { 'X-Share-Key': held[shareId] } : {})
      });
      if (res.status === 403) throw new Error('Only the one who shared it can remove it');
      if (res.status === 404) throw new Error('No such share link');
      if (!res.ok) throw new Error(`Couldn't remove it (${res.status})`);
      if (held[shareId]) { delete held[shareId]; setKeys(held); }
      return `Removed ${linkOf(shareId)}: opening it now says it was removed by the person who shared it.`;
    }
  };
}
