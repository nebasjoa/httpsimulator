import type { CommandResult, RepoState } from '../types';
import { appendReflog, currentBranchName, headCommit, headCommitId, isAncestor, resolveRef } from '../repo';
import { hasFlag, optionValue, positionals } from '../argsHelpers';
import { refreshWorkingDirStatus } from '../status';

function notARepo(state: RepoState): CommandResult {
  return { state, outcome: { label: 'fatal: not a git repository', detail: 'fatal: not a git repository (or any of the parent directories): .git', error: true } };
}

export function branch(state: RepoState, args: string[]): CommandResult {
  if (!state.initialized) return notARepo(state);
  const force = hasFlag(args, '-D', '--delete-force');
  const del = force || hasFlag(args, '-d', '--delete');
  const names = positionals(args, []);

  if (del) {
    const name = names[0];
    if (!name || !state.branches[name]) {
      return { state, outcome: { label: `git branch -d ${name ?? ''}`, detail: `error: branch '${name ?? ''}' not found.`, error: true } };
    }
    if (currentBranchName(state) === name) {
      return { state, outcome: { label: `git branch -d ${name}`, detail: `error: Cannot delete branch '${name}' checked out.`, error: true } };
    }
    const targetCommit = state.branches[name];
    const head = headCommitId(state);
    const merged = head ? isAncestor(state, targetCommit, head) : false;
    if (!merged && !force) {
      return {
        state,
        outcome: {
          label: `git branch -d ${name}`,
          detail: `error: The branch '${name}' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D ${name}'.`,
          error: true,
        },
      };
    }
    delete state.branches[name];
    return {
      state,
      outcome: {
        label: `git branch ${force ? '-D' : '-d'} ${name}`,
        detail: merged
          ? `Deletes branch '${name}'. Every commit it pointed to is already reachable from other branches, so nothing is lost.`
          : `Force-deletes branch '${name}', which had commits not reachable from anywhere else. Those commits still exist in the object database - they're just "dangling" now. Recover with "git reflog" to find ${targetCommit.slice(0, 7)}, then "git branch <name> ${targetCommit.slice(0, 7)}".`,
        destructive: !merged,
        recoverable: !merged,
        undo: !merged ? `git branch ${name} ${targetCommit.slice(0, 7)}` : undefined,
      },
    };
  }

  const name = names[0];
  if (!name) {
    const list = Object.keys(state.branches)
      .map((b) => `${b === currentBranchName(state) ? '* ' : '  '}${b}`)
      .join('\n');
    return { state, outcome: { label: 'git branch', detail: list || '(no branches yet - make your first commit)' } };
  }
  const startPoint = names[1];
  const startId = startPoint ? resolveRef(state, startPoint) : headCommitId(state);
  if (!startId || !state.commits[startId]) {
    return {
      state,
      outcome: {
        label: `git branch ${name}${startPoint ? ' ' + startPoint : ''}`,
        detail: startPoint ? `fatal: not a valid object name: '${startPoint}'` : "fatal: not a valid object name: 'HEAD'.\nMake a commit first.",
        error: true,
      },
    };
  }
  if (state.branches[name]) {
    return { state, outcome: { label: `git branch ${name}`, detail: `fatal: A branch named '${name}' already exists.`, error: true } };
  }
  state.branches[name] = startId;
  return {
    state,
    outcome: {
      label: `git branch ${name}${startPoint ? ' ' + startPoint : ''}`,
      detail: startPoint
        ? `Creates a new ref '${name}' pointing at ${startId.slice(0, 7)} (resolved from '${startPoint}') - handy for recovering a commit that's no longer reachable from any branch.`
        : `Creates a new ref '${name}' pointing at ${startId.slice(0, 7)} (the current HEAD). Just a label on a commit - it does not switch you onto it.`,
    },
  };
}

