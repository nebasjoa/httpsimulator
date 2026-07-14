import type { CommandResult, RepoState } from '../types';
import { hasFlag } from '../argsHelpers';
import { refreshWorkingDirStatus } from '../status';

export function clean(state: RepoState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { state, outcome: { label: 'fatal: not a git repository', detail: 'fatal: not a git repository (or any of the parent directories): .git', error: true } };
  }
  const force = hasFlag(args, '-f');
  if (!force) {
    return {
      state,
      outcome: {
        label: 'git clean',
        detail: 'fatal: clean.requireForce defaults to true and neither -f nor -i given; refusing to clean',
        error: true,
      },
    };
  }
  if (state.workingDir.status !== 'untracked') {
    return {
      state,
      outcome: {
        label: 'git clean -fd',
        detail: `Nothing to clean - ${state.fileName} is tracked by git (clean only removes untracked files/directories, never tracked ones).`,
      },
    };
  }
  state.workingDir.content = '';
  refreshWorkingDirStatus(state);
  return {
    state,
    outcome: {
      label: 'git clean -fd',
      detail: `Deletes the untracked file ${state.fileName} from disk. Because it was never staged or committed, git has no object for it anywhere - not in the index, not in any commit, not in the reflog. This is the one command in this simulator with no undo.`,
      destructive: true,
      recoverable: false,
      warning: 'There is no git command that brings this back. Outside of an editor\'s local undo history or an OS-level backup, this content is simply gone.',
    },
  };
}
