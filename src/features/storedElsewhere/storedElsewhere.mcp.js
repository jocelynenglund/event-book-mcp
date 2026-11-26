// What the agent tools (tools/eventpad-mcp) say about stored-elsewhere stickies: "(stored as table: Friends)" beside the sticky in the outline.
import { storageNote } from './storedElsewhere.rules.js';

export const outlineNote = el => storageNote(el.storage);
