import type { CommandResult, RepoState } from '../types';
import { appendReflog, headCommit, headCommitId, nextClock, resolveRef, simulatedHash } from '../repo';
import { hasFlag, optionValue, positionals } from '../argsHelpers';
import { refreshWorkingDirStatus, statusLines } from '../status';
import { unifiedDiff } from '../diff';
import { formatLog } from '../log';

function notARepo(state: RepoState): CommandResult {
  return {
    state,
    outcome: { label: 'fatal: not a git repository', detail: 'fatal: not a git repository (or any of the parent directories): .git\nRun `git init` first.', error: true },
  };
}

export function init(state: RepoState): CommandResult {
  if (state.initialized) {
    return { state, outcome: { label: 'git init', detail: `Reinitialized existing Git repository.` } };
  }
  state.initialized = true;
  state.head = { type: 'branch', name: 'main' };
  return {
    state,
    outcome: {
      label: 'git init',
      detail:
        "Creates the (simulated) .git directory. HEAD now points at refs/heads/main - but that branch doesn't exist as a real ref yet. It only comes into existence at the first commit.",
    },
  };
}

export function status(state: RepoState): CommandResult {
  if (!state.initialized) return notARepo(state);
  return { state, outcome: { label: 'git status', detail: statusLines(state).join('\n') } };
}

export function add(state: RepoState, args: string[]): CommandResult {
  if (!state.initialized) return notARepo(state);
  const targets = positionals(args);
  if (targets.length === 0) {
    return { state, outcome: { label: 'git add', detail: 'Nothing specified, nothing added.', error: true } };
  }
  const resolvingConflict = !!state.conflict;
  state.staging = state.workingDir.content;
  if (resolvingConflict) {
    state.conflict = null;
    refreshWorkingDirStatus(state);
    return {
      state,
      outcome: {
        label: `git add ${state.fileName}`,
        detail: `Marks the conflict in ${state.fileName} as resolved by staging your edited version. Run "git commit" to complete the merge.`,
      },
    };
  }
  refreshWorkingDirStatus(state);
  return {
    state,
    outcome: {
      label: `git add ${state.fileName}`,
      detail: `Copies the current working-directory content of ${state.fileName} into the staging area (the index) as a byte-for-byte snapshot. It is not yet part of history - "git commit" is what makes it permanent.`,
    },
  };
}

export function commit(state: RepoState, args: string[]): CommandResult {
  if (!state.initialized) return notARepo(state);
  if (state.conflict) {
    return { state, outcome: { label: 'git commit', detail: 'error: Committing is not possible because you have unmerged files.\nfix conflicts and then commit the result.', error: true } };
  }
  const amend = hasFlag(args, '--amend');
  const message = optionValue(args, '-m', '--message') ?? (amend ? headCommit(state)?.message : undefined);
  if (!message) {
    return { state, outcome: { label: 'git commit', detail: 'Aborting commit due to empty commit message. Use -m "message".', error: true } };
  }

  if (amend) {
    const current = headCommit(state);
    if (!current) {
      return { state, outcome: { label: 'git commit --amend', detail: 'fatal: you have nothing to amend.', error: true } };
    }
    const content = state.staging ?? current.content;
    const oldId = current.id;
    const clock = nextClock(state);
    const newId = simulatedHash(`${current.parents.join(',')}:${message}:amend:${clock}`);
    state.commits[newId] = { id: newId, parents: current.parents, message, content, clock };
    if (state.head?.type === 'branch') state.branches[state.head.name] = newId;
    else if (state.head?.type === 'detached') state.head.commit = newId;
    state.staging = null;
    appendReflog(state, `commit (amend): ${message}`, oldId, newId);
    refreshWorkingDirStatus(state);
    return {
      state,
      outcome: {
        label: `git commit --amend`,
        detail: `Replaces the tip commit ${oldId.slice(0, 7)} with a new commit ${newId.slice(0, 7)} carrying the same parent(s) but a new snapshot/message. The old commit object still exists (git never mutates commits in place) - it's just unreferenced now, recoverable via "git reflog" until garbage collected.`,
        destructive: true,
        recoverable: true,
        undo: `git reset --hard ${oldId.slice(0, 7)} (or find it again via git reflog)`,
      },
    };
  }

  if (state.staging === null) {
    return { state, outcome: { label: 'git commit', detail: 'On branch\nnothing to commit, working tree clean', error: true } };
  }
  const parentId = headCommitId(state);
  const parents = parentId ? [parentId] : [];
  const clock = nextClock(state);
  const id = simulatedHash(`${parents.join(',')}:${message}:${clock}`);
  state.commits[id] = { id, parents, message, content: state.staging, clock };

  let detachedWarning = '';
  if (state.head?.type === 'branch') {
    state.branches[state.head.name] = id;
  } else if (state.head?.type === 'detached') {
    state.head.commit = id;
    detachedWarning = " You're in detached HEAD, so this commit is not on any branch - it will become unreachable the moment you check out a branch, unless you run \"git branch <name>\" first.";
  }
  state.staging = null;
  appendReflog(state, `commit: ${message}`, parentId, id);
  refreshWorkingDirStatus(state);
  return {
    state,
    outcome: {
      label: `git commit -m "${message}"`,
      detail: `Creates commit ${id.slice(0, 7)}, snapshotting the staged content of ${state.fileName} with parent ${parentId ? parentId.slice(0, 7) : '(none - root commit)'}.${detachedWarning}`,
    },
  };
}

