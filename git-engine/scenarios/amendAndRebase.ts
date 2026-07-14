import type { GitScenario } from '../types';
import { buildScenario, cmd, edit } from './shared';

export const amendAndRebaseScenario: GitScenario = {
  id: 'amend-and-rebase',
  title: '4. Amending and rebasing',
  description: '--amend replaces the tip commit in place; rebase replays a whole branch of commits onto a new base. Both give commits new hashes.',
  build: () =>
    buildScenario([
      cmd('git init'),
      edit('line 1: hello from test.txt\n'),
      cmd('git add test.txt'),
      cmd('git commit -m "v1"'),
      edit('line 1: hello from test.txt\n(typo fixed)\n', 'You notice a typo in the file you just committed and fix it, without wanting a whole new commit for it.'),
      cmd('git add test.txt'),
      cmd('git commit --amend -m "v1 (typo fixed before anyone pulled it)"'),
      cmd('git checkout -b feature'),
      edit('line 1: hello from test.txt\n(typo fixed)\nline 2: work on the feature\n'),
      cmd('git add test.txt'),
      cmd('git commit -m "Add feature line"'),
      cmd('git checkout main'),
      edit('line 0: an unrelated tweak on main\nline 1: hello from test.txt\n(typo fixed)\n', 'Back on main: prepend an unrelated line at the top of the file (a different part of the file than the feature branch touched).'),
      cmd('git add test.txt'),
      cmd('git commit -m "Unrelated tweak on main"'),
      cmd('git checkout feature'),
      cmd('git log --oneline --graph --all'),
      cmd('git rebase main'),
      cmd('git log --oneline --graph --all'),
    ]),
};
