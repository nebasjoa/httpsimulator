<script setup lang="ts">
import { computed, ref } from 'vue';
import { statusCatalog, statusClassColor, type StatusClass, type StatusInfo } from '../../../engine/statusCatalog';

const classes: StatusClass[] = ['1xx', '2xx', '3xx', '4xx', '5xx'];
const grouped = computed(() =>
  classes.map((c) => ({ class: c, items: statusCatalog.filter((s) => s.class === c) }))
);

const selected = ref<StatusInfo | null>(null);
</script>

<template>
  <section class="status-explorer" aria-labelledby="status-explorer-heading">
    <h2 id="status-explorer-heading">Status explorer</h2>
    <div class="explorer-layout">
      <div class="groups">
        <div v-for="group in grouped" :key="group.class" class="status-group">
          <h3 :style="{ color: statusClassColor(group.class) }">{{ group.class }}</h3>
          <div class="status-chips">
            <button
              v-for="s in group.items"
              :key="s.code"
              type="button"
              class="status-chip"
              :class="{ active: selected?.code === s.code }"
              :style="{ '--chip-color': statusClassColor(s.class) }"
              @click="selected = s"
            >
              {{ s.code }} {{ s.reason }}
            </button>
          </div>
        </div>
      </div>

      <div class="detail" v-if="selected">
        <h4>{{ selected.code }} {{ selected.reason }}</h4>
        <p>{{ selected.summary }}</p>
        <p><strong>In payments:</strong> {{ selected.paymentsExample }}</p>
        <p><strong>Client should:</strong> {{ selected.clientAction }}</p>
        <p v-if="selected.responseHeaders.length">
          <strong>Headers:</strong>
          <code v-for="h in selected.responseHeaders" :key="h.name" class="header-chip">{{ h.name }}: {{ h.value }}</code>
        </p>
      </div>
      <p class="detail empty" v-else>Select a status code to read what it means.</p>
    </div>
  </section>
</template>

<style scoped>
.status-explorer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.explorer-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
}
@media (max-width: 900px) {
  .explorer-layout {
    grid-template-columns: 1fr;
  }
}
.status-group h3 {
  margin: 0.5rem 0 0.25rem;
  font-size: 0.75rem;
  text-transform: uppercase;
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
.detail {
  background: var(--surface-2);
  border-radius: 0.5rem;
  padding: 0.75rem;
  font-size: 0.85rem;
  align-self: start;
}
.detail.empty {
  color: var(--muted);
}
.header-chip {
  display: inline-block;
  margin: 0.2rem 0.3rem 0 0;
  background: var(--surface-3);
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}
</style>