export function rm(state: RepoState, args: string[]): CommandResult {
  if (!state.initialized) return notARepo(state);
  const cached = hasFlag(args, '--cached');
  const targets = positionals(args, []);
  const target = targets[0];
  if (target !== state.fileName) {
    return { state, outcome: { label: `git rm ${target ?? ''}`, detail: `fatal: pathspec '${target ?? ''}' did not match any files`, error: true } };
  }
  const hadCommit = !!headCommit(state);
  state.staging = '';
  if (cached) {
    refreshWorkingDirStatus(state);
    return {
      state,
      outcome: {
        label: `git rm --cached ${state.fileName}`,
        detail: `Stages the removal of ${state.fileName} but leaves it on disk untouched. The next commit will stop tracking it; your working copy is safe.`,
      },
    };
  }
  state.workingDir.content = '';
  refreshWorkingDirStatus(state);
  return {
    state,
    outcome: {
      label: `git rm ${state.fileName}`,
      detail: `Deletes ${state.fileName} from disk and stages the deletion. ${hadCommit ? 'The last committed version is still in history, so "git checkout HEAD -- ' + state.fileName + '" (or "git restore") can bring it back until you commit the deletion.' : 'There was no prior commit, so this content is gone for good.'}`,
      destructive: true,
      recoverable: hadCommit,
      undo: hadCommit ? `git checkout HEAD -- ${state.fileName}` : undefined,
    },
  };
}

export function mv(state: RepoState, args: string[]): CommandResult {
  if (!state.initialized) return notARepo(state);
  const [from, to] = positionals(args);
  if (!from || !to || from !== state.fileName) {
    return { state, outcome: { label: 'git mv', detail: `fatal: bad source, source=${from ?? ''}`, error: true } };
  }
  state.fileName = to;
  return {
    state,
    outcome: {
      label: `git mv ${from} ${to}`,
      detail: `Renames ${from} to ${to} and stages both the deletion of the old name and the addition of the new one - equivalent to "mv ${from} ${to} && git add ${to} && git rm --cached ${from}" done atomically.`,
    },
  };
}

export function restore(state: RepoState, args: string[]): CommandResult {
  if (!state.initialized) return notARepo(state);
  const staged = hasFlag(args, '--staged');
  const commit = headCommit(state);
  if (staged) {
    state.staging = null;
    refreshWorkingDirStatus(state);
    return {
      state,
      outcome: {
        label: 'git restore --staged',
        detail: `Unstages ${state.fileName} (removes it from the index) without touching your working-directory edits. Nothing is lost.`,
      },
    };
  }
  const restored = state.staging ?? commit?.content ?? '';
  const lostEdits = state.workingDir.content !== restored;
  state.workingDir.content = restored;
  refreshWorkingDirStatus(state);
  return {
    state,
    outcome: {
      label: 'git restore',
      detail: `Overwrites your working-directory copy of ${state.fileName} with the staged (or last committed) version, discarding any uncommitted edits.`,
      destructive: lostEdits,
      recoverable: false,
      warning: lostEdits ? 'Your uncommitted edits to the working directory are gone. Git never stored them anywhere, so there is no reflog entry and no way back.' : undefined,
    },
  };
}

export function diff(state: RepoState, args: string[]): CommandResult {
  if (!state.initialized) return notARepo(state);
  const staged = hasFlag(args, '--staged', '--cached');
  const commit = headCommit(state);
  const text = staged
    ? unifiedDiff(commit?.content ?? '', state.staging ?? commit?.content ?? '')
    : unifiedDiff(state.staging ?? commit?.content ?? '', state.workingDir.content);
  return {
    state,
    outcome: {
      label: staged ? 'git diff --staged' : 'git diff',
      detail: text || 'No differences.',
    },
  };
}

export function show(state: RepoState, args: string[]): CommandResult {
  if (!state.initialized) return notARepo(state);
  const ref = positionals(args)[0] ?? 'HEAD';
  const id = resolveRef(state, ref);
  const commit = id ? state.commits[id] : undefined;
  if (!commit) {
    return { state, outcome: { label: `git show ${ref}`, detail: `fatal: bad revision '${ref}'`, error: true } };
  }
  return {
    state,
    outcome: {
      label: `git show ${ref}`,
      detail: `commit ${commit.id}\n\n    ${commit.message}\n\n--- ${state.fileName} ---\n${commit.content}`,
    },
  };
}

export function log(state: RepoState, args: string[]): CommandResult {
  const text = formatLog(state, {
    oneline: hasFlag(args, '--oneline'),
    graph: hasFlag(args, '--graph'),
    all: hasFlag(args, '--all'),
  });
  return { state, outcome: { label: 'git log', detail: text, error: !state.initialized } };
}
