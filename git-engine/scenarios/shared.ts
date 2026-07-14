import { initialRepoState } from '../repo';
import { runCommand, runEdit } from '../commandParser';
import type { GitStep } from '../types';

export type ScenarioStep =
  | { type: 'command'; text: string; durationMs?: number }
  | { type: 'edit'; content: string; note?: string; durationMs?: number };

export function cmd(text: string, durationMs?: number): ScenarioStep {
  return { type: 'command', text, durationMs };
}

export function edit(content: string, note?: string, durationMs?: number): ScenarioStep {
  return { type: 'edit', content, note, durationMs };
}

// Folds the shared command executor over a fresh repo, exactly like the HTTP engine's
// Scenario.build() folds request/server config into a SimEvent[] - scenarios are data,
// not renderers.
export function buildScenario(steps: ScenarioStep[]): GitStep[] {
  let state = initialRepoState();
  const result: GitStep[] = [];
  steps.forEach((step, i) => {
    const gitStep = step.type === 'command' ? runCommand(state, step.text, i, step.durationMs) : runEdit(state, step.content, step.note, i, step.durationMs);
    result.push(gitStep);
    state = gitStep.stateAfter;
  });
  return result;
}
