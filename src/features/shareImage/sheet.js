// ===========================================
// SHARE IMAGE - Sheet (preview, options, share)
// ===========================================

import { projectState } from '../../core/projections.js';
import { readModelEvents, getEventStream } from '../../core/eventStore.js';
import { showSheet } from '../../ui/sheets.js';
import { showToast } from '../../ui/toast.js';
import { renderModelImage, renderSlides, ensureFonts } from './render.js';
import { renderOutlineImage } from './outlineImage.js';
import { renderPadImage } from './padImage.js';
import { padPictureShot } from './padPictureShot.read.js';
import { padSelectionNow } from '../pad/view.js';
import { getView } from '../../ui/feed.js';
import { modelDetailShareShot } from './modelDetailShareShot.read.js';
import { shareScopeChoices } from './shareScopeChoices.read.js';
import { shareFileName } from './shareFileName.read.js';
import { shareSheetControls } from './shareSheetControls.read.js';
import { shareSheetStart } from './shareSheetStart.read.js';
import { scopeButtons, shareScopeButton, shareFormatButton, shareOptionChip } from './shareImage.parts.js';

const OPTS_KEY = 'eventpad_share_opts';
let opts = { theme: 'light', showProps: true, foldChapters: true, showDescription: true, showScenarios: false, showValues: false, showSliceNotes: false, showUsage: false, slides: false, outline: false };
// Picture (the board), Slides 4:5, or the Outline (a table of contents)
try { opts = { ...opts, ...JSON.parse(localStorage.getItem(OPTS_KEY) || '{}') }; } catch (e) { /* storage blocked */ }
// The Pad's are for this opening of the sheet, never kept: the picture of the Pad (what a Share from the Pad starts on), only what is selected,
// the chapters frames were made into, and whether the link lands on the Pad
const PAD_KEYS = ['pad', 'selectionOnly', 'showMade', 'openOnPad'];
Object.assign(opts, { pad: false, selectionOnly: false, showMade: false, openOnPad: false });
const saveOpts = () => { try { localStorage.setItem(OPTS_KEY, JSON.stringify(Object.fromEntries(Object.entries(opts).filter(([k]) => !PAD_KEYS.includes(k))))); } catch (err) { /* storage blocked */ } };

// What's shared: the whole model (null) or one chapter. Picked fresh each time.
let scope = null;
// Or one slice ('slice:<id>' in the What menu), from the slice's own menu
let sliceScope = null;
// Which model: the open one (null), or a shelf's from the library (its id)
let sourceId = null;
const sourceEvents = () => (sourceId ? readModelEvents(sourceId) : null);
const sourceState = () => projectState(sourceId ? readModelEvents(sourceId) : undefined);

// For the share link: the events of the model being shared (null = the open one)
export function shareSourceEvents() { return sourceEvents(); }
export function shareSourceId() { return sourceId; }
// The scope picked now (null: the whole model; 'slice:<id>'; chapter ids joined by commas): what a link carries too
export function shareScopeNow() { return scope; }
// Does the link land on the Pad (so the Pad comes along, whatever the scope)
export function shareOpenOnPad() { return !!opts.openOnPad; }
let blobs = [];        // one picture, or one per slide
let previewUrl = null;

function fileName(index = null) {
  const { base } = shareFileName(sourceState(), scope);
  return base + (opts.pad ? '-pad' : '') + (index === null ? '' : `-${index + 1}`) + '.png';
}

const toBlob = canvas => new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

// What to share: this slice (from its menu), the whole model (a small book only), or chapters. A picker
// with a search, since a big model's chapters run past what a phone's own list scrolls through well.
let choice = null; // Share Scope Choices
const escapeAttr = text => String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
function renderScope(state) {
  choice = shareScopeChoices(state, scope, sliceScope);
  scope = choice.scope;
  document.getElementById('shareScope').innerHTML = choice.options.map(c =>
    `<option value="${escapeAttr(c.id)}" ${(scope || '') === c.id ? 'selected' : ''}>${escapeAttr(c.name)}</option>`).join('');
  document.getElementById('shareScopeMount').innerHTML = shareScopeButton({ ...choice, showButton: choice.showButton && !opts.pad, open: !document.getElementById('shareScopePanel').hidden });
  renderScopeList();
}

function renderScopeList() {
  document.getElementById('shareScopeList').innerHTML = scopeButtons(choice.scopes,
    { slice: choice.slice, query: document.getElementById('shareScopeSearch')?.value || '' });
}

function openScopePanel(open) {
  const panel = document.getElementById('shareScopePanel');
  panel.hidden = !open;
  document.getElementById('shareScopeBtn')?.setAttribute('aria-expanded', String(open));
  if (open) {
    const search = document.getElementById('shareScopeSearch');
    search.value = '';
    renderScopeList();
    // Only a long list needs the search box
    search.hidden = !choice.showSearch;
    if (!search.hidden) search.focus();
    // On a short phone the list opens below the fold of the scrolling sheet: bring it up
    panel.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }
}

function pickScope(id) {
  if (id && !id.startsWith('slice:')) {
    // A chapter: on or off, keeping the others; the panel stays open for more
    const ids = chosenChapters();
    const next = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
    scope = next.join(',') || null;
    document.getElementById('shareScope').value = next[0] || '';
    refreshPreview();
    return;
  }
  scope = id || null;
  document.getElementById('shareScope').value = id;
  openScopePanel(false);
  refreshPreview();
}

let refreshRun = 0;
const chosenChapters = () => (scope && !scope.startsWith('slice:') ? scope.split(',') : []);

