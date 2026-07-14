import type { GitScenario } from '../types';
import { buildScenario, cmd, edit } from './shared';

export const revertVsResetScenario: GitScenario = {
  id: 'revert-vs-reset',
  title: '7. Undoing a shared commit safely: revert vs reset',
  description: 'Once a commit might already be on someone else\'s machine, rewriting history with reset is risky. revert undoes the change with a brand-new commit instead.',
  build: () =>
    buildScenario([
      cmd('git init'),
      edit('line 1: v1\n'),
      cmd('git add test.txt'),
      cmd('git commit -m "v1"'),
      edit('line 1: v1\nline 2: enable risky new pricing rule (already pushed - teammates have this!)\n'),
      cmd('git add test.txt'),
      cmd('git commit -m "Enable risky new pricing rule"'),
      cmd('git status'),
      cmd('git revert HEAD'),
      cmd('git log --oneline'),
    ]),
};
