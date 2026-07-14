import type { CommandResult, RepoState } from '../types';
import {
  appendReflog,
  currentBranchName,
  headCommit,
  headCommitId,
  isAncestor,
  mergeBase,
  nextClock,
  resolveRef,
  simulatedHash,
} from '../repo';
import { hasFlag, positionals } from '../argsHelpers';
import { refreshWorkingDirStatus } from '../status';
import { threeWayMerge } from '../merge';

function notARepo(state: RepoState): CommandResult {
  return { state, outcome: { label: 'fatal: not a git repository', detail: 'fatal: not a git repository (or any of the parent directories): .git', error: true } };
}

export function reset(state: RepoState, args: string[]): CommandResult {
  if (!state.initialized) return notARepo(state);
  const hard = hasFlag(args, '--hard');
  const soft = hasFlag(args, '--soft');
  const refArg = positionals(args)[0] ?? 'HEAD';
  const targetId = resolveRef(state, refArg);
  if (!targetId || !state.commits[targetId]) {
    return { state, outcome: { label: `git reset ${refArg}`, detail: `fatal: ambiguous argument '${refArg}': unknown revision or path not in the working tree.`, error: true } };
  }
  const beforeId = headCommitId(state);
  const currentTracked = state.staging ?? headCommit(state)?.content ?? '';
  const hadUncommittedWork = state.workingDir.content !== currentTracked;
  const leavesCommitsBehind = !!beforeId && beforeId !== targetId && !isAncestor(state, beforeId, targetId);

  if (state.head?.type === 'branch') state.branches[state.head.name] = targetId;
  else if (state.head?.type === 'detached') state.head.commit = targetId;

  if (soft) {
    // staging + working dir untouched
  } else if (hard) {
    state.staging = null;
    state.workingDir.content = state.commits[targetId].content;
  } else {
    state.staging = null; // mixed (default): unstage, keep working-dir content as-is
  }
  appendReflog(state, `reset: moving to ${refArg}`, beforeId, targetId);
  refreshWorkingDirStatus(state);

  const mode = soft ? '--soft' : hard ? '--hard' : '--mixed';
  const unrecoverablePart = hard && hadUncommittedWork;
  const detail =
    mode === '--soft'
      ? `Moves the branch pointer to ${targetId.slice(0, 7)} only. The index and working directory are untouched, so your staged/uncommitted changes are preserved on top of the new HEAD.`
      : mode === '--mixed'
        ? `Moves the branch pointer to ${targetId.slice(0, 7)} and unstages everything, but leaves your working-directory content alone - it will now show as "modified" relative to the new HEAD.`
        : `Moves the branch pointer to ${targetId.slice(0, 7)} AND overwrites the working directory to match it, discarding any staged or uncommitted edits to ${state.fileName}.`;

  const warningParts: string[] = [];
  if (leavesCommitsBehind) {
    warningParts.push(`Commit(s) after ${targetId.slice(0, 7)} are no longer reachable from this branch - but they still exist. Recover with "git reflog" to find the old sha, then "git reset --hard <sha>".`);
  }
  if (unrecoverablePart) {
    warningParts.push(`Your uncommitted changes to ${state.fileName} were never saved anywhere git tracks, so this part cannot be undone.`);
  }

  return {
    state,
    outcome: {
      label: `git reset ${mode} ${refArg}`,
      detail,
      destructive: hard || leavesCommitsBehind,
      recoverable: !unrecoverablePart,
      warning: warningParts.length ? warningParts.join(' ') : undefined,
      undo: leavesCommitsBehind && beforeId ? `git reset --hard ${beforeId.slice(0, 7)}` : undefined,
    },
  };
}

