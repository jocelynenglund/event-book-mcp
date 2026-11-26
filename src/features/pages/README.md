# Pages

A screen sticky says which **pages** of the journey it sits on. A page exists by being named; the **Pages** view draws each page as a
phone-shaped card (in journey order) with its screens; a screen on the board wears an "on ‹Page›" chip for each page it is on.

Where the names come from: the last line of a Pad screen note, `on: Basket page, Checkout` (Make chapter, Update chapter), or the same line in the
board's Edit as text for a screen. Plan: "Event Book · plan: Pages" (m_mwx4rag3hj7o1).

## Events (all three live in this folder: `pages.events.js`)

| Event | Data | Meaning |
| --- | --- | --- |
| `ScreenPagesSet` | `{ screenId, pages[] }` | the screen's whole list of pages (fewer takes it off a page, `[]` off every page) |
| `PageRenamed` | `{ from, to }` | every screen on `from` moves to `to`; onto an existing page they merge |
| `PagesArranged` | `{ order[] }` | the journey order; pages left out come after, by name |

Projected by `pages.projection.js` into `state.elements[screen].pages` and `state.pageOrder`. Commands: `pages.command.js`
(Place Screen On Pages, Rename Page, Arrange Pages). Views: `pagesStoryboard.read.js`, `screenPageChips.read.js`. Parts: `pages.parts.js`.
Screen: `view.js` (registered with `registerView`); styles are `pages.styles.js`, handed over on registration.

## How it hooks in

Everything outside this folder that knows about Pages is **one line carrying the marker `// feature: pages`**, in a list or registry the
other code already has (a line reader, a wireframe extra, a suggestion context, a sketch observer, a sticky extra, a carried-event list,
a registered view, an outline note) or an import / call of its own. `tests/feature-pages-boundary.test.js` keeps it so: Pages is named
nowhere else, and it removes the folder and the marked lines from a copy of `src/` to check that the app still bundles and books with
these events still project.

## To remove Pages

1. Delete this folder: `src/features/pages/`.
2. Delete the tests: `tests/pages.test.js`, `tests/feature-pages-boundary.test.js`, `tests/gwt/pages.test.mjs`, `tests/gwt/pages-from-screens.test.mjs`.
3. Remove the lines marked `feature: pages` (each is a whole line, or an import):
   - `src/core/projections.js` (2): the import and `projectPages(state, event)`
   - `src/core/carriedEvents.js` (2)
   - `src/main.js` (2): the import and `registerView(pagesView)`
   - `src/features/board/board.parts.js` (2) and `src/features/board/boardLaneStickies.read.js` (2)
   - `src/features/pad/padScreen.rules.js` (3), `padSuggest.rules.js` (2), `padSuggestions.read.js` (2), `screenSketch.command.js` (2)
   - `tools/eventpad-mcp/server.mjs` (1) and `tools/eventpad-mcp/pad.mjs` (1)
   - tests: `tests/gwt/gwt.mjs` (1), `tests/gwt/usedBy.mjs` (1)
4. Tests that name the Pages button or menu item: `tests/pad.test.js` and `tests/literature.test.js` (the switch lists `Board, Outline, Pad`),
   `tests/menu.test.js` (the ☰ list), `tests/screen-pass.test.js` (the `Pages` screen and the screen on a page in its seed),
   `tests/mcp-pad.test.js` (the outline test of `on:`); and `"Pages"` in `docs/screen-pass.json`.

`grep -rn "feature: pages" src tools tests` lists the lines.

## Books that already have these events

Harmless. `core/projections.js` ignores an event type it has no case for, and nothing else reads `ScreenPagesSet`, `PageRenamed` or
`PagesArranged`: the screens project without `pages`, the book has no `pageOrder`, and a screen's `on:` line stays in its sketch text as
plain text (the screen drawing then shows it as a line of text). The boundary test projects such a book with the feature removed.
