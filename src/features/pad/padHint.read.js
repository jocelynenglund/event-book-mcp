// ===========================================
// PAD - Hint (SV: Pad Hint)
// The line on an empty canvas saying how to start. null once there is anything sketched.
// ===========================================

export function padHint(state, { editable = true, draft = null } = {}) {
  const pad = state.pad || { notes: {}, frames: {} };
  if (draft || Object.keys(pad.notes).length || Object.keys(pad.frames).length) return null;
  return { text: editable ? 'Double-click (or double-tap) to add a note' : 'Nothing sketched here yet' };
}
