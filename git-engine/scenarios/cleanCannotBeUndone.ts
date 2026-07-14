import type { GitScenario } from '../types';
import { buildScenario, cmd } from './shared';

export const cleanCannotBeUndoneScenario: GitScenario = {
  id: 'clean-cannot-be-undone',
  title: '12. Destructive & unrecoverable: git clean -fd',
  description: 'test.txt hasn\'t been added yet, so it is untracked. "git clean -fd" deletes it - and unlike everything else in this app, there is no undo.',
  build: () =>
    buildScenario([
      cmd('git init'),
      cmd('git status'),
      cmd('git clean -fd'),
      cmd('git status'),
    ]),
};
