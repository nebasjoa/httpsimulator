<script setup lang="ts">
import { onMounted } from 'vue';
import { useGitSimulatorStore } from '../stores/gitSimulator';
import GitScenarioPicker from '../components/git/GitScenarioPicker.vue';
import FileEditor from '../components/git/FileEditor.vue';
import GitTerminal from '../components/git/GitTerminal.vue';
import DiagramTabs from '../components/git/DiagramTabs.vue';
import GitTransportControls from '../components/git/GitTransportControls.vue';
import GitTimeline from '../components/git/GitTimeline.vue';
import StepDetail from '../components/git/StepDetail.vue';
import CommandReference from '../components/git/CommandReference.vue';

const store = useGitSimulatorStore();

onMounted(() => {
  store.loadScenario(store.scenarioId);
});
</script>

<template>
  <div class="git-page">
    <main class="main-grid">
      <aside class="panel config-panel">
        <GitScenarioPicker />
        <FileEditor />
      </aside>

      <section class="panel stage-panel">
        <GitTransportControls />
        <GitTimeline />
        <DiagramTabs />
        <StepDetail />
      </section>

      <aside class="panel terminal-panel">
        <GitTerminal />
      </aside>
    </main>

    <section class="panel command-reference-panel">
      <CommandReference />
    </section>
  </div>
</template>

<style scoped>
.git-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.main-grid {
  display: grid;
  grid-template-columns: 320px 1fr 380px;
  gap: 1rem;
  align-items: start;
}
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  padding: 1rem;
}
@media (max-width: 900px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
}
</style>
