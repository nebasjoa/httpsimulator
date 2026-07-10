<script setup lang="ts">
import { useSimulatorStore } from '../../stores/simulator';

const store = useSimulatorStore();
</script>

<template>
  <ol class="timeline" aria-label="Event timeline">
    <li v-for="(event, index) in store.events" :key="event.id">
      <button
        type="button"
        class="marker"
        :class="[event.phase, { active: index === store.cursor, past: index < store.cursor }]"
        :aria-current="index === store.cursor ? 'step' : undefined"
        :title="event.label"
        @click="store.jumpTo(index)"
      >
        {{ index + 1 }}
      </button>
    </li>
  </ol>
</template>

<style scoped>
.timeline {
  list-style: none;
  display: flex;
  gap: 0.35rem;
  padding: 0;
  margin: 0.5rem 0 0;
  flex-wrap: wrap;
}
.marker {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  color: inherit;
  font-size: 0.7rem;
  cursor: pointer;
  opacity: 0.5;
}
.marker.past {
  opacity: 0.75;
}
.marker.active {
  opacity: 1;
  border-color: var(--accent);
  background: var(--accent);
  color: var(--surface);
  font-weight: 700;
}
.marker.failure {
  border-color: var(--red);
  color: var(--red);
}
.marker.failure.active {
  background: var(--red);
  color: var(--surface);
}
.marker:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
