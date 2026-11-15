// ===========================================
// BOARD - View (SV: View Board)
// Time flows left → right, one column per slice, three swimlanes:
// UI / automation · commands & views · events
// ===========================================

import { statusChips } from '../filter/status.js';
import { projectState } from '../../core/projections.js';
import { boardScreen, withFlows, otherFlow, sliceTypeLabels } from './screen.js';
import { boardSliceHeader, boardLane, boardScenarios, boardComments, boardChapterHead, boardEmptyChapter, boardSpine, boardLaneLabels, boardStats, noteTilt } from './rowView.js';
import { getEventStream, historyOf } from '../../core/eventStore.js';
import { usageButton } from '../usage/view.js';

// Re-exported for the poster and the other screens
export { sliceTypeLabels, noteTilt };
export { cardTags, firstAppearances } from './screen.js';
export const laneLabels = ['UI · Automation', 'Commands · Views', 'Events'];

// Folded chapters show as a book spine. A per-device view preference, so it
// lives in localStorage rather than the model's event stream.
// Folded chapters, and ones opened by hand. A chapter nobody has touched is folded
// when its model is big (more than 20 slices), so a big model opens as a row of books.
const FOLD_KEY = 'eventpad_folded_chapters';
const OPEN_KEY = 'eventpad_opened_chapters';
const BIG_MODEL = 20;
let folded = new Set();
let opened = new Set();
try { folded = new Set(JSON.parse(localStorage.getItem(FOLD_KEY) || '[]')); } catch (e) { /* storage blocked */ }
try { opened = new Set(JSON.parse(localStorage.getItem(OPEN_KEY) || '[]')); } catch (e) { /* storage blocked */ }
let foldByDefault = false;

// Called with the open model's slice count before the board or outline draws
export function setModelSize(sliceCount) { foldByDefault = sliceCount > BIG_MODEL; }

export function isChapterFolded(chapterId) {
  if (folded.has(chapterId)) return true;
  if (opened.has(chapterId)) return false;
  return foldByDefault;
}

// Which flow each chapter shows (none: all its slices). Per device, like folds.
const FLOW_KEY = 'eventpad_chapter_flow';
let shownFlow = {};
try { shownFlow = JSON.parse(localStorage.getItem(FLOW_KEY) || '{}') || {}; } catch (e) { /* storage blocked */ }

export function shownFlowOf(chapterId, state) {
  const id = shownFlow[chapterId];
  return id && state.flows?.[id]?.chapterId === chapterId ? state.flows[id] : null;
}

export function showFlow(chapterId, flowId) {
  if (flowId) shownFlow[chapterId] = flowId; else delete shownFlow[chapterId];
  try { localStorage.setItem(FLOW_KEY, JSON.stringify(shownFlow)); } catch (e) { /* storage blocked */ }
  renderBoard();
}

// A chapter with flows shows its main line (the happy case) or one flow: the
// main line plus that flow's slices, in order. Always read left to right.
export const applyFlows = (groups, state) => withFlows(groups, state, shownFlowOf);

// An outcome event of another flow than the one shown (on the main line: any flow)
export const otherFlowOutcome = (el, slice, state) => otherFlow(el, slice, state, shownFlowOf(slice.chapterId, state)?.id);

// The scenarios lane under the events: open shows each slice's Given / When /
// Then, closed is a slim strip with counts. Closed whenever the app opens.
let gwtOpen = false;

export function toggleGwtLane() {
  gwtOpen = !gwtOpen;
  renderBoard();
}

// Close (or open) every book at once
export function setAllChaptersFolded(chapterIds, fold) {
  chapterIds.forEach(id => {
    if (fold) { opened.delete(id); folded.add(id); } else { folded.delete(id); opened.add(id); }
  });
  try {
    localStorage.setItem(FOLD_KEY, JSON.stringify([...folded]));
    localStorage.setItem(OPEN_KEY, JSON.stringify([...opened]));
  } catch (e) { /* storage blocked: just this time */ }
}

