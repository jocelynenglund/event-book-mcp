# Live books

An open book kept on the server updates as it changes on another device (an agent writing, the laptop) instead of waiting for the poll.
The server's part is the EventPad module's SignalR hub (`api/EventPad/Features/Live/`, `/hubs/eventpad-books`); this folder is the browser's.

## How it works

- While a **kept** book is open (signed in, tab visible, not the bookshelves, not a build book) `connection.js` connects to the hub with the
  device token (`access_token`, which is all a browser websocket can send), calls `JoinBook(<server id>)`, and listens for `bookChanged`.
- A message is only `{modelId, position, holder, kind}` (kind: `appended`, `checkout`, `checkin`). It never carries events. When the position is
  beyond what this device has, or the holder differs, the device pulls through the ordinary `syncModel` (`force`, one pull at a time), so
  ids, undo and holders behave as they always did. A message about a position already here (the device's own push) asks nothing.
- While connected the safety-net poll (`sync/client.js`, `pollHeldElsewhere`) slows to every 5 minutes (`setPollOverride`). Lost or never made: the poll is as it was,
  and another try comes after 30 s, 1, 2, then 5 minutes. A reconnect joins the book again (the server forgets groups).
- Hidden tab, the bookshelves, signed out, another book: the device leaves the hub and the connection is closed.
- **Live Chip** (`liveChip.read.js` → `liveBooks.parts.js`, drawn by `view.js` beside the save chip): ● Live (green), ↻ Reconnecting, ○ Polling (grey); a tap says what it means. On phones only the dot shows.
- `@microsoft/signalr` is loaded with a dynamic `import()` the first time a book needs it. The build bundles it into `main.js`; unbundled development has no bare
  imports, so the chip says Polling there. Tests replace the connection with `window.__itsyLiveHub(url, accessToken)`.

## Hooks outside this folder

Every one is a single line marked `feature: live-books` (`grep -rn "feature: live-books" src tests api`):
`main.js` (the start), `sync/view.js` (the chip is drawn when the save chip is), `sync/client.js` (the poll's slow-down).
On the server: `EventPadModule.cs` (hub options, `MapHubs`), `Features/Sync/ModelEvents.cs` and `Checkouts.cs` (one `Announce` call each).
Host setting `EventPadLive__Enabled=false` turns the hub and every broadcast off; clients then show Polling.

## To remove

1. Delete this folder, and `api/EventPad/Features/Live/`.
2. Delete `tests/gwt/live-chip.test.mjs`, `tests/live-books.test.js`, `tests/feature-live-books-boundary.test.js` and `api/EventPad.Tests/LiveHubTests.cs`.
3. Delete every line marked `feature: live-books` (grep above), and in `HostStartupTests.cs` the hub lines.
4. `npm uninstall @microsoft/signalr`, and the `Microsoft.AspNetCore.SignalR.Client` reference of `EventPad.Tests.csproj`.
5. Release the module (a tag) for the server side to go.
