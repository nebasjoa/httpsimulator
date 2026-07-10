<script setup lang="ts">
import { onMounted } from 'vue';
import { useSimulatorStore } from '../stores/simulator';
import RequestBuilder from '../components/sim/RequestBuilder.vue';
import ServerConfig from '../components/sim/ServerConfig.vue';
import ScenarioPicker from '../components/sim/ScenarioPicker.vue';
import SequenceStage from '../components/sim/SequenceStage.vue';
import EventDetail from '../components/sim/EventDetail.vue';
import WireInspector from '../components/sim/WireInspector.vue';
import StatusExplorer from '../components/sim/StatusExplorer.vue';
import Http2Comparison from '../components/sim/Http2Comparison.vue';
import Legend from '../components/sim/Legend.vue';

const store = useSimulatorStore();

onMounted(() => {
  store.rebuild();
});
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <h1>HTTP Simulator</h1>
      <div class="mode-toggle" role="group" aria-label="Data source mode">
        <button type="button" :class="{ active: store.mode === 'simulated' }" @click="store.setMode('simulated')">
          Simulated
        </button>
        <button type="button" :class="{ active: store.mode === 'real' }" @click="store.setMode('real')">
          Real
        </button>
      </div>
      <Legend />
    </header>

    <p v-if="store.mode === 'real' && store.realLoading" class="real-status">Fetching /api/echo…</p>
    <p v-if="store.mode === 'real' && store.realError" class="real-status error">{{ store.realError }}</p>

    <main class="main-grid">
      <aside class="panel config-panel">
        <ScenarioPicker />
        <RequestBuilder />
        <ServerConfig />
      </aside>

      <section class="panel stage-panel">
        <SequenceStage />
        <EventDetail />
      </section>

      <aside class="panel inspector-panel">
        <WireInspector />
      </aside>
    </main>

    <section class="panel status-explorer-panel">
      <StatusExplorer />
    </section>

    <section class="panel http2-panel">
      <Http2Comparison />
    </section>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  max-width: 1400px;
  margin: 0 auto;
}
.app-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.app-header h1 {
  font-size: 1.25rem;
  margin: 0;
}
.mode-toggle {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: 999px;
  overflow: hidden;
}
.mode-toggle button {
  border: none;
  background: var(--surface);
  color: inherit;
  padding: 0.3rem 0.8rem;
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
}
.mode-toggle button.active {
  background: var(--accent);
  color: var(--surface);
}
.real-status {
  font-size: 0.85rem;
  color: var(--muted);
  margin: 0;
}
.real-status.error {
  color: var(--red);
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
