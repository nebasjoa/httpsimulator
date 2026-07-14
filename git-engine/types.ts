// Framework-agnostic git simulation engine. Mirrors engine/ (the HTTP engine): pure
// TypeScript, no Vue/Pinia/GSAP imports, no side effects. Everything here is a plain
// data transformation: RepoState in, RepoState + explanation out.

export interface Commit {
  id: string; // simulated short hash (7 hex chars) - NOT a real SHA1
  parents: string[]; // 0 parents = root commit, 2 = merge commit
  message: string;
  content: string; // full snapshot of test.txt at this commit
  clock: number; // logical timestamp for ordering (not wall-clock time)
}

export interface StashEntry {
  id: string;
  message: string;
  workingContent: string;
  stagedContent: string | null;
  baseCommit: string; // commit HEAD pointed to when the stash was made
}

export interface ReflogEntry {
  id: string;
  command: string; // e.g. "commit: fix bug", "reset: moving to a1b2c3d"
  from: string | null;
  to: string;
}

export interface ConflictState {
  path: string;
  base: string;
  ours: string;
  theirs: string;
  oursLabel: string;
  theirsLabel: string;
}

// A simplified remote repo: same commit graph shape as local, one level deep only
// (a remote never itself has a remote). Good enough for clone/fetch/pull/push teaching.
export interface RemoteState {
  commits: Record<string, Commit>;
  branches: Record<string, string>;
}

export type HeadRef = { type: 'branch'; name: string } | { type: 'detached'; commit: string };

export interface WorkingDir {
  content: string;
  status: 'clean' | 'modified' | 'untracked' | 'deleted';
}

export interface TagInfo {
  commit: string;
  annotated: boolean;
  message?: string;
}

export interface RepoState {
  initialized: boolean;
  fileName: string; // starts as "test.txt"; `git mv` can rename it
  commits: Record<string, Commit>;
  branches: Record<string, string>; // branch name -> commit id
  tags: Record<string, TagInfo>;
  head: HeadRef | null; // null before `git init`
  staging: string | null; // staged content of test.txt, null = nothing staged
  workingDir: WorkingDir;
  stash: StashEntry[];
  reflog: ReflogEntry[];
  remoteName: string | null; // e.g. "origin"
  remote: RemoteState | null;
  conflict: ConflictState | null; // set while a merge is stopped on a conflict
  clock: number; // logical counter, incremented per commit/reset/etc for ordering + id generation
}

// One entry in the steppable history the UI plays back - the git-world equivalent of
// engine/types.ts's SimEvent. 'edit' steps represent the user editing test.txt in "their
// editor" - deliberately distinct from 'command' steps, since editing a file is not a git
// operation (golden rule 4's honesty principle, applied to git: don't blur that boundary).
export interface GitStep {
  id: string;
  kind: 'command' | 'edit';
  input: string; // the raw command line, or "edit test.txt"
  label: string; // short label for the timeline
  detail: string; // 1-3 sentence explanation for the step-detail panel
  destructive: boolean; // flags data-loss-risk operations
  warning?: string; // shown prominently when destructive
  undo?: string; // how to undo this specific step, if possible
  recoverable: boolean; // only meaningful when destructive: can reflog/other means recover it?
  error: boolean; // command failed / was rejected (bad input, nothing to commit, etc.)
  stateBefore: RepoState;
  stateAfter: RepoState;
  durationMs: number;
}

export interface GitScenario {
  id: string;
  title: string;
  description: string;
  build(): GitStep[];
}

export interface CommandOutcome {
  label: string;
  detail: string;
  destructive?: boolean;
  warning?: string;
  undo?: string;
  recoverable?: boolean;
  error?: boolean;
}

export interface CommandResult {
  state: RepoState;
  outcome: CommandOutcome;
}

export type CommandHandler = (state: RepoState, args: string[], raw: string) => CommandResult;
