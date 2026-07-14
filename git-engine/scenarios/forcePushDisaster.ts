import type { GitScenario } from '../types';
import { buildScenario, cmd, edit } from './shared';

export const forcePushDisasterScenario: GitScenario = {
  id: 'force-push-disaster',
  title: '11. Destructive: rewriting pushed history and force-pushing',
  description: 'Rewrite a commit that\'s already on origin, get rejected on a normal push (as intended), then force-push over it - and see exactly what that costs.',
  build: () =>
    buildScenario([
      cmd('git init'),
      edit('line 1: v1\n'),
      cmd('git add test.txt'),
      cmd('git commit -m "v1"'),
      cmd('git remote add origin https://example.com/team/repo.git'),
      cmd('git push -u origin main'),
      edit('line 1: v1\nline 2: v2\n'),
      cmd('git add test.txt'),
      cmd('git commit -m "v2"'),
      cmd('git push origin main'),
      cmd('git reset --hard HEAD~1'),
      edit('line 1: v1\nline 2: v2, rewritten with different content\n'),
      cmd('git add test.txt'),
      cmd('git commit -m "v2, rewritten"'),
      cmd('git push origin main'),
      cmd('git push --force origin main'),
      cmd('git log --oneline'),
    ]),
};
