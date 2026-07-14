<script setup lang="ts">
import { gitScenarios } from '../../../git-engine/scenarios';
import { useGitSimulatorStore } from '../../stores/gitSimulator';

const store = useGitSimulatorStore();

function onChange(event: Event) {
  store.loadScenario((event.target as HTMLSelectElement).value);
}
</script>

<template>
  <section class="scenario-picker" aria-labelledby="git-scenario-picker-heading">
    <h2 id="git-scenario-picker-heading">Scenario</h2>
    <select :value="store.scenarioId" @change="onChange">
      <option v-for="s in gitScenarios" :key="s.id" :value="s.id">{{ s.title }}</option>
    </select>
    <p class="scenario-description">{{ store.scenario.description }}</p>
    <button type="button" class="blank-repo" @click="store.newBlankRepo()">Start from a blank repo instead</button>
  </section>
</template>

<style scoped>
.scenario-picker {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
select {
  font: inherit;
  padding: 0.35rem 0.5rem;
  border-radius: 0.35rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: inherit;
}
.scenario-description {
  font-size: 0.8rem;
  color: var(--muted);
  margin: 0;
}
.blank-repo {
  align-self: flex-start;
  font: inherit;
  font-size: 0.75rem;
  padding: 0.3rem 0.6rem;
  border-radius: 0.35rem;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}
.blank-repo:hover {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