export function revert(state: RepoState, args: string[]): CommandResult {
  if (!state.initialized) return notARepo(state);
  const ref = positionals(args)[0];
  const id = ref ? resolveRef(state, ref) : null;
  const commit = id ? state.commits[id] : undefined;
  if (!commit) {
    return { state, outcome: { label: `git revert ${ref ?? ''}`, detail: `fatal: bad revision '${ref ?? ''}'`, error: true } };
  }
  const revertParentId = commit.parents[0];
  const parentContent = revertParentId ? (state.commits[revertParentId]?.content ?? '') : '';
  const headC = headCommit(state);
  const currentContent = state.staging ?? headC?.content ?? '';
  const theirsLabel = `parent of ${id!.slice(0, 7)}`;
  const { content, conflict } = threeWayMerge(commit.content, currentContent, parentContent, theirsLabel);

  if (conflict) {
    state.conflict = { path: state.fileName, base: commit.content, ours: currentContent, theirs: parentContent, oursLabel: 'HEAD', theirsLabel };
    state.workingDir.content = content;
    state.staging = null;
    refreshWorkingDirStatus(state);
    return {
      state,
      outcome: {
        label: `git revert ${ref}`,
        detail: `Tries to apply the inverse of ${id!.slice(0, 7)} ("${commit.message}") but it conflicts with changes made since then. Resolve ${state.fileName}, then "git add" + "git commit" to finish the revert.`,
      },
    };
  }
  const parents = headCommitId(state) ? [headCommitId(state)!] : [];
  const clock = nextClock(state);
  const message = `Revert "${commit.message}"`;
  const newId = simulatedHash(`${parents.join(',')}:${message}:${clock}`);
  state.commits[newId] = { id: newId, parents, message, content, clock };
  if (state.head?.type === 'branch') state.branches[state.head.name] = newId;
  else if (state.head?.type === 'detached') state.head.commit = newId;
  state.staging = null;
  state.workingDir.content = content;
  appendReflog(state, `revert: ${message}`, parents[0] ?? null, newId);
  refreshWorkingDirStatus(state);
  return {
    state,
    outcome: {
      label: `git revert ${ref}`,
      detail: `Creates a brand-new commit ${newId.slice(0, 7)} whose content is the inverse of ${id!.slice(0, 7)}. Unlike reset, this doesn't rewrite or remove any existing commit - safe to use even on history that's already been pushed and shared.`,
    },
  };
}

export function cherryPick(state: RepoState, args: string[]): CommandResult {
  if (!state.initialized) return notARepo(state);
  const ref = positionals(args)[0];
  const id = ref ? resolveRef(state, ref) : null;
  const commit = id ? state.commits[id] : undefined;
  if (!commit) {
    return { state, outcome: { label: `git cherry-pick ${ref ?? ''}`, detail: `fatal: bad revision '${ref ?? ''}'`, error: true } };
  }
  const cherryParentId = commit.parents[0];
  const parentContent = cherryParentId ? (state.commits[cherryParentId]?.content ?? '') : '';
  const headC = headCommit(state);
  const currentContent = state.staging ?? headC?.content ?? '';
  const theirsLabel = `${id!.slice(0, 7)} ("${commit.message}")`;
  const { content, conflict } = threeWayMerge(parentContent, currentContent, commit.content, theirsLabel);

  if (conflict) {
    state.conflict = { path: state.fileName, base: parentContent, ours: currentContent, theirs: commit.content, oursLabel: 'HEAD', theirsLabel };
    state.workingDir.content = content;
    state.staging = null;
    refreshWorkingDirStatus(state);
    return {
      state,
      outcome: {
        label: `git cherry-pick ${ref}`,
        detail: `Tries to reapply ${id!.slice(0, 7)}'s change on top of HEAD but it conflicts. Resolve ${state.fileName}, then "git add" + "git commit" (or "git cherry-pick --continue") to finish.`,
      },
    };
  }
  const parents = headCommitId(state) ? [headCommitId(state)!] : [];
  const clock = nextClock(state);
  const newId = simulatedHash(`${parents.join(',')}:${commit.message}:cherry:${clock}`);
  state.commits[newId] = { id: newId, parents, message: commit.message, content, clock };
  if (state.head?.type === 'branch') state.branches[state.head.name] = newId;
  else if (state.head?.type === 'detached') state.head.commit = newId;
  state.staging = null;
  state.workingDir.content = content;
  appendReflog(state, `cherry-pick: ${commit.message}`, parents[0] ?? null, newId);
  refreshWorkingDirStatus(state);
  return {
    state,
    outcome: {
      label: `git cherry-pick ${ref}`,
      detail: `Copies the change introduced by ${id!.slice(0, 7)} onto the current branch as a brand-new commit ${newId.slice(0, 7)} with a different parent and a different hash - same content, different history.`,
    },
  };
}

