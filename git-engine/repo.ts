import type { Commit, RepoState } from './types';

export const TRACKED_FILE = 'test.txt';
export const DEFAULT_FILE_CONTENT = 'line 1: hello from test.txt\n';

// FNV-1a style string hash -> 7 hex chars. Deterministic, looks like a real git short
// hash, but is explicitly simulated - never presented as a cryptographic SHA1.
export function simulatedHash(seed: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return hex.slice(0, 7);
}

export function initialRepoState(): RepoState {
  return {
    initialized: false,
    fileName: TRACKED_FILE,
    commits: {},
    branches: {},
    tags: {},
    head: null,
    staging: null,
    workingDir: { content: DEFAULT_FILE_CONTENT, status: 'untracked' },
    stash: [],
    reflog: [],
    remoteName: null,
    remote: null,
    conflict: null,
    clock: 0,
  };
}

// Plain-data deep clone. RepoState is JSON-safe (strings/numbers/records/arrays only),
// so this is cheaper and more portable than structuredClone across test environments.
export function cloneState(state: RepoState): RepoState {
  return JSON.parse(JSON.stringify(state)) as RepoState;
}

export function currentBranchName(state: RepoState): string | null {
  return state.head?.type === 'branch' ? state.head.name : null;
}

export function headCommitId(state: RepoState): string | null {
  if (!state.head) return null;
  if (state.head.type === 'detached') return state.head.commit;
  return state.branches[state.head.name] ?? null;
}

export function headCommit(state: RepoState) {
  const id = headCommitId(state);
  return id ? state.commits[id] : undefined;
}

export function shortId(id: string): string {
  return id.slice(0, 7);
}

export function nextClock(state: RepoState): number {
  state.clock += 1;
  return state.clock;
}

// `from` must be captured by the caller BEFORE moving HEAD/the branch ref - this function
// does not infer it, since by the time most handlers call this the ref has already moved.
export function appendReflog(state: RepoState, command: string, from: string | null, to: string) {
  state.reflog.unshift({
    id: `HEAD@{${state.reflog.length}}`,
    command,
    from,
    to,
  });
}

// Find every ancestor commit id reachable from a starting commit (walks all parents).
export function ancestorsOf(state: RepoState, commitId: string): Set<string> {
  const seen = new Set<string>();
  const stack = [commitId];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const commit = state.commits[id];
    if (commit) stack.push(...commit.parents);
  }
  return seen;
}

export function isAncestor(state: RepoState, ancestorId: string, ofCommitId: string): boolean {
  return ancestorsOf(state, ofCommitId).has(ancestorId);
}

// Lowest common ancestor of two commits (merge-base), via simple ancestor-set intersection
// picked by highest clock value (most recent common ancestor). Good enough for the small,
// mostly-linear-with-one-file histories this simulator produces.
export function mergeBase(state: RepoState, a: string, b: string): string | null {
  const ancestorsA = ancestorsOf(state, a);
  const ancestorsB = ancestorsOf(state, b);
  let best: string | null = null;
  let bestClock = -Infinity;
  for (const id of ancestorsA) {
    if (ancestorsB.has(id)) {
      const clock = state.commits[id]?.clock ?? -Infinity;
      if (clock > bestClock) {
        bestClock = clock;
        best = id;
      }
    }
  }
  return best;
}

// A commit is "reachable" if some branch, tag, or HEAD points at it or one of its
// descendants. Anything else is dangling - still present in `commits` (git never
// deletes objects eagerly) but only recoverable via reflog. Used to grey out nodes
// in the commit graph.
// Resolves a git "revision" - HEAD, a branch/tag name, a (short) commit id, or any of
// those with trailing `~N` / `^` first-parent-ancestor suffixes (e.g. "main~2", "HEAD^").
export function resolveRef(state: RepoState, ref: string): string | null {
  if (!ref) return null;
  let base = ref;
  const suffixes: number[] = []; // each entry = how many first-parent hops
  for (;;) {
    const tilde = base.match(/~(\d*)$/);
    const caret = base.match(/\^$/);
    if (tilde) {
      suffixes.unshift(tilde[1] ? parseInt(tilde[1], 10) : 1);
      base = base.slice(0, base.length - tilde[0].length);
    } else if (caret) {
      suffixes.unshift(1);
      base = base.slice(0, base.length - 1);
    } else {
      break;
    }
  }
  let id = resolveBaseRef(state, base);
  if (!id) return null;
  for (const hops of suffixes) {
    for (let i = 0; i < hops; i++) {
      const found: Commit | undefined = state.commits[id!];
      if (!found || found.parents.length === 0) return null;
      id = found.parents[0] ?? null;
    }
  }
  return id;
}

function resolveBaseRef(state: RepoState, base: string): string | null {
  if (base === 'HEAD' || base === '') return headCommitId(state);
  const reflogMatch = base.match(/^HEAD@\{(\d+)\}$/);
  if (reflogMatch) {
    const n = parseInt(reflogMatch[1]!, 10);
    if (n === 0) return headCommitId(state);
    return state.reflog[n - 1]?.from ?? null;
  }
  if (state.branches[base]) return state.branches[base];
  if (state.tags[base]) return state.tags[base].commit;
  if (state.commits[base]) return base;
  const match = Object.keys(state.commits).find((id) => id.startsWith(base));
  return match ?? null;
}

export function reachableCommitIds(state: RepoState): Set<string> {
  const reachable = new Set<string>();
  const roots: string[] = [...Object.values(state.branches), ...Object.values(state.tags).map((t) => t.commit)];
  if (state.head?.type === 'detached') roots.push(state.head.commit);
  for (const root of roots) {
    for (const id of ancestorsOf(state, root)) reachable.add(id);
  }
  return reachable;
}
