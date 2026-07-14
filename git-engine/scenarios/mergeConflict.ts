import type { GitScenario } from '../types';
import { buildScenario, cmd, edit } from './shared';

export const mergeConflictScenario: GitScenario = {
  id: 'merge-conflict',
  title: '3. Merge conflict and resolution',
  description: 'Two branches edit test.txt differently from the same starting point. Merging the second one in conflicts - resolve it by hand, add, commit.',
  build: () =>
    buildScenario([
      cmd('git init'),
      edit('line 1: hello from test.txt\n'),
      cmd('git add test.txt'),
      cmd('git commit -m "Initial commit"'),
      cmd('git checkout -b feature-a'),
      edit('line 1: hello from test.txt\nline 2 (from feature-a): use the new pricing model\n', 'On feature-a: change line 2 one way.'),
      cmd('git add test.txt'),
      cmd('git commit -m "Change from feature-a"'),
      cmd('git checkout main'),
      cmd('git checkout -b feature-b'),
      edit('line 1: hello from test.txt\nline 2 (from feature-b): use the legacy pricing model\n', 'On feature-b, branched from the same starting point: change line 2 a different way.'),
      cmd('git add test.txt'),
      cmd('git commit -m "Change from feature-b"'),
      cmd('git checkout main'),
      cmd('git merge feature-a'),
      cmd('git merge feature-b'),
      edit(
        'line 1: hello from test.txt\nline 2 (resolved): use the new pricing model, with a legacy fallback flag\n',
        'The merge stopped with conflict markers in test.txt. You edit the file by hand to decide what the final content should be.'
      ),
      cmd('git add test.txt'),
      cmd('git commit -m "Merge feature-b, resolve conflict"'),
      cmd('git log --oneline --graph --all'),
    ]),
};
