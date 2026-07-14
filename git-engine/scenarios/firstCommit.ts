import type { GitScenario } from '../types';
import { buildScenario, cmd, edit } from './shared';

export const firstCommitScenario: GitScenario = {
  id: 'first-commit',
  title: '1. Your first commit',
  description: 'init -> edit -> add -> commit -> log. The core loop every other scenario builds on: working directory -> staging area -> repository.',
  build: () =>
    buildScenario([
      cmd('git init'),
      cmd('git status'),
      edit('line 1: hello from test.txt\n', 'You open test.txt in your editor and write the first line.'),
      cmd('git status'),
      cmd('git add test.txt'),
      cmd('git status'),
      cmd('git commit -m "Initial commit"'),
      cmd('git log'),
    ]),
};
