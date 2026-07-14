import type { GitScenario } from '../types';
import { buildScenario, cmd, edit } from './shared';

export const cherryPickAndTagsScenario: GitScenario = {
  id: 'cherry-pick-and-tags',
  title: '9. Cherry-picking a commit, and tagging releases',
  description: 'Pull one specific commit from a branch without merging the whole thing; tag a release and check it out in detached HEAD.',
  build: () =>
    buildScenario([
      cmd('git init'),
      edit('line 1: v1\n'),
      cmd('git add test.txt'),
      cmd('git commit -m "v1"'),
      cmd('git tag -a v1.0 -m "First release"'),
      cmd('git checkout -b feature'),
      edit('line 1: v1\nline 2: a nice-to-have that main also wants right away\n'),
      cmd('git add test.txt'),
      cmd('git commit -m "Add nice-to-have"'),
      cmd('git checkout main'),
      cmd('git cherry-pick feature'),
      cmd('git log --oneline --graph --all'),
      cmd('git tag -a v1.1 -m "Includes the cherry-picked fix"'),
      cmd('git checkout v1.0'),
      cmd('git status'),
      cmd('git checkout main'),
    ]),
};
