import type { CommandResult, RepoState } from '../types';
import { ancestorsOf, appendReflog, currentBranchName, headCommit, headCommitId, isAncestor, mergeBase, nextClock, simulatedHash } from '../repo';
import { hasFlag, positionals } from '../argsHelpers';
import { refreshWorkingDirStatus } from '../status';
import { threeWayMerge } from '../merge';

function notARepo(state: RepoState): CommandResult {
  return { state, outcome: { label: 'fatal: not a git repository', detail: 'fatal: not a git repository (or any of the parent directories): .git', error: true } };
}

function noRemote(label: string, state: RepoState): CommandResult {
  return { state, outcome: { label, detail: 'fatal: No configured remote. Run "git remote add origin <url>" first.', error: true } };
}

export function remote(state: RepoState, args: string[]): CommandResult {
  if (!state.initialized) return notARepo(state);
  const sub = args[0];
  if (sub === 'add') {
    const name = args[1];
    const url = args[2];
    if (!name || !url) return { state, outcome: { label: 'git remote add', detail: 'usage: git remote add <name> <url>', error: true } };
    if (state.remoteName) {
      return { state, outcome: { label: `git remote add ${name}`, detail: `fatal: remote ${state.remoteName} already exists.`, error: true } };
    }
    state.remoteName = name;
    state.remote = { commits: {}, branches: {} };
    return {
      state,
      outcome: { label: `git remote add ${name} ${url}`, detail: `Registers '${name}' as a shorthand for ${url}. It starts out empty - nothing has been pushed there yet.` },
    };
  }
  if (sub === '-v' || sub === undefined) {
    if (!state.remoteName) return { state, outcome: { label: 'git remote -v', detail: '(no remotes configured)' } };
    return { state, outcome: { label: 'git remote -v', detail: `${state.remoteName}\t(fetch)\n${state.remoteName}\t(push)` } };
  }
  return { state, outcome: { label: `git remote ${sub}`, detail: `git: '${sub}' is not a supported remote subcommand in this simulator.`, error: true } };
}

export function clone(state: RepoState, args: string[]): CommandResult {
  const url = positionals(args)[0];
  if (!url) return { state, outcome: { label: 'git clone', detail: 'usage: git clone <url>', error: true } };
  if (!state.remote || Object.keys(state.remote.branches).length === 0) {
    return {
      state,
      outcome: { label: `git clone ${url}`, detail: `fatal: repository '${url}' does not exist (nothing has been pushed to it yet in this simulation).`, error: true },
    };
  }
  const hadLocalOnlyWork = state.initialized && Object.keys(state.commits).some((id) => !(id in state.remote!.commits));
  state.initialized = true;
  state.commits = { ...state.commits, ...state.remote.commits };
  state.branches = { ...state.remote.branches };
  const defaultBranch = state.branches['main'] ? 'main' : Object.keys(state.branches)[0]!;
  const defaultTip = state.branches[defaultBranch]!;
  state.head = { type: 'branch', name: defaultBranch };
  state.staging = null;
  state.workingDir = { content: state.commits[defaultTip]!.content, status: 'clean' };
  state.remoteName = 'origin';
  refreshWorkingDirStatus(state);
  return {
    state,
    outcome: {
      label: `git clone ${url}`,
      detail: hadLocalOnlyWork
        ? `Copies history from ${url} and checks out '${defaultBranch}'. Your local branch pointers are overwritten to match origin - any commits you had that weren't already pushed are now unreachable from any branch (dangling), recoverable via "git reflog".`
        : `Copies the entire history from ${url} and checks out '${defaultBranch}'. 'origin' is set up automatically for future fetch/pull/push.`,
      destructive: hadLocalOnlyWork,
      recoverable: hadLocalOnlyWork || undefined,
    },
  };
}

export function fetch(state: RepoState): CommandResult {
  if (!state.initialized) return notARepo(state);
  if (!state.remoteName || !state.remote) return noRemote('git fetch', state);
  const before = Object.keys(state.commits).length;
  state.commits = { ...state.commits, ...state.remote.commits };
  const added = Object.keys(state.commits).length - before;
  return {
    state,
    outcome: {
      label: `git fetch ${state.remoteName}`,
      detail: `Downloads any commits from '${state.remoteName}' you don't already have (${added} new object${added === 1 ? '' : 's'}) and updates its remote-tracking information. Unlike pull, this does NOT touch your working branches or working directory - nothing changes until you merge.`,
    },
  };
}

