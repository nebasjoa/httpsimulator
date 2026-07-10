<script setup lang="ts">
import { scenarios } from '../../../engine/scenarios';
import { useSimulatorStore } from '../../stores/simulator';

const store = useSimulatorStore();

function onChange(event: Event) {
  store.setScenario((event.target as HTMLSelectElement).value);
}
</script>

<template>
  <section class="scenario-picker" aria-labelledby="scenario-picker-heading">
    <h2 id="scenario-picker-heading">Scenario</h2>
    <select :value="store.scenarioId" @change="onChange">
      <option v-for="s in scenarios" :key="s.id" :value="s.id">{{ s.title }}</option>
    </select>
    <p class="scenario-description">{{ store.scenario.description }}</p>
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
</style>
