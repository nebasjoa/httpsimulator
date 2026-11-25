import type { Scenario } from '../types';
import { simpleRequestScenario } from './simpleRequest';
import { formPostScenario } from './formPost';
import { redirectChainScenario } from './redirectChain';
import { paymentFlowScenario } from './paymentFlow';
import { mtlsS2sScenario } from './mtlsS2s';

export const scenarios: Scenario[] = [
  simpleRequestScenario,
  formPostScenario,
  redirectChainScenario,
  paymentFlowScenario,
  mtlsS2sScenario,
];

const scenarioById = new Map(scenarios.map((s) => [s.id, s]));

export function getScenario(id: string): Scenario {
  const scenario = scenarioById.get(id);
  if (!scenario) {
    throw new Error(`Unknown scenario: ${id}`);
  }
  return scenario;
}

export const DEFAULT_SCENARIO_ID = simpleRequestScenario.id;
