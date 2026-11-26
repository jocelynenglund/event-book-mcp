// ===========================================
// SYNC - Checkout Chip: what the chip beside the title of an open library book says about who has it: nobody (check it
// out), this device (check it in), or another device or an agent writing it (read only here; a tap offers to take it back).
// ===========================================

// holder: { deviceName, deviceKind, you } as holderOf() gives it (an agent's name already ItsyBOT · <name>), or null.
// state: in | here | away | away agent; action: checkout | checkin | takeover; agent: whether an agent holds it;
// icon, label: the chip's words; title: what a tap does
export function checkoutChip(holder) {
  if (!holder) return { state: 'in', action: 'checkout', agent: false, icon: '☁', label: 'Check out', title: 'Checked in: check it out to edit' };
  if (holder.you) return { state: 'here', action: 'checkin', agent: false, icon: '✏️', label: 'Check in', title: 'Checked out here: check it in when you’re done' };
  const agent = holder.deviceKind === 'agent';
  const name = String(holder.deviceName || '').trim() || (agent ? 'An agent' : 'Another device');
  return { state: agent ? 'away agent' : 'away', action: 'takeover', agent, icon: '✎', label: `${name} is writing`,
    title: `${name} has it checked out; you'll see their changes as they come. Tap to take it ${agent ? 'back' : 'over'}` };
}
