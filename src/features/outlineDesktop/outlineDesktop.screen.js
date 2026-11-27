// ===========================================
// OUTLINE DESKTOP - The Outline's desktop layout (feature: outline-desktop)
// From 1100 px the Outline is three columns: a rail of chapters, the document (goal, criteria, chapters, slices that open in
// place to Given | When | Then), and the book's comments. renderOutline hands this the book's state (replayed once) and the
// layout it already read; this composes the parts, each drawn from its own view, and answers their taps (data-od). Below
// 1100 px it draws nothing and leaves the phone's single column alone. What is open is a device's own setting, not events.
// ===========================================

import { outlineChapterRail } from './outlineChapterRail.read.js';
import { outlineBookCounts } from './outlineBookCounts.read.js';
import { outlineDeskRow } from './outlineDeskRow.read.js';
import { outlineOpenSlice } from './outlineOpenSlice.read.js';
import { scenarioColumns } from './scenarioColumns.read.js';
import { bookComments } from './bookComments.read.js';
import { commentTarget } from './commentTarget.read.js';
import { outlineSliceFields } from './outlineSliceFields.read.js';
import { sliceProgress } from '../buildProgress/sliceProgress.read.js';
import { sliceProgressChip } from '../buildProgress/progress.parts.js';
import { drawTraceStrip } from '../fieldTrace/strip.js';
import { chapterRail, bookCounts, deskRow, openSlice, sliceFieldChips, scenarioColumnsCard, bookCommentsColumn, commentTargetLink } from './outlineDesktop.parts.js';
import { ensureOutlineDesktopStyles } from './outlineDesktop.styles.js';
import { addScenarioInline, editScenarioValue } from './outlineDesktop.command.js';
import { outlineChapterHeading } from '../outline/outlineChapterHeading.read.js';
import { outlineChapterHead, outlineAddButtons, outlineNewChapterButton, outlineChapterStart, outlineSearchBox, outlineToolbar } from '../outline/outline.parts.js';
import { outlineAddKinds } from '../outline/outlineAddKinds.read.js';
import { outlineCanAddChapter } from '../outline/outlineCanAddChapter.read.js';
import { outlineChapterFirst } from '../outline/outlineChapterFirst.read.js';
import { outlineSearchField } from '../outline/outlineSearchField.read.js';
import { outlineToolbarOptions } from '../outline/outlineToolbarOptions.read.js';
import { statusChips } from '../filter/status.js';
import { isChapterFolded, toggleChapterFolded, isChapterBookmarked } from '../board/view.js';
import { openFixListSheet } from '../fieldSources/sheet.js';
import { openThread, openCommentsList } from '../comments/sheet.js';
import { commentDeviceId, replyToThread, resolveComment } from '../comments/command.js';
import { setMustHave } from '../scenarios/command.js';
import { render } from '../../ui/feed.js';
import { showToast } from '../../ui/toast.js';

const WIDE = '(min-width: 1100px)';
const OPEN_KEY = 'eventpad_outline_desktop_open', SHOWING_KEY = 'eventpad_outline_desktop_comments';
const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* this time only */ } };

// A device's own: which rows are open, which comments show, where the document is, what a jump is on
const openIds = new Set((() => { try { return JSON.parse(read(OPEN_KEY) || '[]'); } catch (e) { return []; } })());
let showing = read(SHOWING_KEY) === 'resolved' ? 'resolved' : 'open';
let current = null;          // the chapter the document is at ('' is "Not in a chapter")
let adding = null;           // the slice whose new-scenario name box is open
let replying = null;         // the thread a reply is being written to
let jumped = null;           // { commentId, sliceId, scenarioId }: where the last jump went
let targets = {};            // commentId → Comment Target, as last drawn (what a tap on a link means)

const saveOpen = () => write(OPEN_KEY, JSON.stringify([...openIds]));
export const outlineDesktopOn = () => typeof window !== 'undefined' && !!window.matchMedia?.(WIDE).matches;

// The chapter's anchor in the document
const anchorOf = id => `od-ch-${id || 'none'}`;

// One slice: its row, and opened, its body with its scenarios as columns
function sliceItem(state, row, ui) {
  const id = row.slice.id, open = openIds.has(id);
  const view = outlineDeskRow(state, row.slice, { open, trace: ui.trace });
  const slice = outlineOpenSlice(state, id, { editable: ui.editable, adding: adding === id });
  const body = !open ? '' : openSlice(slice, {
    fields: sliceFieldChips(outlineSliceFields(state, id, { trace: ui.trace })),
    scenarios: slice.scenarioIds.map(sid => `<div class="od-scw${jumped?.scenarioId === sid ? ' od-hl' : ''}">${scenarioColumnsCard(scenarioColumns(state, sid, { editable: ui.editable }))}</div>`).join('\n')
  });
  const hl = jumped && jumped.sliceId === id && !jumped.scenarioId ? ' od-hl' : '';
  return `<div class="od-item od-${view.kind}${open ? ' open' : ''}${hl}" id="od-s-${id}">${deskRow(view, { progress: sliceProgressChip(sliceProgress(state, id)) })}${body}</div>`;
}

