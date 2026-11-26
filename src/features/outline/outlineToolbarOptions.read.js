// ===========================================
// OUTLINE - Toolbar options (SV: Outline Toolbar Options)
// Above the chapters: how many slices match (while searching or showing one stage), whether Fields and Select
// are offered (not on an empty book; no Select while searching), whether Arrange is (a book with chapters that can be
// arranged here, not while searching or showing one stage), and the open comments' count.
// layout: the Outline Layout. arrangeable: this book can be arranged here (a question the screen asks).
// ===========================================

import { openComments } from '../comments/read.js';

export function outlineToolbarOptions(state, layout, { arrangeable = false } = {}) {
  return {
    total: layout.filtering ? `${layout.shown} of ${layout.sliceCount} slices` : '',
    fields: layout.sliceCount > 0, select: layout.sliceCount > 0 && !layout.filtering,
    arrange: arrangeable && layout.hasChapters && !layout.filtering, openComments: openComments(state).length
  };
}
