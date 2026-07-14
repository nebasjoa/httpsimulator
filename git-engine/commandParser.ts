import type { CommandResult, GitStep, RepoState } from './types';
import { cloneState, simulatedHash } from './repo';
import { refreshWorkingDirStatus } from './status';
import * as snap from './commands/snapshotting';
import * as branching from './commands/branching';
import * as hist from './commands/history';
import * as merging from './commands/merging';
import * as stashCmd from './commands/stash';
import * as remoteCmd from './commands/remote';
import * as cleanupCmd from './commands/cleanup';

// Splits a typed command line into argv, respecting "quoted strings" (for -m "message").
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input))) {
    tokens.push(match[1] ?? match[2] ?? match[3] ?? '');
  }
  return tokens;
}

export function executeCommand(state: RepoState, rawInput: string): CommandResult {
  let tokens = tokenize(rawInput.trim());
  if (tokens[0] === 'git') tokens = tokens.slice(1);
  const [verb, ...args] = tokens;
  if (!verb) {
    return { state, outcome: { label: rawInput, detail: 'Type a git command, e.g. "git status".', error: true } };
  }

  switch (verb) {
    case 'init':
      return snap.init(state);
    case 'status':
      return snap.status(state);
    case 'add':
      return snap.add(state, args);
    case 'commit':
      return snap.commit(state, args);
    case 'rm':
      return snap.rm(state, args);
    case 'mv':
      return snap.mv(state, args);
    case 'restore':
      return snap.restore(state, args);
    case 'diff':
      return snap.diff(state, args);
    case 'show':
      return snap.show(state, args);
    case 'log':
      return snap.log(state, args);
    case 'branch':
      return branching.branch(state, args);
    case 'checkout':
      return branching.checkout(state, args);
    case 'switch':
      return branching.switchBranch(state, args);
    case 'tag':
      return branching.tag(state, args);
    case 'reset':
      return hist.reset(state, args);
    case 'revert':
      return hist.revert(state, args);
    case 'rebase':
      return hist.rebase(state, args);
    case 'cherry-pick':
      return hist.cherryPick(state, args);
    case 'reflog':
      return hist.reflog(state);
    case 'merge':
      return merging.merge(state, args);
    case 'stash':
      return stashCmd.stash(state, args);
    case 'remote':
      return remoteCmd.remote(state, args);
    case 'clone':
      return remoteCmd.clone(state, args);
    case 'fetch':
      return remoteCmd.fetch(state);
    case 'pull':
      return remoteCmd.pull(state, args);
    case 'push':
      return remoteCmd.push(state, args);
    case 'clean':
      return cleanupCmd.clean(state, args);
    default:
      return {
        state,
        outcome: {
          label: rawInput,
          detail: `git: '${verb}' is not a git command (or isn't supported by this simulator) - see the Command reference panel for what is.`,
          error: true,
        },
      };
  }
}

// Runs one command against `state`, producing a full GitStep with before/after snapshots.
// `state` is not mutated - the caller (the store) decides when to adopt stateAfter.
export function runCommand(state: RepoState, rawInput: string, stepIndex: number, durationMs = 900): GitStep {
  const before = cloneState(state);
  const working = cloneState(state);
  const result = executeCommand(working, rawInput);
  const trimmed = rawInput.trim();
  return {
    id: `step-${stepIndex}-${simulatedHash(trimmed + stepIndex)}`,
    kind: 'command',
    input: trimmed.startsWith('git') ? trimmed : `git ${trimmed}`,
    label: result.outcome.label,
    detail: result.outcome.detail,
    destructive: !!result.outcome.destructive,
    warning: result.outcome.warning,
    undo: result.outcome.undo,
    recoverable: result.outcome.recoverable ?? true,
    error: !!result.outcome.error,
    stateBefore: before,
    stateAfter: result.state,
    durationMs,
  };
}

// Represents editing the tracked file "in your editor" - deliberately not a git command
// (see golden rule 4's honesty principle, applied here: editing a file is not a git op).
export function runEdit(state: RepoState, newContent: string, note: string | undefined, stepIndex: number, durationMs = 900): GitStep {
  const before = cloneState(state);
  const after = cloneState(state);
  after.workingDir.content = newContent;
  refreshWorkingDirStatus(after);
  return {
    id: `step-${stepIndex}-edit`,
    kind: 'edit',
    input: `(edit ${state.fileName})`,
    label: `Edit ${state.fileName}`,
    detail: note ?? `You edit ${state.fileName} in your editor. This only changes the working directory - git doesn't know about it until you run "git add".`,
    destructive: false,
    recoverable: true,
    error: false,
    stateBefore: before,
    stateAfter: after,
    durationMs,
  };
}