function chapterSection(state, layout, chapter, ui) {
  const heading = outlineChapterHeading(state, chapter, { built: ui.built, searching: layout.searching });
  const head = chapter.loose ? (layout.hasChapters ? outlineChapterHead(heading) : '')
    : outlineChapterHead(heading, { searching: layout.searching, bookmarked: isChapterBookmarked(chapter.id) });
  const body = chapter.folded ? ''
    : chapter.rows.length ? chapter.rows.map(r => sliceItem(state, r, ui)).join('\n')
    : '<div class="ol-empty">No slices yet — add the first step below, or move some here</div>';
  const add = chapter.folded || layout.filtering || !ui.editable ? '' : outlineAddButtons(outlineAddKinds(state, { chapterId: chapter.id || '' }));
  return `<section class="od-sec ol-section" id="${anchorOf(chapter.id)}" data-chapter="${chapter.id || ''}">${head}${ui.extras.chapter(chapter)}${body}${add}</section>`;
}

// The document's middle column
function documentHtml(state, layout, ui) {
  const first = outlineChapterFirst(state, layout, { editable: ui.editable });
  const sections = first.chapterFirst ? outlineChapterStart(first) : layout.chapters.map(ch => chapterSection(state, layout, ch, ui)).join('\n');
  const empty = layout.chapters.length ? '' : layout.searching ? `<div class="ol-empty">Nothing matches that search</div>` : layout.filtering ? '<div class="ol-empty">Nothing at that stage</div>' : '';
  const bar = outlineToolbar({ ...outlineToolbarOptions(state, layout, { arrangeable: ui.arrangeable }), fields: false, select: false, openComments: 0, showFields: false, selecting: false });
  return `${ui.extras.top}${bar}${sections}${empty}${first.chapterFirst ? '' : outlineNewChapterButton(outlineCanAddChapter(state, layout))}`;
}

const railHtml = (state, layout) => `${chapterRail(outlineChapterRail(state, layout, { current }))}
  <div class="od-lbl sec">Show</div>
  ${statusChips(layout.stageSlices)}
  <div class="od-lbl sec">Book</div>
  ${bookCounts(outlineBookCounts(state))}`;

function commentsHtml(state) {
  const view = bookComments(state, { showing, me: commentDeviceId(), replying, highlight: jumped?.commentId || null });
  targets = {};
  const links = {};
  view.cards.forEach(c => {
    const t = commentTarget(state, c.commentId);
    if (!t) return;
    targets[c.commentId] = t;
    links[c.commentId] = commentTargetLink(t);
  });
  return bookCommentsColumn(view, { targets: links });
}

// ctx: state (replayed once by the Outline), layout (Outline Layout), extras (the goal and the chapter extras), built, query,
// editable (this device can change the book), arrangeable, trace (Field Trace, or null). Returns true when it drew; false (and cleared its columns) when not.
export function drawOutlineDesktop(container, ctx) {
  const { state, layout } = ctx;
  const takes = outlineDesktopOn() && !layout.literature && !layout.verify && !layout.rounds;
  if (!takes) { if (container.querySelector('#odShell')) container.innerHTML = ''; return false; }
  ensureOutlineDesktopStyles();
  if (current === null) current = layout.chapters[0]?.id || '';
  const rail = container.querySelector('#odRail'), cmts = container.querySelector('#odCmts');
  const keep = { rail: rail?.scrollTop || 0, cmts: cmts?.scrollTop || 0 };
  if (!container.querySelector('#odShell')) {
    container.innerHTML = `<div class="od-shell" id="odShell"><aside class="od-rail" id="odRail"></aside>
      <main class="od-doc"><div class="od-doc-in"><div id="odSearch">${outlineSearchBox(outlineSearchField(state, { query: ctx.query }))}</div><div id="odBody"></div></div></main>
      <div class="od-cmts" id="odCmts"></div></div>`;
  }
  container.querySelector('.ol-search-clear').hidden = !ctx.query;
  container.querySelector('#odRail').innerHTML = railHtml(state, layout);
  container.querySelector('#odBody').innerHTML = documentHtml(state, layout, ctx);
  container.querySelector('#odCmts').innerHTML = commentsHtml(state);
  container.classList.toggle('tracing', !!ctx.trace);
  drawTraceStrip(ctx.trace);
  container.querySelector('#odRail').scrollTop = keep.rail;
  container.querySelector('#odCmts').scrollTop = keep.cmts;
  return true;
}

// ---------- Taps, boxes and the scroll ----------

const box = () => document.getElementById('outlineView');
const markCurrent = () => document.querySelectorAll('#odRail .od-ch').forEach(el => el.classList.toggle('on', el.dataset.chapter === current));

function scrollTo(el) { el?.scrollIntoView({ behavior: 'smooth', block: el.classList.contains('od-sec') ? 'start' : 'center' }); }

// Scroll-spy: the chapter whose heading has passed under the header is the one the rail marks
function spy() {
  const view = box();
  if (!view || !view.querySelector('#odShell')) return;
  const top = (document.querySelector('.header')?.getBoundingClientRect().bottom || 0) + 40;
  let at = null;
  for (const s of view.querySelectorAll('.od-sec')) { if (s.getBoundingClientRect().top <= top) at = s.dataset.chapter; else break; }
  if (at === null) at = view.querySelector('.od-sec')?.dataset.chapter ?? '';
  if (at !== current) { current = at; markCurrent(); }
}

