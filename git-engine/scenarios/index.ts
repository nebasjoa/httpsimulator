import type { GitScenario } from '../types';
import { firstCommitScenario } from './firstCommit';
import { featureBranchMergeScenario } from './featureBranchMerge';
import { mergeConflictScenario } from './mergeConflict';
import { amendAndRebaseScenario } from './amendAndRebase';
import { resetHardReflogRecoveryScenario } from './resetHardReflogRecovery';
import { deletedBranchRecoveryScenario } from './deletedBranchRecovery';
import { revertVsResetScenario } from './revertVsReset';
import { stashWorkflowScenario } from './stashWorkflow';
import { cherryPickAndTagsScenario } from './cherryPickAndTags';
import { remoteWorkflowScenario } from './remoteWorkflow';
import { forcePushDisasterScenario } from './forcePushDisaster';
import { cleanCannotBeUndoneScenario } from './cleanCannotBeUndone';

export const gitScenarios: GitScenario[] = [
  firstCommitScenario,
  featureBranchMergeScenario,
  mergeConflictScenario,
  amendAndRebaseScenario,
  resetHardReflogRecoveryScenario,
  deletedBranchRecoveryScenario,
  revertVsResetScenario,
  stashWorkflowScenario,
  cherryPickAndTagsScenario,
  remoteWorkflowScenario,
  forcePushDisasterScenario,
  cleanCannotBeUndoneScenario,
];

const gitScenarioById = new Map(gitScenarios.map((s) => [s.id, s]));

export function getGitScenario(id: string): GitScenario {
  const scenario = gitScenarioById.get(id);
  if (!scenario) throw new Error(`Unknown git scenario: ${id}`);
  return scenario;
}

export const DEFAULT_GIT_SCENARIO_ID = firstCommitScenario.id;
