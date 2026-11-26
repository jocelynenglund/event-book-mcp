// BOARD SHEETS - Slice Still There (SV): is a slice a link points at still in the book (not deleted)? Asked when a jump is
// about to scroll to it, so a link to a deleted slice can say so instead of doing nothing.
import { projectState } from '../../../core/projections.js';

export const sliceStillThere = (book, sliceId) => !!book.slices[sliceId];

// For a tap: the book as it is now
export const liveSlice = sliceId => sliceStillThere(projectState(), sliceId);
