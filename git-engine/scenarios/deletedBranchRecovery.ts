import type { GitScenario } from '../types';
import { buildScenario, cmd, edit } from './shared';

export const deletedBranchRecoveryScenario: GitScenario = {
  id: 'deleted-branch-recovery',
  title: '6. Destructive: force-deleting an unmerged branch, and getting it back',
  description: '"git branch -D" on a branch with commits nowhere else throws them away from view - but reflog remembers, so they\'re recoverable.',
  build: () =>
    buildScenario([
      cmd('git init'),
      edit('line 1: v1\n'),
      cmd('git add test.txt'),
      cmd('git commit -m "v1"'),
      cmd('git checkout -b feature'),
      edit('line 1: v1\nline 2: feature work nobody merged yet\n'),
      cmd('git add test.txt'),
      cmd('git commit -m "feature work"'),
      cmd('git checkout main'),
      cmd('git branch -D feature'),
      cmd('git log --oneline --all'),
      cmd('git reflog'),
      cmd('git branch feature HEAD@{1}'),
      cmd('git checkout feature'),
      cmd('git log --oneline'),
    ]),
};