// Bookmarked chapters stay open. On a phone, opening a chapter folds the other open ones
// (one at a time), but not the bookmarked ones. Per device, like folds.
const MARK_KEY = 'eventpad_bookmarked_chapters';
let marked = new Set();
try { marked = new Set(JSON.parse(localStorage.getItem(MARK_KEY) || '[]')); } catch (e) { /* storage blocked */ }
const onPhone = () => !!window.matchMedia?.('(max-width: 700px)').matches;

export const isChapterBookmarked = chapterId => marked.has(chapterId);

export function toggleChapterBookmark(chapterId) {
  if (marked.has(chapterId)) marked.delete(chapterId); else marked.add(chapterId);
  try { localStorage.setItem(MARK_KEY, JSON.stringify([...marked])); } catch (e) { /* storage blocked */ }
  renderBoard();
}

export function toggleChapterFolded(chapterId) {
  if (isChapterFolded(chapterId)) {
    folded.delete(chapterId); opened.add(chapterId);
    if (onPhone()) projectState().chapterOrder
      .filter(id => id !== chapterId && !marked.has(id) && !isChapterFolded(id))
      .forEach(id => { opened.delete(id); folded.add(id); });
  }
  else { opened.delete(chapterId); folded.add(chapterId); }
  try {
    localStorage.setItem(FOLD_KEY, JSON.stringify([...folded]));
    localStorage.setItem(OPEN_KEY, JSON.stringify([...opened]));
  } catch (e) { /* storage blocked */ }
  renderBoard();
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// The book's name, first in the bottom bar (the header keeps its buttons); a tap opens its details
export const bookTitle = screen => `<button class="bd-book-title" data-book-title>${escapeHtml(screen.title)}</button>`;

// Quick stats above the board: how big the model is, by kind (all of it, whatever flow is shown)
function renderStats(screen) {
  const box = document.getElementById('boardStats');
  if (!box) return;
  box.innerHTML = boardStats(screen, {
    title: bookTitle(screen),
    chips: statusChips(screen.stageSlices),
    usage: usageButton(getEventStream()),
    replay: getEventStream().length > 1 && !document.body.classList.contains('replaying'),
    snapshot: !!historyOf(getEventStream()).snapshot
  });
}

// Scrolled down past the slice headers: a translucent line over the top of the board names the
// slices in view, each over its column, the first of each chapter led by the chapter's name. It
// sits outside the grid and never changes a size, so scrolling can't shift anything
function pinHeads(board) {
  let ov = document.getElementById('boardOverlay');
  if (!ov) { ov = document.createElement('div'); ov.id = 'boardOverlay'; ov.setAttribute('aria-hidden', 'true'); document.body.appendChild(ov); }
  const r = board.getBoundingClientRect();
  const head = board.querySelector('.bd-head');
  const past = r.width > 0 && head && head.getBoundingClientRect().bottom <= r.top + 1;
  ov.classList.toggle('on', !!past);
  if (!past) return;
  ov.style.cssText = `top:${r.top}px;left:${r.left}px;width:${board.clientWidth}px`;
  const lane = 26, w = board.clientWidth;
  const chapters = [...board.querySelectorAll('.bd-chapter')].map(el => ({ b: el.getBoundingClientRect(), name: el.querySelector('.bd-chapter-name')?.textContent || '', named: false }));
  const slices = [...board.querySelectorAll('.bd-head')].map(el => {
    const b = el.getBoundingClientRect();
    const x0 = Math.max(b.left - r.left, lane), x1 = Math.min(b.right - r.left, w);
    if (x1 - x0 <= 24) return '';
    const mid = (b.left + b.right) / 2;
    const ch = chapters.find(c => !c.named && mid >= c.b.left && mid <= c.b.right);
    if (ch) ch.named = true;
    return `<span class="bo-slice" style="left:${x0}px;width:${x1 - x0}px">${ch ? `<i class="bo-chapter">${escapeHtml(ch.name)} ›</i> ` : ''}${escapeHtml(el.querySelector('.bd-head-text')?.textContent || '')}</span>`;
  });
  ov.innerHTML = `<div class="bo-row">${slices.join('')}</div>`;
}
let pinning = false;
function onBoardScroll(e) {
  if (pinning) return;
  pinning = true;
  requestAnimationFrame(() => { pinning = false; pinHeads(e.target); });
}

// A folded chapter's ribbon unrolls to the right of its spine. Near the board's right edge that would
// widen the board (a scrollbar appears, the board shifts, the spine slides from under the pointer, the
// ribbon wraps: a jitter, Jocelyn 2026-11-09), so there it unrolls to the left instead.
function aimRibbon(e) {
  const spine = e.target.closest?.('.bd-spine');
  const ribbon = spine?.querySelector('.bd-spine-ribbon');
  if (!ribbon) return;
  const room = e.currentTarget.getBoundingClientRect().right - spine.getBoundingClientRect().left;
  spine.classList.toggle('ribbon-left', ribbon.scrollWidth + 4 > room);
}

export function renderBoard() {
  const board = document.getElementById('board');
  if (!board) return;
  if (!board.dataset.pinned) {
    board.dataset.pinned = '1';
    board.addEventListener('scroll', onBoardScroll, { passive: true });
    board.addEventListener('pointerover', aimRibbon);
    board.addEventListener('focusin', aimRibbon);
  }
  const screen = boardScreen(projectState(), { folded: isChapterFolded, flowOf: shownFlowOf });
  board.classList.toggle('has-chapters', screen.hasChapters);
  board.classList.toggle('gwt-open', gwtOpen);
  renderStats(screen);

  let html = boardLaneLabels(screen, { gwtOpen });

  // Column widths: lane labels, then a slice width per column or a narrow spine
  const widths = ['26px'];
  let col = 2;
  screen.chapters.forEach(chapter => {
    if (chapter.folded) {
      html += boardSpine(chapter, { col: col++ });
      // A spine's own width, wider when its name needs a second line. Not max-content: Safari
      // sizes vertical text by its full length, so the spine took the whole board there
      const len = chapter.name.length;
      widths.push(len > 60 ? '100px' : len > 26 ? '76px' : '52px');
      return;
    }
    widths.push(...Array(Math.max(chapter.columns.length, 1)).fill('var(--col-w)'));
    if (!chapter.loose) html += boardChapterHead(chapter, { col, bookmarked: isChapterBookmarked(chapter.id) });
    if (chapter.empty) {
      html += boardEmptyChapter(chapter, { col });
      col++;
      return;
    }
    chapter.columns.forEach(c => {
      html += boardSliceHeader(c, { col }) + c.lanes.map(l => boardLane(l, { col })).join('')
        + boardScenarios(c.gwt, { col, open: gwtOpen }) + (screen.hasComments ? boardComments(c, { col }) : '');
      col++;
    });
  });

  // New slices and chapters come from the floating + button; an empty board points at it
  if (screen.emptyHint !== null) {
    html += `<div class="bd-new" style="grid-column: ${col}; grid-row: 3 / span 3"><span class="bd-new-hint">${screen.emptyHint}</span></div>`;
    widths.push('var(--col-w)');
  } else if (screen.firstRun) {
    html += `
      <div class="bd-new" style="grid-column: ${col}; grid-row: 3 / span 3">
        <span class="bd-new-hint">Tap <b>＋</b> to add your first slice. Start with something a user <b>does</b>: that's a state change.</span>
      </div>`;
    widths.push('var(--col-w)');
  } else {
    // Room to scroll the last column clear of the floating button
    widths.push('64px');
  }

  board.style.gridTemplateColumns = widths.join(' ');
  board.innerHTML = html;
  pinHeads(board);
}