// A comment's link: unfold its chapter, open its slice, scroll to the place and outline it (and the comment's card)
function jump(commentId) {
  const t = targets[commentId];
  if (!t) return;
  jumped = { commentId, sliceId: t.sliceId, scenarioId: t.scenarioId };
  if (t.chapterId && isChapterFolded(t.chapterId)) toggleChapterFolded(t.chapterId);
  if (t.sliceId && !openIds.has(t.sliceId)) { openIds.add(t.sliceId); saveOpen(); }
  render();
  requestAnimationFrame(() => {
    const el = t.scenarioId ? document.querySelector(`.od-sc[data-scenario="${t.scenarioId}"]`)?.closest('.od-scw') : document.getElementById(`od-s-${t.sliceId}`);
    scrollTo(el);
    document.querySelector(`.od-cm-card[data-comment="${commentId}"]`)?.scrollIntoView({ block: 'nearest' });
  });
}

const focusLater = sel => requestAnimationFrame(() => document.querySelector(sel)?.focus());

function reply(commentId, text) {
  const why = replyToThread({ threadId: commentId, text });
  if (why === 'Pick a nickname first') { const t = targets[commentId]; t?.sliceId ? openThread(t.sliceId, t.scenarioId) : openCommentsList(() => {}); showToast('Pick a nickname first, then reply'); return; }
  if (why) { showToast(why); return; }
  replying = null;
  render();
}

const ACTIONS = {
  go: t => { current = t.dataset.chapter; markCurrent(); scrollTo(document.getElementById(anchorOf(t.dataset.chapter))); },
  'chapter-gaps': t => openFixListSheet({ chapterId: t.dataset.chapter }),
  'book-gaps': () => openFixListSheet({ all: true }),
  toggle: t => { const id = t.dataset.slice; if (openIds.has(id)) openIds.delete(id); else openIds.add(id); saveOpen(); render(); },
  'add-scenario': t => { adding = t.dataset.slice; render(); focusLater('.od-new-name'); },
  'cancel-add': () => { adding = null; render(); },
  must: t => { setMustHave(t.dataset.scenario, t.getAttribute('aria-pressed') !== 'true'); render(); },
  reply: t => { replying = t.dataset.comment; render(); focusLater('.od-cm-form textarea'); },
  'cancel-reply': () => { replying = null; render(); },
  resolve: t => { const why = resolveComment(t.dataset.comment); if (why) showToast(why); else { if (jumped?.commentId === t.dataset.comment) jumped = null; render(); } },
  show: t => { showing = t.dataset.show === 'resolved' ? 'resolved' : 'open'; write(SHOWING_KEY, showing); render(); },
  jump: t => jump(t.dataset.comment)
};

// A value box left: write it, then redraw and put the focus where it went (the next box, when Tab moved it)
function commit(input) {
  const why = editScenarioValue({ scenarioId: input.dataset.scenario, part: input.dataset.odEdit, key: input.dataset.key, index: Number(input.dataset.index || 0), text: input.value });
  if (why) showToast(why);
  setTimeout(() => {
    const a = document.activeElement, sig = a?.dataset?.odEdit ? { ...a.dataset } : null;
    render();
    if (!sig) return;
    const next = [...document.querySelectorAll('[data-od-edit]')].find(e => e.dataset.odEdit === sig.odEdit && e.dataset.scenario === sig.scenario && e.dataset.key === sig.key && (e.dataset.index || '') === (sig.index || ''));
    next?.focus();
  }, 0);
}

export function initOutlineDesktop(view) {
  view?.addEventListener('click', e => {
    const t = e.target.closest('[data-od]');
    if (t && ACTIONS[t.dataset.od]) ACTIONS[t.dataset.od](t);
    else if (jumped && !e.target.closest('.od-hl, .od-cm-card.hl')) { jumped = null; view.querySelectorAll('.od-hl, .od-cm-card.hl').forEach(el => el.classList.remove('od-hl', 'hl')); }
  });
  view?.addEventListener('submit', e => {
    const f = e.target.closest('[data-od-form]');
    if (!f) return;
    e.preventDefault();
    const text = f.elements.text?.value ?? f.elements.name?.value;
    if (f.dataset.odForm === 'reply') reply(f.dataset.comment, text);
    else {
      const why = addScenarioInline(f.dataset.slice, text);
      if (why) { showToast(why); return; }
      adding = null;
      render();
    }
  });
  view?.addEventListener('change', e => { if (e.target.dataset?.odEdit) commit(e.target); });
  view?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.dataset?.odEdit) { e.preventDefault(); e.target.blur(); }
    if (e.key === 'Escape' && e.target.closest?.('.od-new, .od-cm-form')) { adding = null; replying = null; render(); }
  });
  window.addEventListener('scroll', spy, { passive: true });
  window.matchMedia?.(WIDE).addEventListener?.('change', () => render());
}
