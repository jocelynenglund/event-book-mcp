# Share links you can name, list and remove

Event Book plan: "Share links you can name and remove" (book `m_mwx7dr9grlmou`).

A copy link now has a name, shows up in ☰ → Share links (copy, rename, remove, each asked inside the sheet), and a
removed link says so when someone opens it ("This link was removed by the person who shared it").

Who owns a link: signed in, your account (`acct:<accountId>`). Signed out, the share service returns a random delete key
once; this device keeps it per share id (`eventpad_share_keys` in localStorage) and the server keeps only its hash
(`key:<hash>`). The library's admin may remove an old link made before links had owners, by pasting it (there is no list
of them to browse: that would mean scanning every share).

## What is here

| File | What it is |
| --- | --- |
| `yourShareLinks.read.js` | view Your Share Links, drawn by `shareLinksList` and its row |
| `openedShare.read.js` | view Opened Share (open / removed), feeds the link loader's message |
| `shareLinkName.read.js` | view Share Link Name, drawn by the share sheet's Name field |
| `adminLinkRemoval.read.js` | view Admin Link Removal, shown to the admin only |
| `shareLinks.parts.js` | the components |
| `shareLinksSheet.js` | the sheet's controller |
| `client.js` | the share service's calls and the delete keys held here |
| `index.js` | what the rest of the app imports |

Server: `api/EventPad/Features/Shares/` (`ShareCopy`, `RenameShare`, `RemoveShare`, `ShareEndpoints`, `ShareEvents`).
MCP: `tools/eventpad-mcp/shares.mjs` (tools `list_shares`, `remove_share`, and `share_link`'s `name`).
Tests: `tests/share-links.test.js`, `tests/share-links-boundary.test.js`, `tests/gwt/share-links.test.mjs`.

## To remove

Every place outside this folder that the feature reaches is marked `feature: share-links`:

    grep -rn "feature: share-links" --exclude-dir=node_modules --exclude-dir=.git .

1. Delete this folder, `tools/eventpad-mcp/shares.mjs`, and the three tests above.
2. Remove each marked line: the import and calls in `src/features/shareLink/link.js` (the name field, the headers, the
   delete key, the removed-link answer), the `removed` branch in `src/features/linkLoading/` (state and part), the menu
   item and the Name mount in `index.html`, the marked block at the end of `styles.css`, the `list_shares` /
   `remove_share` tools and the `name` argument in `tools/eventpad-mcp/server.mjs`, and `shares.mjs` in `scripts/pack-mcp.mjs`.
3. Server: delete `ShareCopy`, `RenameShare`, `RemoveShare`, `ShareEndpoints` and `ShareEvents` in
   `api/EventPad/Features/Shares/`, put back `CreateShare`'s plain `ModelShared` write, and drop the three routes
   (`HostStartupTests` counts them). Streams already written keep their events, and old ones still read: `Codec`
   decodes them, so leave its cases in.