async function refreshPreview() {
  const run = ++refreshRun;
  // data-busy until the picture for these settings is on screen (tests wait on it)
  const preview = document.getElementById('sharePreview');
  preview.dataset.busy = '1';
  await ensureFonts();
  const state = sourceState();
  renderScope(state);
  // Everything the picture draws, from its one view
  const shot = modelDetailShareShot(state, { scope, options: opts, events: sourceEvents() || getEventStream() });
  // The Pad's selection is the open book's: a shelf's book is pictured whole
  const selection = sourceId ? null : padSelectionNow();
  const controls = shareSheetControls(state, { scope, options: opts, events: sourceEvents() || getEventStream(), selection });
  const padPicture = controls.format.some(f => f.value === 'pad' && f.active);
  document.getElementById('shareFormat').innerHTML = controls.format.map(shareFormatButton).join('');
  document.getElementById('shareChips').innerHTML = controls.chips.map(shareOptionChip).join('');
  document.getElementById('shareMoreSummary').textContent = controls.summary;

  const padShot = padPicture && padPictureShot(state, { selection: opts.selectionOnly && controls.chips.some(c => c.opt === 'selectionOnly' && c.shown) ? selection : null, options: opts });
  const canvases = padPicture
    ? [renderPadImage({ shot: padShot, theme: opts.theme })]
    : opts.outline
    ? [renderOutlineImage({ shot, theme: opts.theme })]
    : opts.slides
      ? renderSlides({ shot, theme: opts.theme })
      : [renderModelImage({ shot, theme: opts.theme })];
  const made = await Promise.all(canvases.map(toBlob));
  // A newer refresh (another chip tapped meanwhile) wins
  if (run !== refreshRun) return;
  if (!made.length || made.some(b => !b)) {
    blobs = [];
    delete preview.dataset.busy;
    showToast("Couldn't draw the image. Try one chapter or slides");
    return;
  }
  blobs = made;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(blobs[0]);
  preview.onload = () => { if (run === refreshRun) delete preview.dataset.busy; };
  preview.src = previewUrl;
  document.getElementById('shareGo').textContent = blobs.length > 1 ? `Share ${blobs.length} slides` : 'Share image';
  const count = document.getElementById('shareSlideCount');
  count.hidden = blobs.length < 2;
  count.textContent = `Slide 1 of ${blobs.length}. All of them are shared together.`;
}

// modelId: share a shelf's model from the library without opening it.
// sliceId: start with just that slice (from the slice's menu). chapterId: start on that chapter (from its menu).
export function openShareSheet(modelId = null, { sliceId = null, chapterId = null } = {}) {
  sourceId = typeof modelId === 'string' ? modelId : null;
  // From the Pad: its picture (the selection, when there is one) and a link that opens on the Pad
  const fromPad = !sourceId && getView() === 'pad', selection = fromPad ? padSelectionNow() : null;
  Object.assign(opts, { pad: fromPad, selectionOnly: !!selection && selection.noteIds.length + selection.frameIds.length > 0, showMade: false, openOnPad: fromPad });
  const start = shareSheetStart(sourceState(), typeof sliceId === 'string' ? sliceId : null, typeof chapterId === 'string' ? chapterId : null, { fromPad });
  if (start.empty) {
    showToast('Add a slice first');
    return;
  }
  // A link made earlier may be for another model or an older version: start fresh
  const linkBox = document.getElementById('shareLinkResult');
  if (linkBox) { linkBox.hidden = true; linkBox.innerHTML = ''; }
  sliceScope = sliceId;
  scope = start.scope;
  openScopePanel(false);
  showSheet('shareSheet');
  refreshPreview();
}

function download() {
  blobs.forEach((blob, i) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName(blobs.length > 1 ? i : null);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  });
}

async function share() {
  if (!blobs.length) return;
  const files = blobs.map((blob, i) => new File([blob], fileName(blobs.length > 1 ? i : null), { type: 'image/png' }));
  if (navigator.canShare && navigator.canShare({ files })) {
    try {
      await navigator.share({ files, title: shareFileName(sourceState(), scope).title });
    } catch (e) {
      if (e.name !== 'AbortError') download();
    }
  } else {
    download();
    showToast(files.length > 1 ? `${files.length} slides downloaded` : 'Image downloaded');
  }
}

export function initShareImage() {
  document.getElementById('shareBtn').addEventListener('click', openShareSheet);
  document.getElementById('shareScope').addEventListener('change', e => { scope = e.target.value || null; refreshPreview(); });
  document.getElementById('shareScopeSearch').addEventListener('input', renderScopeList);
  document.getElementById('shareScopeDone').addEventListener('click', () => openScopePanel(false));
  document.getElementById('shareScopeList').addEventListener('click', e => {
    const opt = e.target.closest('[data-scope]');
    if (opt) pickScope(opt.dataset.scope);
  });
  document.getElementById('shareSheet').addEventListener('click', e => {
    const opt = e.target.closest('[data-share-opt]');
    if (opt) {
      // Chips toggle between their on and off value
      const { shareOpt, on, off } = opt.dataset;
      const value = String(opts[shareOpt]) === on ? off : on;
      opts[shareOpt] = value === 'true' ? true : value === 'false' ? false : value;
      saveOpts();
      refreshPreview();
    }
    const set = e.target.closest('[data-share-set]');
    if (set) {
      opts.slides = set.dataset.value === 'slides';
      opts.outline = set.dataset.value === 'outline';
      opts.pad = set.dataset.value === 'pad';
      saveOpts();
      refreshPreview();
    }
    if (e.target.closest('#shareScopeBtn')) openScopePanel(document.getElementById('shareScopePanel').hidden);
    if (e.target.closest('#shareGo')) share();
    if (e.target.closest('#shareDownload')) download();
  });
}
