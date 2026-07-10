<script setup lang="ts">
import { computed } from 'vue';
import { useSimulatorStore } from '../../stores/simulator';
import { statusCatalog, statusClassColor, type StatusClass } from '../../../engine/statusCatalog';
import type { FailureMode } from '../../../engine/types';

const store = useSimulatorStore();
const allClasses: StatusClass[] = ['1xx', '2xx', '3xx', '4xx', '5xx'];

// The redirect-chain scenario only makes sense starting from a 3xx - narrow the
// picker so it doubles as "which redirect hop behavior do you want to see."
const visibleClasses = computed(() => (store.scenarioId === 'redirect-chain' ? (['3xx'] as StatusClass[]) : allClasses));

const grouped = computed(() =>
  visibleClasses.value.map((c) => ({ class: c, items: statusCatalog.filter((s) => s.class === c) }))
);

const failureModes: { value: FailureMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'refused', label: 'Connection refused' },
  { value: 'tls-error', label: 'TLS handshake error' },
  { value: 'timeout', label: 'Request timeout' },
];

function select(code: number) {
  store.updateServerConfig({ statusCode: code });
}

function onFailureModeChange(event: Event) {
  store.updateServerConfig({ failureMode: (event.target as HTMLSelectElement).value as FailureMode });
}
</script>

<template>
  <section class="server-config" aria-labelledby="server-config-heading">
    <h2 id="server-config-heading">Response status</h2>

    <label class="field">
      <span class="field-label">Connection failure</span>
      <select :value="store.serverConfig.failureMode ?? 'none'" @change="onFailureModeChange">
        <option
          v-for="f in failureModes"
          :key="f.value"
          :value="f.value"
          :disabled="f.value === 'tls-error' && !store.requestConfig.https"
        >{{ f.label }}</option>
      </select>
    </label>
    <p v-if="store.serverConfig.failureMode && store.serverConfig.failureMode !== 'none'" class="failure-hint">
      The sequence will stop at the point of failure - the status code below won't be reached.
    </p>

    <div v-for="group in grouped" :key="group.class" class="status-group">
      <h3 :style="{ color: statusClassColor(group.class) }">{{ group.class }}</h3>
      <div class="status-chips">
        <button
          v-for="s in group.items"
          :key="s.code"
          type="button"
          class="status-chip"
          :class="{ active: store.serverConfig.statusCode === s.code }"
          :style="{ '--chip-color': statusClassColor(s.class) }"
          @click="select(s.code)"
        >
          {{ s.code }} {{ s.reason }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.server-config {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.85rem;
}
.field-label {
  color: var(--muted);
}
.field select {
  font: inherit;
  padding: 0.35rem 0.5rem;
  border-radius: 0.35rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: inherit;
}
.failure-hint {
  font-size: 0.75rem;
  color: var(--amber);
  margin: 0;
}
.status-group h3 {
  margin: 0.5rem 0 0.25rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.status-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.status-chip {
  font: inherit;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--chip-color, var(--border));
  color: var(--chip-color, inherit);
  background: transparent;
  cursor: pointer;
}
.status-chip.active {
  background: var(--chip-color, var(--accent));
  color: var(--surface);
  font-weight: 600;
}
.status-chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
