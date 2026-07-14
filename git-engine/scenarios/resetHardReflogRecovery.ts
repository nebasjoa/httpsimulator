import type { GitScenario } from '../types';
import { buildScenario, cmd, edit } from './shared';

export const resetHardReflogRecoveryScenario: GitScenario = {
  id: 'reset-hard-reflog-recovery',
  title: '5. Destructive: reset --hard, and what reflog can (and can\'t) undo',
  description:
    'Two different disasters: losing uncommitted edits to reset --hard (gone for good), and losing a whole commit to reset --hard (recoverable via reflog).',
  build: () =>
    buildScenario([
      cmd('git init'),
      edit('line 1: v1\n'),
      cmd('git add test.txt'),
      cmd('git commit -m "v1"'),
      edit('line 1: v1\nline 2: hours of uncommitted work you forgot to save with a commit\n', 'You make real edits but never git add or commit them.'),
      cmd('git status'),
      cmd('git reset --hard'),
      cmd('git status'),
      edit('line 1: v1\nline 2: v2\n'),
      cmd('git add test.txt'),
      cmd('git commit -m "v2"'),
      edit('line 1: v1\nline 2: v2\nline 3: v3\n'),
      cmd('git add test.txt'),
      cmd('git commit -m "v3"'),
      cmd('git log --oneline'),
      cmd('git reset --hard HEAD~1'),
      cmd('git log --oneline'),
      cmd('git reflog'),
      cmd('git reset --hard HEAD@{1}'),
      cmd('git log --oneline'),
    ]),
};
