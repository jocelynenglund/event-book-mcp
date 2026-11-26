// STORED ELSEWHERE - the rules (pure). Some things you don't want to save as events: a table, a config file, a document. A sticky of the
// event lane can say where it is kept instead: a kind (free text: "table", "config", "document", "legacy table"…) and an optional name
// (the table, the file). Every kind is drawn the same brown way and is a source of fields (nothing is checked against a command).

export const SUGGESTED_KINDS = ['table', 'document', 'config', 'legacy table'];
export const MAX_KIND = 30, MAX_NAME = 80;

// Text as kept: no angle brackets, double quotes or control characters (a kind and a name end up in labels and attributes everywhere), one space between words
const plain = text => String(text ?? '').replace(/[<>"\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();

// A kind as it is matched: trimmed, one space between words, lower case
export const kindKey = kind => plain(kind).toLowerCase();

// What an element says about where it is kept: { kind, name } or null when the kind is empty
export function storageOf(kind, name) {
  const k = kindKey(kind);
  if (!k) return null;
  const n = plain(name);
  return { kind: k, ...(n ? { name: n } : {}) };
}

// The older ElementTableSet { table: name | true } as a storage: a legacy table, named when the table is
export const legacyStorage = table => (typeof table === 'string' && table.trim() ? storageOf('legacy table', table) : table === true ? storageOf('legacy table') : null);

// What a card, a chip or the share picture says: "TABLE · Friends", "CONFIG · pricing.json", "LEGACY TABLE"
export const storageLabel = storage => (storage ? `${storage.kind.toUpperCase()}${storage.name ? ` · ${storage.name}` : ''}` : '');

// What the Outline and the agent tools say: "stored as table: Friends"
export const storageNote = storage => (storage ? `stored as ${storage.kind}${storage.name ? `: ${storage.name}` : ''}` : '');

// An orange note whose first line ends with a one-word kind in brackets: "FriendTable (table)", "Pricing (config)", "Party settings (document)".
// -> { storage: { kind } | null, name } with the marker taken off the name. "(external)" is not a kind (it has its own meaning); a name that is only the marker is left as it is
const MARKER = /\s*\(\s*([\p{L}\p{N}-]+)\s*\)\s*$/u;
export function storageMarker(firstLine) {
  const line = String(firstLine ?? ''), m = line.match(MARKER);
  if (!m || /^external$/i.test(m[1])) return { storage: null, name: line };
  const bare = line.slice(0, m.index).trim();
  return bare ? { storage: storageOf(m[1]), name: bare } : { storage: null, name: line };
}

// A plan file's { storage: { kind, name? } }: the first thing wrong with it, as one line; null when fine (or absent)
export function storageError(storage) {
  if (storage === undefined) return null;
  if (storage === null || typeof storage !== 'object' || Array.isArray(storage)) return 'storage is {kind, name?}: kind is what it is stored as ("table", "config", "document"…), name the table or file';
  const odd = Object.keys(storage).filter(k => k !== 'kind' && k !== 'name');
  if (odd.length) return `storage takes kind and name; not ${odd.join(', ')}`;
  if (typeof storage.kind !== 'string' || !kindKey(storage.kind)) return 'storage needs a kind: what it is stored as ("table", "config", "document"…)';
  if (kindKey(storage.kind).length > MAX_KIND) return `The kind is at most ${MAX_KIND} letters`;
  if (storage.name !== undefined && (typeof storage.name !== 'string' || storage.name.trim().length > MAX_NAME)) return `storage name is the table or file, at most ${MAX_NAME} letters`;
  return null;
}

// What a plan-file event says about where it is kept: { storage } or the older { table } (a legacy table's name) -> { kind, name? } | null
export const storageFromSpec = ({ storage, table }) => (storage ? storageOf(storage.kind, storage.name) : legacyStorage(table));
