import type { CommandResult, RepoState } from '../types';
import { headCommit, nextClock } from '../repo';
import { optionValue, positionals } from '../argsHelpers';
import { refreshWorkingDirStatus } from '../status';

function notARepo(state: RepoState): CommandResult {
  return { state, outcome: { label: 'fatal: not a git repository', detail: 'fatal: not a git repository (or any of the parent directories): .git', error: true } };
}

export function stash(state: RepoState, args: string[]): CommandResult {
  if (!state.initialized) return notARepo(state);
  const sub = positionals(args)[0] ?? 'push';

  if (sub === 'list') {
    const list = state.stash.map((s, i) => `stash@{${i}}: ${s.message}`).join('\n');
    return { state, outcome: { label: 'git stash list', detail: list || '(no stashes)' } };
  }

  if (sub === 'pop' || sub === 'apply') {
    if (state.stash.length === 0) {
      return { state, outcome: { label: `git stash ${sub}`, detail: 'No stash entries found.', error: true } };
    }
    const entry = state.stash[0]!;
    state.workingDir.content = entry.workingContent;
    state.staging = entry.stagedContent;
    if (sub === 'pop') state.stash = state.stash.slice(1);
    refreshWorkingDirStatus(state);
    return {
      state,
      outcome: {
        label: `git stash ${sub}`,
        detail:
          sub === 'pop'
            ? `Reapplies stash@{0} ("${entry.message}") to the working directory (and index) and removes it from the stash list.`
            : `Reapplies stash@{0} ("${entry.message}") to the working directory (and index) but keeps it in the stash list in case you need it again.`,
      },
    };
  }

  if (sub === 'drop') {
    if (state.stash.length === 0) {
      return { state, outcome: { label: 'git stash drop', detail: 'No stash entries found.', error: true } };
    }
    const dropped = state.stash[0]!;
    state.stash = state.stash.slice(1);
    return {
      state,
      outcome: {
        label: 'git stash drop',
        detail: `Deletes stash@{0} ("${dropped.message}") outright. This simulator does not keep dropped stashes recoverable - treat "git stash drop" as permanent.`,
        destructive: true,
        recoverable: false,
      },
    };
  }

  // push (default)
  const commit = headCommit(state);
  const tracked = state.staging ?? commit?.content ?? '';
  const dirty = state.workingDir.content !== tracked || (state.staging !== null && state.staging !== (commit?.content ?? ''));
  if (!dirty) {
    return { state, outcome: { label: 'git stash', detail: 'No local changes to save', error: true } };
  }
  const clock = nextClock(state);
  const message = optionValue(args, '-m', '--message') ?? `WIP on ${state.head?.type === 'branch' ? state.head.name : 'detached HEAD'}`;
  state.stash.unshift({
    id: `stash-${clock}`,
    message,
    workingContent: state.workingDir.content,
    stagedContent: state.staging,
    baseCommit: commit?.id ?? '',
  });
  state.workingDir.content = commit?.content ?? '';
  state.staging = null;
  refreshWorkingDirStatus(state);
  return {
    state,
    outcome: {
      label: 'git stash',
      detail: `Saves your staged and working-directory changes to ${state.fileName} as stash@{0} ("${message}") and restores the working directory to match HEAD, so you have a clean tree to switch branches or pull with.`,
    },
  };
}
