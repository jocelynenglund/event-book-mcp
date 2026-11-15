# Event Book MCP server

Lets your AI agent model in [Event Book](https://eventbook.itsybit.se/): chapters, commands,
events, read models and automations, with Given/When/Then scenarios for each slice. You
watch the board grow live in your browser while the agent works.

It runs on your own machine. Your models stay in `~/.eventpad-mcp/store.json` (set
`EVENTPAD_MCP_HOME` to move them). You don't need an account to model.

## What you need

- Node 22 or newer
- An agent that speaks MCP: Claude Code, Claude Desktop, Cursor, or similar

## Set it up

Clone this repo, then add it to your agent. In Claude Code:

```sh
git clone https://github.com/jocelynenglund/event-book-mcp.git ~/event-book-mcp
claude mcp add --scope user event-book -- node ~/event-book-mcp/bin/event-book-mcp.mjs
```

For other agents, add an MCP server with the command `node` and the argument
`<path>/bin/event-book-mcp.mjs` (stdio). It has no dependencies, so there is no `npm install`.

Then ask your agent something like *"Model a library loan system in Event Book and open
the live view"*.

## What works where

| | Needs |
|---|---|
| Modelling: `new_model`, `add_steps`, `add_scenarios`, `outline`, `edit_slice`, renames, moves, comments | Nothing: all on your machine |
| `live_view`: Event Book on `http://localhost:7979/?live`, following the model as it's built | Nothing: served from this repo |
| `export_file`, then ☰ → Import in [Event Book](https://eventbook.itsybit.se/) | Nothing: Event Book keeps books in your browser |
| `import_file`: bring in a test export or a `docs/slices.json` plan from your repo | Nothing |
| `share_link`: a link that opens a copy of the model, on any device | Uploads the model (without history) to Event Book's share service |
| `connect_library`, `keep_model`, editing a ☁ book, `press_queue`, `start_building`, `finish_building` | An Event Book account (invite only for now) |
| `generate_specs {repo, language: "js"}`: a failing Given/When/Then spec and a stub for each refined slice, in your repo | `npm install --save-dev itsybit-gwt` there ([itsybit-gwt](https://www.npmjs.com/package/itsybit-gwt), MIT), then `node --test` |

## Settings

| Variable | What it changes |
|---|---|
| `EVENTPAD_MCP_HOME` | Where models are kept (default `~/.eventpad-mcp`) |
| `EVENTPAD_LIVE_PORT` | The live view's port (default 7979; the next free one is used) |
| `EVENTPAD_AUTHOR` | The name comments and drafts are signed with |

This repo is generated from Event Book's own source on each release, so the server runs
the same commands as the app. Please report issues there rather than editing the copy here.

## Licence

MIT: build whatever you like with it.
