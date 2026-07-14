<script setup lang="ts">
import { ref } from 'vue';
import { useGitSimulatorStore } from '../../stores/gitSimulator';
import CommitGraphView from './CommitGraphView.vue';
import ThreeTreeView from './ThreeTreeView.vue';
import RemoteView from './RemoteView.vue';

const store = useGitSimulatorStore();
const tab = ref<'graph' | 'tree'>('graph');
</script>

<template>
  <section class="diagram-tabs" aria-labelledby="diagram-heading">
    <div class="tab-row" role="tablist" aria-label="Diagram view">
      <h2 id="diagram-heading" class="visually-hidden">Diagram</h2>
      <button type="button" role="tab" :aria-selected="tab === 'graph'" :class="{ active: tab === 'graph' }" @click="tab = 'graph'">
        Commit graph
      </button>
      <button type="button" role="tab" :aria-selected="tab === 'tree'" :class="{ active: tab === 'tree' }" @click="tab = 'tree'">
        Working copy
      </button>
    </div>

    <CommitGraphView v-if="tab === 'graph'" />
    <ThreeTreeView v-else />

    <RemoteView v-if="store.repoState.remoteName" />
  </section>
</template>

<style scoped>
.diagram-tabs {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.tab-row {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.75rem;
}
.tab-row button {
  font: inherit;
  font-size: 0.8rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: inherit;
  cursor: pointer;
}
.tab-row button.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--surface);
  font-weight: 600;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
</style>