function doCheckout(state: RepoState, target: string, createNew: boolean): CommandResult {
  if (!state.initialized) return notARepo(state);
  if (!target) {
    return { state, outcome: { label: 'git checkout', detail: 'usage: git checkout <branch|commit> (or "git checkout -b <name>")', error: true } };
  }
  const commit = headCommit(state);
  const dirty = state.workingDir.content !== (state.staging ?? commit?.content ?? '');
  if (dirty) {
    return {
      state,
      outcome: {
        label: `git checkout ${target}`,
        detail: `error: Your local changes to ${state.fileName} would be overwritten by checkout.\nPlease commit your changes or stash them before you switch branches.`,
        error: true,
      },
    };
  }

  if (createNew) {
    if (state.branches[target]) {
      return { state, outcome: { label: `git checkout -b ${target}`, detail: `fatal: A branch named '${target}' already exists.`, error: true } };
    }
    const startId = headCommitId(state);
    if (!startId) {
      return { state, outcome: { label: `git checkout -b ${target}`, detail: "fatal: not a valid object name: 'HEAD'.\nMake a commit first.", error: true } };
    }
    state.branches[target] = startId;
    state.head = { type: 'branch', name: target };
    appendReflog(state, `checkout: moving to ${target}`, startId, startId);
    return {
      state,
      outcome: {
        label: `git checkout -b ${target}`,
        detail: `Creates branch '${target}' at ${startId.slice(0, 7)} and switches HEAD to it in one step (branch + checkout).`,
      },
    };
  }

  const id = resolveRef(state, target);
  if (!id || !state.commits[id]) {
    return { state, outcome: { label: `git checkout ${target}`, detail: `error: pathspec '${target}' did not match any file(s) known to git`, error: true } };
  }
  const targetCommit = state.commits[id];
  const isBranch = !!state.branches[target];
  const previousHead = headCommitId(state);
  state.head = isBranch ? { type: 'branch', name: target } : { type: 'detached', commit: id };
  state.workingDir.content = targetCommit.content;
  state.staging = null;
  appendReflog(state, `checkout: moving to ${target}`, previousHead, id);
  refreshWorkingDirStatus(state);
  return {
    state,
    outcome: {
      label: `git checkout ${target}`,
      detail: isBranch
        ? `Switches HEAD to branch '${target}' and updates ${state.fileName} to match its tip commit ${id.slice(0, 7)}.`
        : `Checks out commit ${id.slice(0, 7)} directly. HEAD is now "detached" - it points at a commit, not a branch. Any new commits here won't belong to a branch unless you run "git branch <name>" (or "git switch -c <name>") before moving elsewhere.`,
    },
  };
}

export function checkout(state: RepoState, args: string[]): CommandResult {
  const createFlag = hasFlag(args, '-b');
  const pos = positionals(args, ['-b']);
  // `git checkout <ref> -- <file>` restores a single file from another ref without moving HEAD.
  if (args.includes('--')) {
    const dashIndex = args.indexOf('--');
    const ref = args[dashIndex - 1] ?? 'HEAD';
    const id = resolveRef(state, ref);
    const commit = id ? state.commits[id] : undefined;
    if (!commit) return { state, outcome: { label: `git checkout ${ref} --`, detail: `error: pathspec '${ref}' did not match any file(s) known to git`, error: true } };
    const overwrote = state.workingDir.content !== commit.content;
    state.workingDir.content = commit.content;
    state.staging = commit.content;
    refreshWorkingDirStatus(state);
    return {
      state,
      outcome: {
        label: `git checkout ${ref} -- ${state.fileName}`,
        detail: `Restores ${state.fileName} to the version from ${ref} (${commit.id.slice(0, 7)}) into both the working directory and the index, without moving HEAD or switching branches.`,
        destructive: overwrote,
        recoverable: false,
        warning: overwrote ? 'Any uncommitted edits that were in the working directory before this are now overwritten and gone.' : undefined,
      },
    };
  }
  if (createFlag) return doCheckout(state, optionValue(args, '-b') ?? pos[0] ?? '', true);
  return doCheckout(state, pos[0] ?? '', false);
}

export function switchBranch(state: RepoState, args: string[]): CommandResult {
  const createFlag = hasFlag(args, '-c');
  const pos = positionals(args, ['-c']);
  if (createFlag) return doCheckout(state, optionValue(args, '-c') ?? pos[0] ?? '', true);
  return doCheckout(state, pos[0] ?? '', false);
}

export function tag(state: RepoState, args: string[]): CommandResult {
  if (!state.initialized) return notARepo(state);
  const del = hasFlag(args, '-d');
  const annotated = hasFlag(args, '-a');
  const message = optionValue(args, '-m');
  const names = positionals(args, ['-m']);
  const name = names[0];

  if (del) {
    if (!name || !state.tags[name]) {
      return { state, outcome: { label: `git tag -d ${name ?? ''}`, detail: `error: tag '${name ?? ''}' not found.`, error: true } };
    }
    delete state.tags[name];
    return { state, outcome: { label: `git tag -d ${name}`, detail: `Deletes the local tag '${name}'. The commit it pointed to is untouched.` } };
  }

  if (!name) {
    const list = Object.keys(state.tags).join('\n');
    return { state, outcome: { label: 'git tag', detail: list || '(no tags yet)' } };
  }
  const id = headCommitId(state);
  if (!id) {
    return { state, outcome: { label: `git tag ${name}`, detail: "fatal: not a valid object name: 'HEAD'.", error: true } };
  }
  if (state.tags[name]) {
    return { state, outcome: { label: `git tag ${name}`, detail: `fatal: tag '${name}' already exists`, error: true } };
  }
  state.tags[name] = { commit: id, annotated: annotated || !!message, message };
  return {
    state,
    outcome: {
      label: `git tag ${name}`,
      detail: `${annotated || message ? 'Creates an annotated tag' : 'Creates a lightweight tag'} '${name}' pointing at ${id.slice(0, 7)}. Tags don't move as new commits are made - they're a permanent label, commonly used for releases.`,
    },
  };
}