export function rebase(state: RepoState, args: string[]): CommandResult {
  if (!state.initialized) return notARepo(state);
  const targetRef = positionals(args)[0];
  const targetId = targetRef ? resolveRef(state, targetRef) : null;
  if (!targetId) {
    return { state, outcome: { label: `git rebase ${targetRef ?? ''}`, detail: `fatal: invalid upstream '${targetRef ?? ''}'`, error: true } };
  }
  const branchName = currentBranchName(state);
  const headId = headCommitId(state);
  if (!headId) {
    return { state, outcome: { label: `git rebase ${targetRef}`, detail: 'fatal: no commits yet', error: true } };
  }
  const base = mergeBase(state, headId, targetId);
  if (base === targetId) {
    return { state, outcome: { label: `git rebase ${targetRef}`, detail: `Current branch '${branchName}' is already based on '${targetRef}'; nothing to do.` } };
  }
  if (base === headId) {
    if (state.head?.type === 'branch') state.branches[state.head.name] = targetId;
    else if (state.head?.type === 'detached') state.head.commit = targetId;
    state.workingDir.content = state.commits[targetId]!.content;
    appendReflog(state, `rebase finished: returning to refs/heads/${branchName ?? 'HEAD'}`, headId, targetId);
    refreshWorkingDirStatus(state);
    return {
      state,
      outcome: {
        label: `git rebase ${targetRef}`,
        detail: `Your branch had no commits of its own beyond ${targetRef}, so this is just a fast-forward: HEAD moves to ${targetId.slice(0, 7)}.`,
      },
    };
  }

  const uniqueIds: string[] = [];
  let cursor: string | undefined = headId;
  while (cursor && cursor !== base) {
    uniqueIds.unshift(cursor);
    cursor = state.commits[cursor]?.parents[0];
  }
  const preRebaseTip = headId;
  let newParent = targetId;
  let conflicted = false;
  for (const oldId of uniqueIds) {
    const old = state.commits[oldId]!;
    const oldParentId = old.parents[0];
    const oldParentContent = oldParentId ? (state.commits[oldParentId]?.content ?? '') : '';
    const newParentContent = state.commits[newParent]!.content;
    const { content, conflict } = threeWayMerge(oldParentContent, newParentContent, old.content, `${oldId.slice(0, 7)} ("${old.message}")`, targetRef!);
    if (conflict) {
      conflicted = true;
      state.conflict = { path: state.fileName, base: oldParentContent, ours: newParentContent, theirs: old.content, oursLabel: targetRef!, theirsLabel: `${oldId.slice(0, 7)}` };
      state.workingDir.content = content;
      // Baked in as-is: this simplified simulator resolves the whole rebase in one step
      // rather than pausing per-commit like real git's rebase --continue/--skip/--abort.
    }
    const clock = nextClock(state);
    const newId = simulatedHash(`${newParent}:${old.message}:rebase:${clock}`);
    state.commits[newId] = { id: newId, parents: [newParent], message: old.message, content, clock };
    newParent = newId;
    if (conflicted) break;
  }
  if (state.head?.type === 'branch') state.branches[state.head.name] = newParent;
  else if (state.head?.type === 'detached') state.head.commit = newParent;
  state.staging = null;
  if (!conflicted) state.workingDir.content = state.commits[newParent]!.content;
  appendReflog(state, `rebase finished: returning to refs/heads/${branchName ?? 'HEAD'}`, preRebaseTip, newParent);
  refreshWorkingDirStatus(state);
  return {
    state,
    outcome: {
      label: `git rebase ${targetRef}`,
      detail: conflicted
        ? `Replays commits from ${branchName ?? 'HEAD'} onto ${targetId.slice(0, 7)} one at a time, but one of them conflicts with what's already on ${targetRef}. (This simplified simulator resolves the whole rebase as one step rather than pausing per-commit like real "rebase --continue".) Edit ${state.fileName} to fix the markers, then "git add" + "git commit".`
        : `Replays ${uniqueIds.length} commit(s) (${uniqueIds.map((i) => i.slice(0, 7)).join(', ')}) one at a time onto ${targetId.slice(0, 7)}, re-applying each one's actual change rather than copying its content verbatim. Every replayed commit gets a brand-new hash because its parent changed. The originals are still in the object database, dangling, recoverable via "git reflog" until garbage collection.`,
      destructive: true,
      recoverable: true,
      undo: `git reset --hard ${preRebaseTip.slice(0, 7)} (findable via git reflog if you forget the sha)`,
    },
  };
}

export function reflog(state: RepoState): CommandResult {
  if (!state.initialized) return notARepo(state);
  if (state.reflog.length === 0) {
    return { state, outcome: { label: 'git reflog', detail: '(empty - nothing has moved HEAD yet)' } };
  }
  const text = state.reflog.map((entry, i) => `${entry.to.slice(0, 7)} HEAD@{${i}}: ${entry.command}`).join('\n');
  return {
    state,
    outcome: {
      label: 'git reflog',
      detail: `${text}\n\nThis is your local safety net: every time HEAD moves, an entry is recorded here, even for commits that no branch points to anymore. It's the mechanism behind recovering from reset --hard, branch -D, and rebase.`,
    },
  };
}
