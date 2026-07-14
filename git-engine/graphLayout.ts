import type { RepoState } from './types';
import { reachableCommitIds } from './repo';

export interface GraphNode {
  id: string;
  shortId: string;
  message: string;
  x: number; // generation (topological depth) - increases left to right
  y: number; // lane - keeps parallel branches on separate rows
  dangling: boolean; // unreachable from any branch/tag/HEAD - only findable via reflog
  isHead: boolean;
  branchLabels: string[];
  tagLabels: string[];
}

export interface GraphEdge {
  from: string; // parent commit id
  to: string; // child commit id
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  laneCount: number;
}

// Pure layout function - no rendering, no DOM. UI components turn this into pixels.
export function computeGraphLayout(state: RepoState): GraphLayout {
  const ids = Object.keys(state.commits);
  if (ids.length === 0) return { nodes: [], edges: [], laneCount: 0 };

  const genCache = new Map<string, number>();
  function gen(id: string): number {
    if (genCache.has(id)) return genCache.get(id)!;
    const commit = state.commits[id]!;
    const value = commit.parents.length === 0 ? 0 : 1 + Math.max(...commit.parents.map(gen));
    genCache.set(id, value);
    return value;
  }
  for (const id of ids) gen(id);

  const reachable = reachableCommitIds(state);
  const headId =
    state.head?.type === 'detached' ? state.head.commit : state.head?.type === 'branch' ? state.branches[state.head.name] : undefined;

  // Lane assignment: walk each ref's first-parent chain in a deterministic order; the
  // first walk to reach a commit "claims" its lane, later walks route around it. Good
  // enough for the small, mostly-linear-with-occasional-merge histories this app produces.
  const lane = new Map<string, number>();
  let laneCount = 0;
  const tips: string[] = [
    ...Object.keys(state.branches)
      .sort()
      .map((b) => state.branches[b]!),
    ...Object.keys(state.tags)
      .sort()
      .map((t) => state.tags[t]!.commit),
  ];
  if (state.head?.type === 'detached') tips.push(state.head.commit);

  const claimLane = (start: string) => {
    if (lane.has(start)) return;
    const myLane = laneCount++;
    let cursor: string | undefined = start;
    while (cursor && !lane.has(cursor)) {
      lane.set(cursor, myLane);
      cursor = state.commits[cursor]?.parents[0];
    }
  };
  for (const tip of tips) claimLane(tip);
  for (const id of ids) claimLane(id); // anything left over (dangling) gets its own lane

  const nodes: GraphNode[] = ids.map((id) => {
    const commit = state.commits[id]!;
    const branchLabels = Object.entries(state.branches)
      .filter(([, cid]) => cid === id)
      .map(([name]) => name);
    const tagLabels = Object.entries(state.tags)
      .filter(([, t]) => t.commit === id)
      .map(([name]) => name);
    return {
      id,
      shortId: id.slice(0, 7),
      message: commit.message,
      x: gen(id),
      y: lane.get(id) ?? 0,
      dangling: !reachable.has(id),
      isHead: id === headId,
      branchLabels,
      tagLabels,
    };
  });

  const edges: GraphEdge[] = [];
  for (const id of ids) {
    for (const parent of state.commits[id]!.parents) {
      if (state.commits[parent]) edges.push({ from: parent, to: id });
    }
  }

  return { nodes, edges, laneCount };
}
