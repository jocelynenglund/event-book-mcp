// OUTLINE DESKTOP - the feature's CSS (feature: outline-desktop)
// Kept in the feature's folder, not in styles.css, so removing the folder removes the look too. Added to the page once, when the
// Outline first draws the desktop layout. Everything is under .od-shell (three columns from 1100 px: a rail, the document,
// the comments); colours come from the app's tokens.

const CSS = `
#outlineView:has(.od-shell) { max-width: none; padding: 0; }
.overview-view:has(.od-shell) { max-width: none; padding-bottom: 0; }
.overview-view:has(.od-shell) .ov-tabs { position: static; max-width: 320px; margin: 8px auto; }
.od-shell { display: grid; grid-template-columns: 240px minmax(0, 1fr) 320px; align-items: start; min-height: calc(100dvh - var(--header-h, 56px)); }
@media (max-width: 1359px) { .od-shell { grid-template-columns: 200px minmax(0, 1fr) 280px; } }
.od-rail, .od-cmts { position: sticky; top: var(--header-h, 56px); max-height: calc(100dvh - var(--header-h, 56px)); overflow: auto; scrollbar-width: thin; }
.od-rail { border-right: 1px solid var(--border); padding: 16px 10px 40px; background: var(--surface-elevated); min-height: calc(100dvh - var(--header-h, 56px)); }
.od-cmts { border-left: 1px solid var(--border); padding: 16px 16px 40px; background: var(--surface); min-height: calc(100dvh - var(--header-h, 56px)); }
.od-doc { min-width: 0; padding: 18px 32px 80px; }
.od-doc-in { max-width: 920px; margin: 0 auto; }
.od-doc-in::after { content: ''; display: block; height: 55vh; }   /* room for the last chapter to reach the top */
.od-lbl { font: 700 10.5px var(--font-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--text-muted); margin: 0 8px 8px; }
.od-rail .od-lbl.sec { margin-top: 18px; }
.od-quiet { color: var(--text-muted); }
.od-grow { flex: 1; }
.od-pill { display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: 999px; padding: 2px 10px; font: 700 12.5px var(--font-body); white-space: nowrap; cursor: default; }
button.od-pill { cursor: pointer; }
.od-pill.warn { color: #a5601c; border-color: #e2c08f; background: #fcf3e4; }
.od-counts, .od-rail .st-filter { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 8px; }
.od-rail .st-filter { border: 0; background: none; padding: 0; gap: 6px; }
.od-rail .st-chip { height: auto; padding: 2px 10px; border: 1px solid var(--border); border-radius: 999px; background: var(--surface); color: var(--text); font: 700 12.5px var(--font-body); letter-spacing: 0; }
.od-rail .st-chip.on { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }

/* The rail */
.od-ch { padding: 9px 10px; border-radius: 10px; margin-bottom: 4px; border: 1px solid transparent; }
.od-ch.on { background: var(--surface); border-color: var(--border); }
.od-ch-go { display: block; width: 100%; text-align: left; border: 0; background: none; color: var(--text); font: 700 14.5px var(--font-body); padding: 0; cursor: pointer; }
.od-ch-m { display: flex; justify-content: space-between; gap: 6px; font-size: 12px; color: var(--text-muted); margin: 3px 0 5px; }
.od-gap { border: 0; background: none; padding: 0; font: 700 12px var(--font-body); color: #a5601c; cursor: pointer; }
.od-bar { height: 6px; border-radius: 3px; background: var(--surface-hover); overflow: hidden; }
.od-bar i { display: block; height: 100%; background: #3f8a35; }

/* The document */
.od-sec { scroll-margin-top: calc(var(--header-h, 56px) + 12px); }
.od-doc .ol-chapter { margin-top: 18px; }
.od-doc .ol-search-row { margin: 0 0 12px; }
.od-item { margin-bottom: 8px; scroll-margin-top: calc(var(--header-h, 56px) + 12px); }
.od-row { display: flex; align-items: center; gap: 6px; }
.od-row-main { flex: 1; min-width: 0; }
.od-row-progress:empty { display: none; }
#outlineView.tracing .od-item:not(:has(> .od-row[data-traced])) { opacity: 0.35; }
#outlineView.tracing .od-row[data-traced] .od-row-main { box-shadow: inset 4px 0 0 var(--trace); }
.od-row.ol-flash { animation: bd-flash 1.4s ease-out; }
.od-row-main { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; text-align: left; border: 1px solid var(--border); border-left: 4px solid var(--command); background: var(--surface); border-radius: 12px; color: var(--text); font: inherit; cursor: pointer; }
.od-row.od-see .od-row-main { border-left-color: var(--readModel); }
.od-row.od-auto .od-row-main { border-left-color: var(--processor); }
.od-row-main:hover { background: var(--surface-elevated); }
.od-car { width: 12px; color: var(--text-muted); font-size: 12px; flex: none; }
.od-tick { width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid var(--text-muted); display: inline-grid; place-items: center; font: 800 11px/1 var(--font-body); flex: none; background: var(--surface); }
.od-tick.on { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
.od-k { width: 10px; height: 10px; border-radius: 3px; flex: none; background: var(--command); }
.od-see .od-k { background: var(--readModel); } .od-auto .od-k { background: var(--processor); }
.od-ref { font: 700 11px var(--font-mono); color: var(--text-muted); }
.od-n { flex: 1 1 120px; font-weight: 700; min-width: 9ch; overflow-wrap: anywhere; }
.od-s { flex: 0 1 auto; min-width: 0; font-size: 12.5px; color: var(--text-muted); }
.od-mk { display: inline-flex; gap: 4px; align-items: center; border: 1px solid #e2b79a; background: #fdf0e6; border-radius: 999px; padding: 0 8px; font: 700 12px var(--font-body); color: var(--jam, #e0703a); }
button.od-mk { cursor: pointer; }
button.od-mk:not(.has) { border-color: var(--border); background: var(--surface); }
button.od-mk:not(.has)::before { content: '💬'; font-size: 11px; filter: grayscale(1); opacity: .6; }
.od-item.open { border: 1px solid var(--border); border-left: 4px solid var(--command); background: #fff; border-radius: 12px; box-shadow: 0 6px 14px -8px rgba(80, 55, 20, .35); }
.od-item.open.od-see { border-left-color: var(--readModel); } .od-item.open.od-auto { border-left-color: var(--processor); }
.od-item.open .od-row-main { border: 0; border-radius: 0; background: transparent; border-bottom: 1px solid var(--border); }
.od-item.od-hl { outline: 2px solid var(--jam, #e0703a); outline-offset: 1px; }
.od-open-body { padding: 10px 14px 14px; }
.od-flow { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 13.5px; }
.od-ico-row { margin-left: auto; display: inline-flex; gap: 4px; }
.od-ico { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); cursor: pointer; color: var(--text-muted); font: 700 14px var(--font-body); }
.od-ico-page::before { content: '↗'; } .od-ico-menu::before { content: '⋮'; } .od-ico-edit::before { content: '✎'; }
.od-chip { display: inline-block; padding: 2px 9px; border-radius: 3px; font: 700 12.5px var(--font-body); box-shadow: 0 1px 0 rgba(0,0,0,.05), 0 3px 6px -3px rgba(80,55,20,.35); }
.od-chip.cmd { background: var(--note-command); color: var(--note-command-text); } .od-chip.evt { background: var(--note-event); color: var(--note-event-text); }
.od-chip.rm { background: var(--note-readModel); color: var(--note-readModel-text); } .od-chip.proc { background: var(--note-processor); color: var(--note-processor-text); }
.od-arrow { color: var(--text-muted); }
.od-fields { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 6px 0 8px; }
.od-acts { display: flex; gap: 8px; align-items: center; margin: 4px 0 8px; }
.od-new { display: flex; gap: 8px; margin: 0 0 8px; }
.od-new-name { flex: 1; padding: 6px 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); font: inherit; }

/* A scenario as columns */
.od-scw { margin: 8px 0; border-radius: 10px; }
.od-scw.od-hl { outline: 2px solid var(--jam, #e0703a); outline-offset: 1px; }
.od-sc { border: 1px solid var(--border); border-radius: 10px; background: var(--bg); }
.od-sc > header { display: flex; align-items: center; gap: 8px; padding: 7px 12px; font-weight: 700; border-bottom: 1px solid var(--border); font-size: 14px; }
.od-star { color: var(--jam, #e0703a); }
.od-sc:not(.must) .od-star { color: var(--text-muted); }
.od-cols { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.od-col { padding: 8px 12px; border-left: 1px solid var(--border); font-size: 13px; min-height: 62px; display: flex; flex-direction: column; align-items: flex-start; gap: 3px; min-width: 0; }
.od-col:first-child { border-left: 0; }
.od-col .od-lbl { margin: 0 0 3px; }
.od-val { display: flex; gap: 6px; align-items: baseline; width: 100%; border: 1px dashed var(--border-light); border-radius: 6px; padding: 1px 7px; background: var(--surface); font-size: 12.5px; }
.od-val b { font: 500 11px var(--font-mono); color: var(--text-muted); flex: none; }
.od-val input, .od-reason { flex: 1; min-width: 0; border: 0; background: transparent; font: 12.5px var(--font-body); color: var(--text); padding: 2px 0; outline: none; }
.od-val.empty { border-style: dotted; opacity: .7; }
.od-val:focus-within { border-style: solid; border-color: var(--command); opacity: 1; }
.od-reason { flex: none; width: 100%; border: 1px dashed var(--border-light); border-radius: 6px; padding: 3px 7px; background: var(--surface); }
.od-rej { color: #a8322a; font-weight: 700; } .od-nothing { font-weight: 700; }

/* The comments */
.od-cmts h3 { font-size: 16px; margin: 0 0 10px; }
.od-seg { display: flex; border: 1px solid var(--border); border-radius: 10px; padding: 2px; margin-bottom: 12px; }
.od-seg button { flex: 1; text-align: center; padding: 4px; border: 0; border-radius: 8px; background: none; font: 700 13px var(--font-body); color: var(--text-muted); cursor: pointer; }
.od-seg button.on { background: var(--accent); color: var(--accent-text); }
.od-cm-card { border: 1px solid var(--border); border-radius: 10px; padding: 10px 11px; margin-bottom: 10px; background: var(--bg); font-size: 13.5px; }
.od-cm-card.hl { border-color: var(--jam, #e0703a); background: #fdf0e6; box-shadow: inset 3px 0 0 var(--jam, #e0703a); }
.od-cm-card.done { opacity: .75; }
.od-cm-who { display: flex; justify-content: space-between; margin-bottom: 3px; }
.od-cm-text { margin: 0; overflow-wrap: anywhere; }
.od-cm-reply { border-top: 1px solid var(--border); margin-top: 6px; padding-top: 4px; font-size: 13px; } .od-cm-reply p { margin: 0; }
.od-cm-link { display: block; text-align: left; border: 0; background: none; padding: 0; margin: 6px 0 4px; color: #2b6cb0; font: 700 12.5px var(--font-body); text-decoration: underline; cursor: pointer; }
.od-cm-link.plain { color: var(--text-muted); text-decoration: none; cursor: default; }
.od-cm-act { color: var(--text-muted); font-size: 12.5px; font-weight: 700; }
.od-cm-act button { border: 0; background: none; padding: 0; font: inherit; color: inherit; cursor: pointer; }
.od-cm-act button:hover { color: var(--text); text-decoration: underline; }
.od-cm-form { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; align-items: flex-start; }
.od-cm-form textarea { width: 100%; border: 1px solid var(--border); border-radius: 8px; padding: 6px 8px; font: inherit; background: var(--surface); }
.od-empty { border: 1px dashed var(--border-light); border-radius: 10px; padding: 14px; text-align: center; color: var(--text-muted); font-size: 13px; margin-top: 14px; }
`;

export function ensureOutlineDesktopStyles() {
  if (typeof document === 'undefined' || document.getElementById('odStyles')) return;
  const style = document.createElement('style');
  style.id = 'odStyles';
  style.textContent = CSS;
  document.head.appendChild(style);
}