export function pull(state: RepoState, args: string[]): CommandResult {
  if (!state.initialized) return notARepo(state);
  if (!state.remoteName || !state.remote) return noRemote('git pull', state);
  const branchName = positionals(args)[1] ?? currentBranchName(state) ?? 'main';
  state.commits = { ...state.commits, ...state.remote.commits };
  const remoteTip = state.remote.branches[branchName];
  if (!remoteTip) {
    return { state, outcome: { label: 'git pull', detail: `fatal: couldn't find remote ref ${branchName}`, error: true } };
  }
  const headId = headCommitId(state);
  const branch = currentBranchName(state) ?? 'HEAD';

  if (!headId) {
    if (state.head?.type === 'branch') state.branches[state.head.name] = remoteTip;
    state.workingDir.content = state.commits[remoteTip]!.content;
    appendReflog(state, `pull ${state.remoteName} ${branchName}: Fast-forward`, null, remoteTip);
    refreshWorkingDirStatus(state);
    return { state, outcome: { label: 'git pull', detail: `Fetches from '${state.remoteName}' and fast-forwards (you had no commits yet).` } };
  }
  if (headId === remoteTip) return { state, outcome: { label: 'git pull', detail: 'Already up to date.' } };

  const base = mergeBase(state, headId, remoteTip);
  if (base === remoteTip) {
    return { state, outcome: { label: 'git pull', detail: `Already up to date - ${branch} already contains everything on '${state.remoteName}/${branchName}'.` } };
  }
  if (base === headId) {
    if (state.head?.type === 'branch') state.branches[state.head.name] = remoteTip;
    else if (state.head?.type === 'detached') state.head.commit = remoteTip;
    state.workingDir.content = state.commits[remoteTip]!.content;
    appendReflog(state, `pull ${state.remoteName} ${branchName}: Fast-forward`, headId, remoteTip);
    refreshWorkingDirStatus(state);
    return { state, outcome: { label: 'git pull', detail: `Fetches then fast-forwards ${branch} to ${remoteTip.slice(0, 7)}.` } };
  }

  const baseCommit = base ? state.commits[base] : undefined;
  const ours = headCommit(state)!.content;
  const theirs = state.commits[remoteTip]!.content;
  const theirsLabel = `${state.remoteName}/${branchName}`;
  const { content, conflict } = threeWayMerge(baseCommit?.content ?? '', ours, theirs, theirsLabel);

  if (conflict) {
    state.conflict = { path: state.fileName, base: baseCommit?.content ?? '', ours, theirs, oursLabel: branch, theirsLabel };
    state.workingDir.content = content;
    state.staging = null;
    refreshWorkingDirStatus(state);
    return {
      state,
      outcome: { label: 'git pull', detail: `Fetches then attempts to merge '${theirsLabel}' - CONFLICT in ${state.fileName}. Resolve it, then "git add" + "git commit".` },
    };
  }

  const clock = nextClock(state);
  const message = `Merge branch '${branchName}' of ${state.remoteName}`;
  const newId = simulatedHash(`${headId},${remoteTip}:${message}:${clock}`);
  state.commits[newId] = { id: newId, parents: [headId, remoteTip], message, content, clock };
  if (state.head?.type === 'branch') state.branches[state.head.name] = newId;
  else if (state.head?.type === 'detached') state.head.commit = newId;
  state.staging = null;
  state.workingDir.content = content;
  appendReflog(state, `pull ${state.remoteName} ${branchName}: Merge made by the 'ort' strategy.`, headId, newId);
  refreshWorkingDirStatus(state);
  return { state, outcome: { label: 'git pull', detail: `Fetches then merges '${theirsLabel}' into ${branch} with merge commit ${newId.slice(0, 7)}.` } };
}

export function push(state: RepoState, args: string[]): CommandResult {
  if (!state.initialized) return notARepo(state);
  if (!state.remoteName || !state.remote) return noRemote('git push', state);
  const force = hasFlag(args, '--force', '-f');
  const branchName = positionals(args).find((a) => a !== state.remoteName) ?? currentBranchName(state);
  if (!branchName) return { state, outcome: { label: 'git push', detail: 'fatal: You are not currently on a branch.', error: true } };
  const localTip = state.branches[branchName];
  if (!localTip) {
    return { state, outcome: { label: `git push ${state.remoteName} ${branchName}`, detail: `error: src refspec ${branchName} does not match any`, error: true } };
  }
  const remoteTip = state.remote.branches[branchName];
  const nonFastForward = !!remoteTip && remoteTip !== localTip && !isAncestor(state, remoteTip, localTip);

  if (nonFastForward && !force) {
    return {
      state,
      outcome: {
        label: `git push ${state.remoteName} ${branchName}`,
        detail: `! [rejected] ${branchName} -> ${branchName} (non-fast-forward)\nerror: failed to push some refs. Updates were rejected because '${state.remoteName}' contains work you don't have locally (someone else pushed since your last fetch). Fetch/pull and merge or rebase before pushing again, or force-push only if you're sure you want to overwrite it.`,
        error: true,
      },
    };
  }

  for (const id of ancestorsOf(state, localTip)) state.remote.commits[id] = state.commits[id]!;
  state.remote.branches[branchName] = localTip;

  return {
    state,
    outcome: {
      label: `git push ${force ? '--force ' : ''}${state.remoteName} ${branchName}`,
      detail: nonFastForward
        ? `Force-pushes ${branchName}, overwriting '${state.remoteName}/${branchName}' (previously ${remoteTip!.slice(0, 7)}) with your local ${localTip.slice(0, 7)}. Anyone who already fetched the old tip still has a copy of it, but the remote itself no longer advertises it - the next person to fetch won't see it unless someone shares ${remoteTip!.slice(0, 7)} directly.`
        : `Uploads any commits reachable from ${branchName} that '${state.remoteName}' doesn't already have, then moves '${state.remoteName}/${branchName}' to ${localTip.slice(0, 7)}.`,
      destructive: nonFastForward,
      recoverable: nonFastForward || undefined,
      warning: nonFastForward
        ? "Force-pushing rewrites shared history. If teammates have already based work on the commits you just discarded, their next pull will be confusing or broken - coordinate with them before doing this for real."
        : undefined,
    },
  };
}
