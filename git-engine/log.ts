import type { RepoState } from './types';
import { headCommitId, shortId } from './repo';

export interface LogOptions {
  oneline: boolean;
  graph: boolean;
  all: boolean;
}

function refLabelsFor(state: RepoState, commitId: string): string[] {
  const labels: string[] = [];
  if (headCommitId(state) === commitId) {
    labels.push(state.head?.type === 'branch' ? `HEAD -> ${state.head.name}` : 'HEAD');
  }
  for (const [name, id] of Object.entries(state.branches)) {
    if (id === commitId && !(state.head?.type === 'branch' && state.head.name === name && labels[0]?.includes('HEAD'))) {
      labels.push(name);
    }
  }
  for (const [name, tag] of Object.entries(state.tags)) {
    if (tag.commit === commitId) labels.push(`tag: ${name}`);
  }
  return labels;
}

// Topological order (newest first) by walking from the given starting points.
function walkHistory(state: RepoState, starts: string[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  const stack = [...starts];
  while (stack.length) {
    const id = stack.shift();
    if (!id || seen.has(id)) continue;
    const commit = state.commits[id];
    if (!commit) continue;
    seen.add(id);
    order.push(id);
    stack.push(...commit.parents);
  }
  order.sort((a, b) => (state.commits[b]?.clock ?? 0) - (state.commits[a]?.clock ?? 0));
  return order;
}

export function formatLog(state: RepoState, options: Partial<LogOptions> = {}): string {
  if (!state.initialized) return "fatal: not a git repository (or any of the parent directories): .git";
  const starts = options.all ? Object.values(state.branches) : [headCommitId(state)].filter((x): x is string => !!x);
  if (starts.length === 0) return 'fatal: your current branch does not have any commits yet';
  const order = walkHistory(state, starts);
  if (order.length === 0) return 'fatal: your current branch does not have any commits yet';

  const prefix = options.graph ? '* ' : '';
  if (options.oneline) {
    return order
      .map((id) => {
        const commit = state.commits[id]!;
        const labels = refLabelsFor(state, id);
        const labelStr = labels.length ? ` (${labels.join(', ')})` : '';
        return `${prefix}${shortId(id)}${labelStr} ${commit.message}`;
      })
      .join('\n');
  }
  return order
    .map((id) => {
      const commit = state.commits[id]!;
      const labels = refLabelsFor(state, id);
      const labelStr = labels.length ? ` (${labels.join(', ')})` : '';
      return (
        `${prefix}commit ${id}${labelStr}\n` +
        `Author: You <you@example.com>\n` +
        `Date:   (simulated step ${commit.clock})\n\n` +
        `    ${commit.message}\n`
      );
    })
    .join('\n');
}
