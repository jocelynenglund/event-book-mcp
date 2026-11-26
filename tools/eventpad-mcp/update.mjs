// update_mcp: bring the MCP server's own git checkout up to date (works from the eventpad repo and from the packed
// public event-book-mcp clone alike), and the one-line "Update available" note on a session's first reply.
// git runs with argument arrays, never a shell string, and never prompts (offline or without a login it just fails).
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SERVER = 'tools/eventpad-mcp/server.mjs';
const git = (cwd, args, timeout = 30000) => new Promise((resolve, reject) => {
  execFile('git', args, { cwd, timeout, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: 'true' }, maxBuffer: 4 << 20 }, (err, stdout, stderr) => {
    if (err) reject(new Error((stderr || err.message).trim().split('\n')[0] || 'git failed')); else resolve(stdout.trim());
  });
});
const versionIn = root => { try { return fs.readFileSync(path.join(root, SERVER), 'utf8').match(/serverInfo: \{ name: 'eventpad', version: '([^']+)'/)?.[1] || null; } catch (e) { return null; } };
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// The checkout root, or null when the server does not run from a git checkout
async function checkoutOf(dir) {
  try { return await git(dir, ['rev-parse', '--show-toplevel'], 5000); } catch (e) { return null; }
}
// The branch updates follow: the one origin calls its default (origin/HEAD), else main, else master
async function defaultBranch(root) {
  try { return (await git(root, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], 5000)).replace(/^origin\//, ''); } catch (e) { /* not set */ }
  for (const b of ['main', 'master']) { try { await git(root, ['rev-parse', '--verify', `refs/remotes/origin/${b}`], 5000); return b; } catch (e) { /* next */ } }
  return 'main';
}

// updateMcp({ dir, version }): the reply text, or throws a one-line reason it did not update
export async function updateMcp({ dir, version }) {
  const root = await checkoutOf(dir);
  if (!root) throw new Error(`Not updated: the server runs from ${dir}, which is not a git checkout (reinstall it with git clone)`);
  const dirty = await git(root, ['status', '--porcelain', '--untracked-files=no'], 10000);
  if (dirty) throw new Error(`Not updated: ${root} has uncommitted changes (${dirty.split('\n').length} files). Commit or stash them first`);
  const branch = await git(root, ['rev-parse', '--abbrev-ref', 'HEAD'], 5000), main = await defaultBranch(root);
  if (branch !== main) throw new Error(`Not updated: ${root} is on branch "${branch}", not ${main}. Check out ${main} first`);
  try { await git(root, ['fetch', '--quiet', 'origin']); } catch (e) { throw new Error(`Not updated: could not fetch from origin (${e.message})`); }
  const before = await git(root, ['rev-parse', 'HEAD'], 5000);
  try { await git(root, ['pull', '--ff-only', '--quiet', 'origin', main]); } catch (e) { throw new Error(`Not updated: ${e.message} (a fast-forward was not possible)`); }
  const after = await git(root, ['rev-parse', 'HEAD'], 5000);
  if (before === after) return `Already up to date (${version}, ${after.slice(0, 7)}).`;
  const subjects = (await git(root, ['log', '--format=%s', '-15', `${before}..${after}`], 10000)).split('\n').filter(Boolean);
  const total = Number(await git(root, ['rev-list', '--count', `${before}..${after}`], 10000));
  const now = versionIn(root);
  return [`Updated ${version} → ${now || 'unknown'} (${before.slice(0, 7)} → ${after.slice(0, 7)}, ${plural(total, 'new commit', 'new commits')}):`,
    ...subjects.map(s => `- ${s}`), ...(total > subjects.length ? [`- … and ${total - subjects.length} more`] : []),
    'Reconnect: /mcp → eventpad (a running server cannot reload itself).'].join('\n');
}

// One cheap look at origin, at most once per start and never longer than 3 s: "Update available: N new commits" or '' (silent when offline)
let looked = false;
export async function updateNote({ dir, version }) {
  if (looked) return '';
  looked = true;
  try {
    const root = await checkoutOf(dir);
    if (!root) return '';
    // Only a checkout on the default branch is nudged: a branch someone is working on is theirs to move
    if (process.env.EVENTPAD_UPDATE_CHECK === 'off') return '';
    const main = await defaultBranch(root);
    if ((await git(root, ['rev-parse', '--abbrev-ref', 'HEAD'], 3000)) !== main) return '';
    await git(root, ['fetch', '--quiet', 'origin'], 3000);
    const behind = Number(await git(root, ['rev-list', '--count', `HEAD..refs/remotes/origin/${main}`], 3000));
    if (!(behind > 0)) return '';
    let newer = null;
    try { newer = (await git(root, ['show', `refs/remotes/origin/${main}:${SERVER}`], 3000)).match(/serverInfo: \{ name: 'eventpad', version: '([^']+)'/)?.[1] || null; } catch (e) { /* just "newer" */ }
    // Written for the agent: the person only sees it when the agent says it
    return `Tell the person: Event Book's agent tools are ${plural(behind, 'commit', 'commits')} behind (v${version} → ${newer && newer !== version ? `v${newer}` : 'newer'}). Say update_mcp to update, then reconnect with /mcp.`;
  } catch (e) { return ''; }
}
