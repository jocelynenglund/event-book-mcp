// The styles of the Pages feature, handed to the app when the view is registered (ui/feed.js registerView): the folder is the whole feature,
// so there is no stylesheet to link and nothing in styles.css.
export const pagesCss = `
/* Pages: the journey's pages as phone-shaped cards in a row, in journey order, each with its screens as small windows */
.pages-view { height: calc(100dvh - var(--header-h, 56px)); overflow: hidden; display: flex; flex-direction: column; }
.pg { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.pg-row { flex: 1; min-height: 0; display: flex; align-items: flex-start; gap: 18px; padding: 16px 18px 28px; overflow: auto; scroll-snap-type: x proximity; }
.pg-card { position: relative; flex: none; width: 232px; max-height: 100%; display: flex; flex-direction: column; border: 2px solid var(--text); border-radius: 26px; background: var(--surface); box-shadow: var(--note-shadow); overflow: hidden; scroll-snap-align: center; }
.pg-card-head { flex: none; display: flex; align-items: center; gap: 6px; padding: 10px 10px 8px 6px; border-bottom: 1px dashed var(--border-light); }
.pg-grip { flex: none; width: 34px; height: 40px; border: 0; background: none; color: var(--text-muted); font: 700 20px/1 var(--font-body); cursor: grab; touch-action: none; border-radius: 10px; }
.pg-grip:focus-visible { outline: 2px solid var(--accent); }
.pg-card-title { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.pg-title { min-height: 28px; padding: 0 4px; margin: 0 -4px; border: 0; background: none; color: var(--text); font: 700 16px/1.2 var(--font-body); text-align: left; cursor: text; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border-radius: 6px; }
.pg-title:hover { background: var(--surface-hover); }
.pg-title-input { width: 100%; box-sizing: border-box; min-height: 28px; padding: 0 6px; border: 1.5px solid var(--accent); border-radius: 6px; background: var(--bg); color: var(--text); font: 700 16px/1.2 var(--font-body); }
.pg-count { font: 600 12px var(--font-body); color: var(--text-muted); }
.pg-screens { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 12px; padding: 12px 12px 16px; overflow-y: auto; }
.pg-screen { display: flex; flex-direction: column; gap: 4px; border-radius: 8px; }
.pg-screen .pad-wire { border: 1px solid #b4ad9e; border-radius: 5px; overflow: hidden; background: #fff; pointer-events: none; }
.pg-screen-label { display: flex; align-items: center; gap: 6px; min-width: 0; font: 600 12px var(--font-body); color: var(--text-muted); }
.pg-slice { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pg-slice-ref { font-weight: 800; color: var(--text); }
.pg-slice-none { font-style: italic; }
.pg-jump { flex: none; width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid var(--border-light); background: var(--surface); color: var(--text); font: 700 16px/1 var(--font-body); cursor: pointer; }
.pg-empty { margin: 40px 24px; max-width: 460px; font: 500 16px/1.5 var(--font-body); color: var(--text-muted); }
.pg-empty code { padding: 1px 6px; border-radius: 5px; background: var(--surface-hover); color: var(--text); font: 600 14px var(--font-mono); }
.pg-card[data-dragging] { z-index: 5; opacity: 0.92; transition: none; box-shadow: 0 14px 28px -8px rgba(60, 40, 10, 0.55); cursor: grabbing; }
.pg-card[data-drop-before]::before, .pg-card[data-drop-after]::after { content: ""; position: absolute; top: 12px; bottom: 12px; width: 4px; border-radius: 2px; background: var(--accent); }
.pg-card[data-drop-before]::before { left: -11px; }
.pg-card[data-drop-after]::after { right: -11px; }
.pg-card[data-highlight], .pg-screen[data-highlight] { animation: pg-flash 1.8s ease-out; }
.pg-screen[data-highlight] { outline: 3px solid var(--accent); outline-offset: 3px; }
@keyframes pg-flash { 0%, 45% { box-shadow: 0 0 0 4px var(--accent), var(--note-shadow); } 100% { box-shadow: var(--note-shadow); } }
@media (prefers-reduced-motion: reduce) { .pg-card[data-highlight], .pg-screen[data-highlight] { animation: none; } }
@media (max-width: 480px) { .pg-card { width: 78vw; } .pg-row { padding: 12px 14px 24px; gap: 14px; } }

/* A screen note that says which pages it sits on ends with a small accent line */
.pad-wire-note[data-kind="on"] { padding: 3px 10px 6px; font: 700 10px/1.3 var(--font-body); letter-spacing: .02em; color: #8a4b12; }
/* The chips on a board screen: the pages it sits on */
.bd-page-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.bd-page-chip { padding: 1px 8px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--text) 35%, transparent); background: rgba(255, 255, 255, 0.55); color: var(--text); font: 700 11px/1.5 var(--font-body); white-space: nowrap; cursor: pointer; }
.bd-page-chip:hover, .bd-page-chip:focus-visible { background: var(--text); color: var(--bg); outline: none; }

/* On a phone Pages stays in the top switch (the header tightens and the switch scrolls sideways if it must); ☰ has it only on wide screens' behalf, so hide it there too */
@media (min-width: 1px) { .burger-item.burger-pages { display: none; } }
`;
