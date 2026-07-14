import type { GitScenario } from '../types';
import { buildScenario, cmd, edit } from './shared';

export const remoteWorkflowScenario: GitScenario = {
  id: 'remote-workflow',
  title: '10. Remote basics: remote add, push, fetch, pull',
  description: 'Wire up a remote named "origin" and push, fetch, and pull against it. (Simplified to one working copy - see the description for what that leaves out.)',
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
      cmd('git fetch origin'),
      cmd('git pull origin main'),
      cmd('git remote -v'),
      cmd('git log --oneline'),
    ]),
};
