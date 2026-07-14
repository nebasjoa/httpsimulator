import type { GitScenario } from '../types';
import { buildScenario, cmd, edit } from './shared';

export const featureBranchMergeScenario: GitScenario = {
  id: 'feature-branch-merge',
  title: '2. Feature branch + fast-forward merge',
  description: 'branch -> checkout -b -> commit on the side branch -> merge back into main with no conflict, since main never moved.',
  build: () =>
    buildScenario([
      cmd('git init'),
      edit('line 1: hello from test.txt\n'),
      cmd('git add test.txt'),
      cmd('git commit -m "Initial commit"'),
      cmd('git checkout -b feature'),
      edit('line 1: hello from test.txt\nline 2: work done on the feature branch\n', 'Still on "feature" - you add a line for the new feature.'),
      cmd('git add test.txt'),
      cmd('git commit -m "Add feature line"'),
      cmd('git checkout main'),
      cmd('git merge feature'),
      cmd('git log --oneline --graph --all'),
    ]),
};
