// Line-based three-way merge for the single tracked file. Small but real diff3: each side
// is diffed against the merge base independently, then the two sets of changes ("hunks")
// are combined by base position. Two hunks starting at the same base position that differ
// conflict (classic git behavior for concurrent edits/inserts at the same spot); hunks at
// different positions apply cleanly side by side - e.g. one branch prepending a line while
// another appends a different one merges without a conflict, just like real git.

export interface MergeResult {
  content: string;
  conflict: boolean;
}

interface Hunk {
  baseStart: number;
  baseEnd: number; // exclusive - replaces base[baseStart:baseEnd]
  lines: string[];
}

function diffHunks(base: string[], side: string[]): Hunk[] {
  const n = base.length;
  const m = side.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] = base[i] === side[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  const hunks: Hunk[] = [];
  let i = 0;
  let j = 0;
  let hunkStart = -1;
  let hunkLines: string[] = [];
  let hunkDeleted = 0;

  const open = (at: number) => {
    if (hunkStart === -1) {
      hunkStart = at;
      hunkLines = [];
      hunkDeleted = 0;
    }
  };
  const close = () => {
    if (hunkStart !== -1) {
      hunks.push({ baseStart: hunkStart, baseEnd: hunkStart + hunkDeleted, lines: hunkLines });
      hunkStart = -1;
    }
  };

  while (i < n && j < m) {
    if (base[i] === side[j]) {
      close();
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      open(i);
      hunkDeleted++;
      i++;
    } else {
      open(i);
      hunkLines.push(side[j]!);
      j++;
    }
  }
  while (i < n) {
    open(i);
    hunkDeleted++;
    i++;
  }
  while (j < m) {
    open(i);
    hunkLines.push(side[j]!);
    j++;
  }
  close();
  return hunks;
}

function sameLines(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((l, idx) => l === b[idx]);
}

function hunkAt(hunks: Hunk[], index: number, pos: number): Hunk | null {
  const h = hunks[index];
  return h && h.baseStart === pos ? h : null;
}

function combine(base: string[], hunksOurs: Hunk[], hunksTheirs: Hunk[], oursLabel: string, theirsLabel: string): MergeResult {
  const out: string[] = [];
  let conflict = false;
  let i = 0;
  let oi = 0;
  let ti = 0;

  const emit = (ours: Hunk | null, theirs: Hunk | null) => {
    if (ours && theirs) {
      if (ours.baseEnd === theirs.baseEnd && sameLines(ours.lines, theirs.lines)) {
        out.push(...ours.lines);
      } else {
        conflict = true;
        out.push(`<<<<<<< ${oursLabel}`, ...ours.lines, '=======', ...theirs.lines, `>>>>>>> ${theirsLabel}`);
      }
    } else if (ours) {
      out.push(...ours.lines);
    } else if (theirs) {
      out.push(...theirs.lines);
    }
  };

  while (i < base.length) {
    const ourHunk = hunkAt(hunksOurs, oi, i);
    const theirHunk = hunkAt(hunksTheirs, ti, i);
    if (ourHunk || theirHunk) {
      emit(ourHunk, theirHunk);
      if (ourHunk) oi++;
      if (theirHunk) ti++;
      i = Math.max(ourHunk?.baseEnd ?? i, theirHunk?.baseEnd ?? i);
    } else {
      out.push(base[i]!);
      i++;
    }
  }
  // trailing end-of-file insertions
  const ourEnd = hunkAt(hunksOurs, oi, base.length);
  const theirEnd = hunkAt(hunksTheirs, ti, base.length);
  if (ourEnd || theirEnd) emit(ourEnd, theirEnd);

  return { content: out.join('\n'), conflict };
}

export function threeWayMerge(base: string, ours: string, theirs: string, theirsLabel: string, oursLabel = 'HEAD'): MergeResult {
  if (ours === theirs) return { content: ours, conflict: false };
  if (ours === base) return { content: theirs, conflict: false };
  if (theirs === base) return { content: ours, conflict: false };

  const baseLines = base.split('\n');
  const oursLines = ours.split('\n');
  const theirsLines = theirs.split('\n');
  const hunksOurs = diffHunks(baseLines, oursLines);
  const hunksTheirs = diffHunks(baseLines, theirsLines);
  return combine(baseLines, hunksOurs, hunksTheirs, oursLabel, theirsLabel);
}
