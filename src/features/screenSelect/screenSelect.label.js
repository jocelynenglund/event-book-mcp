// SCREEN SELECT - The label a field wears (pure, imports nothing: core/constants.js uses it for propLabel)

// Does the field carry any of it?
export const isScreenField = p => !!p && !!(p.select || p.hidden || p.required !== undefined);

// The label a field wears where fields are listed: "guests ☑ from Guest List", "size ◉ from Sizes", "‹requestId› hidden", "email *", "note (optional)"; null for a plain one
export function screenFieldLabel(p) {
  if (!isScreenField(p)) return null;
  if (p.hidden) return `‹${p.name}› hidden`;
  const mark = p.required === true ? ' *' : p.required === false ? ' (optional)' : '';
  if (p.select) return `${p.name}${mark} ${p.select === 'many' ? '☑' : '◉'} from ${p.optionsFrom}`;
  return `${p.name}${mark}`;
}


// The hint a required field gives in the scenario editor
export const requiredHint = name => `${name} is required: a Given/When/Then where it is missing is a good refusal scenario`;
