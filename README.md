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
| Modelling: `new_model`, `add_steps` (an event can be `storage: {kind, name}`: a table, config file or document kept elsewhere, drawn brown), `add_scenarios`, `outline`, `edit_slice` (incl. `reads: "<view>"`: an automation reads an existing view), `arrange_chapters` (order and parts), `fix_gaps` / `apply_fix` (information completeness), `map_field` (with `add` / `remove` for several sources) / `trace_field` (where a field comes from, and how it travels), renames, moves, comments. Every slice has a short stable ref (`#k3f9q`, shown by `outline`) that every tool accepts instead of its S-number: S-numbers shift when slices are inserted, so replies list what shifted; once the numbering has changed in a session, S-numbers are refused for edits until the next full `outline` (read-only tools still take them), and a delete (`edit_slice {delete}`, `delete_scenario`) always needs the ref or the exact title and says what it deleted. `add_steps` keeps a step's inline `scenarios` and refuses a key it does not know; `edit_slice {stopTrigger: "<event>"}` takes an automation's trigger away | Nothing: all on your machine |
| Alternate endings: `clone_slice` clones a slice as a slice of its own, right after it, reusing the stickies it keeps (screen and command, optionally events and copies of the scenarios), with an optional new ending event that carries the command's fields; `outline` marks it "alternate of S5" <!-- feature: clone-slice --> | Nothing: all on your machine |
| Sketching: `new_model {sketch: true}`, `pad_outline`, `pad_add_notes`, `pad_frame`, `pad_link_copy`, `pad_move`, `pad_remove`, `pad_rename_frame`, `pad_make_chapter`, `pad_update_chapter`, `live_view {view: "pad"}`: fill the Pad with frames of notes (and a blue chapter arrow, `kind: "arrow"`, as a heading over a run of frames, for the eye only; `over: [frames]` spans it over them, and `pad_move {note, over}` re-spans one), look at it live, then make the chapter | Nothing: local, like modelling |
| `update_mcp`: pull the newest version of this server (a fast-forward of your clone), then `/mcp` → reconnect. The first reply of a session says when an update is waiting | Needs git and network access to the repo (not private; just git) |
| `live_view`: Event Book on `http://localhost:7979/?live`, following the model as it's built | Nothing: served from this repo |
| `export_file`, then ☰ → Import in [Event Book](https://eventbook.itsybit.se/) | Nothing: Event Book keeps books in your browser |
| `import_file`: bring in a test export, a `docs/slices.json` plan, or a plan file (`eventbook-plan/1`, below) | Nothing |
| `share_link {name}`: a link that opens a copy of the model, on any device, called `name` (else the book's name and the day); `list_shares`: your links, newest first; `remove_share {link}`: takes one away (opening it then says it was removed) | Uploads the model (without history) to Event Book's share service. A link made while not connected has a delete key, kept in `~/.eventpad-mcp` and used only to remove it |
| `connect_library`, `keep_model`, editing a ☁ book, `press_queue`, `start_building`, `finish_building`, `retire_plan` (for ☁ plans; `map` pairs a renamed slice with its built name, `evidence` records why an unmatched slice is built, for the owner's "Retire anyway") | An Event Book account (invite only for now) |
| `generate_specs {repo, language: "js"}`: a failing Given/When/Then spec and a stub for each refined slice, in your repo; the plan remembers each slice's spec file, so the built code pairs with it exactly, whatever the names | `npm install --save-dev itsybit-gwt` there ([itsybit-gwt](https://www.npmjs.com/package/itsybit-gwt), MIT), then `node --test` |

## Plan without this server

Any LLM can write a plan Event Book imports: point it at
[eventbook.itsybit.se/llms.txt](https://eventbook.itsybit.se/llms.txt). It explains event modeling
and the plan file (`eventbook-plan/1`, schema at
[plan.schema.json](https://eventbook.itsybit.se/plan.schema.json)). Open the file in Event Book with
☰ → Import, or give it to this server with `import_file`. The steps and scenarios are the same as
`add_steps` and `add_scenarios` take.

## Build books from your own tests

A build book is a model Event Book makes from your Given/When/Then tests. In JavaScript,
[itsybit-gwt](https://github.com/jocelynenglund/itsybit-gwt) writes the file for you (run your
specs with `GWT_EXPORT=<dir>`). In any other language, write each test's Given, When and Then
to a JSON file in the documented format. Then import it
with ☰ → Import or `import_file`. The format is explained, with a complete example, in
[eventbook.itsybit.se/llms.txt](https://eventbook.itsybit.se/llms.txt) and described by
[build.schema.json](https://eventbook.itsybit.se/build.schema.json).

## Settings

| Variable | What it changes |
|---|---|
| `EVENTPAD_MCP_HOME` | Where models are kept (default `~/.eventpad-mcp`) |
| `EVENTPAD_LIVE_PORT` | The live view's port (default 7979; the next free one is used) |
| `EVENTPAD_AUTHOR` | The name comments and drafts are signed with |

## Found a problem or have an idea?

Tell us from Event Book itself: ☰ → 💬 Send feedback at
[eventbook.itsybit.se](https://eventbook.itsybit.se). It goes privately to Jocelyn. If you leave
its toggle on, it adds your last steps: what you tapped, never what you wrote. A problem with
these tools is welcome there too: they share one source with the app, so a fix lands in both.

This repo is generated from Event Book's own source on each release, so the server runs the
same commands as the app. Changes made here would be overwritten by the next release, so Send
feedback is the way to suggest one.

## Licence

MIT: build whatever you like with it.
