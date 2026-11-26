// ===========================================
// SHARE IMAGE - Share Sheet Controls: the format buttons and option chips the sheet shows for this book and
// these settings: which chips are there (only what the book has), which are on, and the "Options · 3 on" line.
// ===========================================

import { hasValues } from '../scenarios/view.js';
import { hasUsage } from '../usage/view.js';
import { isChapterFolded } from '../board/view.js';

// options: the sheet's (theme, showProps, showDescription, showSliceNotes, showScenarios, showValues, showUsage,
// foldChapters, slides, outline; for the Pad: pad (the picture of the Pad), selectionOnly, showMade, openOnPad). scope: the one being shared.
// events: the shared book's, for its usage. selection: { noteIds, frameIds } selected on the Pad (this device's).
// The Pad is a format of its own when the book has a sketch; its chips are the theme, the selection, the chapters the frames were made into;
// "Link opens on the Pad" is the link's, whichever picture is shown.
export function shareSheetControls(state, { scope = null, options = {}, events = null, selection = null } = {}) {
  const sketched = !!state.pad && (Object.keys(state.pad.notes).length > 0 || Object.keys(state.pad.frames).length > 0);
  const pad = !!options.pad && sketched;
  const format = pad ? 'pad' : options.outline ? 'outline' : options.slides ? 'slides' : 'board';
  const scenarios = Object.values(state.scenarios);
  const chip = (opt, label, on, off, shown = true, id = null) => ({ opt, id, label, on, off, shown: shown && (!pad || opt === 'theme'), active: String(options[opt]) === on });
  const padChip = (opt, label, shown, id) => ({ ...chip(opt, label, 'true', 'false', true, id), shown: pad && shown });
  const selected = (selection?.noteIds?.length || 0) + (selection?.frameIds?.length || 0) > 0;
  const chips = [
    chip('theme', 'Chalkboard', 'dark', 'light'),
    // The outline lists slices; their stickies' fields are the board's
    chip('showProps', 'Fields', 'true', 'false', !options.outline, 'sharePropsOpt'),
    chip('showDescription', 'Description', 'true', 'false', !!state.modelDescription, 'shareDescOpt'),
    chip('showSliceNotes', 'Slice notes', 'true', 'false', Object.values(state.slices).some(s => s.description), 'shareNotesOpt'),
    chip('showScenarios', 'Scenarios', 'true', 'false', scenarios.length > 0, 'shareGwtOpt'),
    // Values: with the scenarios, when any of them has some
    chip('showValues', 'Values', 'true', 'false', !!options.showScenarios && scenarios.some(hasValues), 'shareValuesOpt'),
    // Usage: the outline of a book with usage (a build book the nightly job gave its app's use)
    chip('showUsage', 'Usage', 'true', 'false', !!options.outline && hasUsage(state, events), 'shareUsageOpt'),
    // Folded / All open only matters for the whole model (a picture or the outline), with a chapter folded
    chip('foldChapters', 'Folded chapters', 'true', 'false', !scope && !options.slides && state.chapterOrder.some(id => isChapterFolded(id)), 'shareFoldOpt'),
    padChip('selectionOnly', 'Selected only', selected, 'sharePadSelectedOpt'),
    padChip('showMade', 'Made chapters', Object.values(state.pad?.frames || {}).some(f => f.chapterId && state.chapters[f.chapterId]), 'sharePadMadeOpt'),
    { ...chip('openOnPad', 'Link opens on the Pad', 'true', 'false', true, 'shareOpenOnPadOpt'), shown: sketched }
  ];
  return {
    format: [['board', 'Picture'], ['slides', 'Slides 4:5'], ['outline', 'Outline'], ...(sketched ? [['pad', 'Picture of the Pad']] : [])].map(([value, label]) => ({ value, label, active: format === value })),
    chips,
    summary: `Options · ${chips.filter(c => c.shown && c.active).length} on`
  };
}
