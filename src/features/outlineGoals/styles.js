// OUTLINE GOALS - the feature's CSS (feature: outline-goals)
// Kept in the feature's folder, not in styles.css, so removing the folder removes the look too. Added to the page once,
// when the Outline first draws the feature. Colours come from the app's tokens.

const CSS = `
.og-top { margin: 0 0 18px; }
.og-goal { margin: 4px 0 10px; }
.og-kicker { font: 700 11px var(--font-body); letter-spacing: .08em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px; }
.og-goal-text { display: block; width: 100%; margin: 0; padding: 0; border: 0; background: none; color: var(--text); text-align: left; cursor: pointer;
  font: 600 22px/1.25 var(--font-body); overflow-wrap: anywhere; }
.og-oneline { display: block; width: 100%; margin: 6px 0 0; padding: 0; border: 0; background: none; color: var(--text-muted); text-align: left; cursor: pointer;
  font: 400 15px/1.4 var(--font-body); overflow-wrap: anywhere; }
p.og-goal-text, p.og-oneline { cursor: default; }
.og-ask { color: var(--text-muted); font-weight: 400; font-style: italic; }
.og-goal-text.og-ask { font-size: 18px; }
.og-pill-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 14px; }
.og-pills { display: contents; }
.og-pill { display: inline-block; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font: 600 13px var(--font-body); }
.og-proven.all { background: var(--text); color: var(--bg); border-color: var(--text); }
.og-title { margin: 0 0 8px; font: 700 15px var(--font-body); }
.og-list, .og-ch-crit { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.og-crit { display: flex; gap: 10px; align-items: flex-start; width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface);
  color: var(--text); text-align: left; font: inherit; cursor: pointer; }
.og-crit.proven { border-color: var(--readModel); }
.og-mark { flex: none; width: 18px; text-align: center; color: var(--text-muted); font-weight: 700; }
.proven > .og-mark { color: #2f7d27; }
.og-crit-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.og-crit-text { font-size: 15px; line-height: 1.35; overflow-wrap: anywhere; }
.og-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.og-tag { padding: 1px 8px; border-radius: 999px; background: var(--surface-hover); font-size: 12px; color: var(--text-muted); }
.og-proof { font-size: 12px; color: var(--text-muted); }
.og-hint { margin: 0 0 8px; font-size: 14px; color: var(--text-muted); }
.og-add { margin-top: 8px; min-height: 44px; width: 100%; border: 1.5px dashed var(--border-light); border-radius: 10px; background: none; color: var(--text); font: inherit; cursor: pointer; }
.og-chapter { margin: 0 0 8px; display: flex; flex-direction: column; gap: 6px; }
.og-brief { display: flex; flex-direction: column; gap: 6px; }
.og-desc { display: block; margin: 0; padding: 0; border: 0; background: none; color: var(--text-muted); text-align: left; font: 400 14px/1.4 var(--font-body); cursor: pointer; overflow-wrap: anywhere; }
p.og-desc { cursor: default; }
.og-ch-item { display: flex; gap: 6px; width: 100%; padding: 4px 0; border: 0; background: none; color: var(--text); text-align: left; font: 400 14px/1.35 var(--font-body); cursor: pointer; overflow-wrap: anywhere; }
.og-ch-item.proven .og-mark { color: #2f7d27; }
.og-row { display: flex; gap: 8px; }
.og-small { min-height: 36px; padding: 4px 12px; border-radius: 18px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font: 600 13px var(--font-body); cursor: pointer; }
.og-drafts { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.og-draft { display: inline-flex; align-items: center; gap: 2px; padding: 3px 4px 3px 10px; border: 1.5px dashed var(--event); border-radius: 999px; background: none; color: var(--text); font: 600 13px var(--font-body); }
.og-draft-add { padding: 3px 12px; min-height: 32px; color: var(--text-muted); cursor: pointer; }
.og-draft-x { width: 28px; height: 28px; border: 0; border-radius: 50%; background: none; color: var(--text-muted); font: inherit; font-size: 16px; cursor: pointer; }
.og-draft-new { padding: 2px 4px; gap: 6px; border-style: solid; }
.og-draft-input { min-width: 0; width: 150px; border: 0; background: none; color: var(--text); font: 400 14px var(--font-body); }
.og-draft-input:focus { outline: none; }
.og-ladder { display: flex; align-items: center; gap: 3px; }
.og-rung { width: 18px; height: 6px; border-radius: 3px; background: var(--surface-hover); }
.og-rung.on { background: var(--text); }
.og-ladder-label { margin-left: 6px; font-size: 12px; color: var(--text-muted); }
.og-text { width: 100%; resize: none; }
.og-chips, .og-proofs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.og-proofs { flex-direction: column; }
.og-chip { min-height: 40px; padding: 4px 14px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font: 600 14px var(--font-body); cursor: pointer; }
.og-chip.on { background: var(--text); color: var(--bg); border-color: var(--text); }
.og-pick { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); color: var(--text); text-align: left; font: inherit; cursor: pointer; }
.og-pick.on { border-color: var(--text); box-shadow: inset 0 0 0 1px var(--text); }
.og-pick-name { font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
.og-pick-where { font-size: 12px; color: var(--text-muted); }
`;

export function ensureOutlineGoalsStyles() {
  if (typeof document === 'undefined' || document.getElementById('ogStyles')) return;
  const style = document.createElement('style');
  style.id = 'ogStyles';
  style.textContent = CSS;
  document.head.appendChild(style);
}
