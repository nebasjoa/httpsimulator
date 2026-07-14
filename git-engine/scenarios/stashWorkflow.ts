import type { GitScenario } from '../types';
import { buildScenario, cmd, edit } from './shared';

export const stashWorkflowScenario: GitScenario = {
  id: 'stash-workflow',
  title: '8. Stashing work in progress',
  description: 'Half-finished work in the way of switching branches? Stash it, do the urgent thing on a clean tree, then pop it back.',
  build: () =>
    buildScenario([
      cmd('git init'),
      edit('line 1: v1\n'),
      cmd('git add test.txt'),
      cmd('git commit -m "v1"'),
      edit('line 1: v1\nline 2: half-done refactor, not ready to commit\n', 'You start a refactor but get interrupted before it compiles.'),
      cmd('git status'),
      cmd('git stash push -m "WIP: half-done refactor"'),
      cmd('git status'),
      cmd('git checkout -b hotfix'),
      edit('line 1: v1 (urgent fix)\n', 'On a clean tree, you make the urgent fix.'),
      cmd('git add test.txt'),
      cmd('git commit -m "Urgent hotfix"'),
      cmd('git checkout main'),
      cmd('git stash list'),
      cmd('git stash pop'),
      cmd('git status'),
    ]),
};
