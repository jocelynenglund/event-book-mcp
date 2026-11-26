// OUTLINE GOALS - what the MCP outline tool prints for this feature (feature: outline-goals)
// The goal, the criteria with their proven state, and each chapter's description, draft events and ladder. Empty for a book with none.
import { outlineGoal } from './outlineGoal.read.js';
import { acceptanceCriteria } from './acceptanceCriteria.read.js';
import { chapterDraftEvents } from './chapterDraftEvents.read.js';
import { chapterLadder } from './chapterLadder.read.js';
import { criteriaProven } from './criteriaProven.read.js';
import { goalsOf } from './rules.js';

// Lines to put under the book's title line
export function outlineGoalsLines(state) {
  const { goal } = outlineGoal(state);
  const rows = acceptanceCriteria(state);
  const lines = [];
  if (goal) lines.push(`Goal: ${goal}`);
  if (rows.length) {
    const { proven, total } = criteriaProven(state);
    lines.push(`Acceptance criteria (${proven} of ${total} proven by a must-have scenario):`);
    rows.forEach(r => lines.push(`  ${r.proven ? '✓' : '○'} ${r.text}${r.chapters.length ? ` [${r.chapters.map(c => c.name).join(', ')}]` : ''}${r.proven ? ` · proven by ${r.proofs.map(p => p.name).join('; ')}` : ' · not proven yet'}`));
  }
  return lines;
}

// Lines for one chapter: its description, its draft events and how far it has got (nothing for a chapter with none of them)
export function chapterGoalsLines(state, chapterId) {
  const description = String(goalsOf(state).descriptions[chapterId] || '').trim();
  const { drafts } = chapterDraftEvents(state, chapterId);
  const { reached } = chapterLadder(state, chapterId);
  if (!description && !drafts.length && reached === 'none') return [];
  return [`   ${description ? description + ' · ' : ''}${drafts.length ? `draft events: ${drafts.join(', ')} · ` : ''}reached: ${reached}`];
}
