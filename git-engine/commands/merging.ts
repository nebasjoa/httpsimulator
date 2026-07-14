import type { CommandResult, RepoState } from '../types';
import { appendReflog, currentBranchName, headCommit, headCommitId, mergeBase, nextClock, resolveRef, simulatedHash } from '../repo';
import { hasFlag, positionals } from '../argsHelpers';
import { refreshWorkingDirStatus } from '../status';
import { threeWayMerge } from '../merge';

function notARepo(state: RepoState): CommandResult {
  return { state, outcome: { label: 'fatal: not a git repository', detail: 'fatal: not a git repository (or any of the parent directories): .git', error: true } };
}

export function merge(state: RepoState, args: string[]): CommandResult {
  if (!state.initialized) return notARepo(state);

  if (hasFlag(args, '--abort')) {
    if (!state.conflict) {
      return { state, outcome: { label: 'git merge --abort', detail: 'fatal: There is no merge to abort.', error: true } };
    }
    state.conflict = null;
    state.staging = null;
    state.workingDir.content = headCommit(state)?.content ?? '';
    refreshWorkingDirStatus(state);
    return { state, outcome: { label: 'git merge --abort', detail: `Cancels the in-progress merge and restores ${state.fileName} to what HEAD had before the merge started.` } };
  }

  if (state.conflict) {
    return { state, outcome: { label: 'git merge', detail: 'error: You have not concluded your merge (MERGE_HEAD exists).\nPlease, commit your changes before you merge (or run "git merge --abort").', error: true } };
  }

  const targetRef = positionals(args)[0];
  const targetId = targetRef ? resolveRef(state, targetRef) : null;
  if (!targetId || !state.commits[targetId]) {
    return { state, outcome: { label: `git merge ${targetRef ?? ''}`, detail: `merge: ${targetRef ?? ''} - not something we can merge`, error: true } };
  }
  const headId = headCommitId(state);
  if (!headId) {
    return { state, outcome: { label: `git merge ${targetRef}`, detail: 'fatal: no commits yet on this branch', error: true } };
  }
  if (headId === targetId) {
    return { state, outcome: { label: `git merge ${targetRef}`, detail: 'Already up to date.' } };
  }
  const base = mergeBase(state, headId, targetId);
  const currentBranch = currentBranchName(state) ?? 'HEAD';

  if (base === targetId) {
    return { state, outcome: { label: `git merge ${targetRef}`, detail: `Already up to date - ${targetRef} is already an ancestor of ${currentBranch}.` } };
  }

  if (base === headId) {
    if (state.head?.type === 'branch') state.branches[state.head.name] = targetId;
    else if (state.head?.type === 'detached') state.head.commit = targetId;
    state.staging = null;
    state.workingDir.content = state.commits[targetId].content;
    appendReflog(state, `merge ${targetRef}: Fast-forward`, headId, targetId);
    refreshWorkingDirStatus(state);
    return {
      state,
      outcome: {
        label: `git merge ${targetRef}`,
        detail: `Fast-forward merge: ${currentBranch} had no commits of its own, so git just moves its pointer up to ${targetId.slice(0, 7)}. No merge commit is created because there was nothing to reconcile.`,
      },
    };
  }

  const baseCommit = base ? state.commits[base] : undefined;
  const ours = headCommit(state)!.content;
  const theirs = state.commits[targetId].content;
  const { content, conflict } = threeWayMerge(baseCommit?.content ?? '', ours, theirs, targetRef!);

  if (conflict) {
    state.conflict = { path: state.fileName, base: baseCommit?.content ?? '', ours, theirs, oursLabel: currentBranch, theirsLabel: targetRef! };
    state.workingDir.content = content;
    state.staging = null;
    refreshWorkingDirStatus(state);
    return {
      state,
      outcome: {
        label: `git merge ${targetRef}`,
        detail: `CONFLICT (content): Merge conflict in ${state.fileName}. Both ${currentBranch} and ${targetRef} changed the file since their common ancestor ${base ? base.slice(0, 7) : '(root)'}. Edit ${state.fileName} to resolve the <<<<<<< / ======= / >>>>>>> markers, then "git add" + "git commit" (or "git merge --abort" to give up).`,
      },
    };
  }

  const clock = nextClock(state);
  const message = `Merge branch '${targetRef}' into ${currentBranch}`;
  const newId = simulatedHash(`${headId},${targetId}:${message}:${clock}`);
  state.commits[newId] = { id: newId, parents: [headId, targetId], message, content, clock };
  if (state.head?.type === 'branch') state.branches[state.head.name] = newId;
  else if (state.head?.type === 'detached') state.head.commit = newId;
  state.staging = null;
  state.workingDir.content = content;
  appendReflog(state, `merge ${targetRef}: Merge made by the 'ort' strategy.`, headId, newId);
  refreshWorkingDirStatus(state);
  return {
    state,
    outcome: {
      label: `git merge ${targetRef}`,
      detail: `Creates merge commit ${newId.slice(0, 7)} with two parents (${headId.slice(0, 7)} and ${targetId.slice(0, 7)}), auto-resolving the change cleanly since only one side actually differed from the common ancestor ${base ? base.slice(0, 7) : '(root)'}.`,
    },
  };
}
