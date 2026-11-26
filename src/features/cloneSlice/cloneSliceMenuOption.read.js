// CLONE SLICE - Clone Slice Menu Option (SV)
// Whether a slice's ⋮ menu offers "Clone slice": for a change or a view that is a slice of its own. -> { sliceId, offered }
import { cloneable } from './cloneSlice.rules.js';

export const cloneSliceMenuOption = (book, sliceId) => ({ sliceId, offered: cloneable(book.slices[sliceId], sliceId, book) });
