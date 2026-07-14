import type { RepoState } from './types';
import { headCommit } from './repo';

// Recompute workingDir.status from the current commit/staging/working-dir triple.
// Called at the end of every command handler that could change it - keeps the derived
// field consistent without every handler having to reason about all the cases itself.
export function refreshWorkingDirStatus(state: RepoState) {
  const commit = headCommit(state);
  const trackedContent = state.staging ?? commit?.content;

  if (trackedContent === undefined) {
    state.workingDir.status = state.workingDir.content === '' ? 'clean' : 'untracked';
    return;
  }
  if (state.workingDir.content === '') {
    state.workingDir.status = trackedContent === '' ? 'clean' : 'deleted';
    return;
  }
  state.workingDir.status = state.workingDir.content === trackedContent ? 'clean' : 'modified';
}

export function statusLines(state: RepoState): string[] {
  if (!state.initialized) {
    return ['fatal: not a git repository (or any of the parent directories): .git'];
  }
  const branch = state.head?.type === 'branch' ? state.head.name : null;
  const lines: string[] = [];
  lines.push(branch ? `On branch ${branch}` : `HEAD detached at ${state.head?.type === 'detached' ? state.head.commit.slice(0, 7) : '?'}`);

  const commit = headCommit(state);
  const hasStagedChange = state.staging !== null && state.staging !== (commit?.content ?? '');
  const hasUnstagedChange =
    state.staging !== null ? state.workingDir.content !== state.staging : state.workingDir.content !== (commit?.content ?? '');

  if (state.conflict) {
    lines.push('You have unmerged paths.', `  (fix conflicts and run "git commit")`, `\tboth modified:   ${state.fileName}`);
    return lines;
  }

  if (hasStagedChange) {
    lines.push('Changes to be committed:', `\tmodified:   ${state.fileName}`);
  }
  if (hasUnstagedChange) {
    lines.push('Changes not staged for commit:', `\tmodified:   ${state.fileName}`);
  }
  if (state.workingDir.status === 'untracked' && !commit) {
    lines.push('Untracked files:', `\t${state.fileName}`);
  }
  if (!hasStagedChange && !hasUnstagedChange && commit) {
    lines.push('nothing to commit, working tree clean');
  }
  return lines;
}
