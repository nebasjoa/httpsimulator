<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useGitSimulatorStore } from '../../stores/gitSimulator';
import { usePlayback } from '../../composables/usePlayback';

const store = useGitSimulatorStore();
usePlayback(store, (s) => s.history[s.cursor]);

const speeds = [0.5, 1, 2, 4];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function onKeydown(event: KeyboardEvent) {
  if (isTypingTarget(event.target)) return;
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    store.step(-1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    store.step(1);
  } else if (event.code === 'Space') {
    event.preventDefault();
    store.togglePlay();
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="transport-controls" role="group" aria-label="Playback controls">
    <button type="button" title="Reset" aria-label="Reset" @click="store.reset()">⟲</button>
    <button type="button" title="Step back" aria-label="Step back" @click="store.step(-1)">◀</button>
    <button
      type="button"
      :title="store.playing ? 'Pause' : 'Play'"
      :aria-label="store.playing ? 'Pause' : 'Play'"
      @click="store.togglePlay()"
    >{{ store.playing ? '⏸' : '▶' }}</button>
    <button type="button" title="Step forward" aria-label="Step forward" @click="store.step(1)">▶</button>

    <label class="speed">
      Speed
      <select :value="store.speedMultiplier" @change="store.setSpeed(Number(($event.target as HTMLSelectElement).value))">
        <option v-for="s in speeds" :key="s" :value="s">{{ s }}×</option>
      </select>
    </label>

    <span class="position" v-if="store.history.length">{{ store.cursor + 1 }} / {{ store.history.length }}</span>
  </div>
</template>

<style scoped>
.transport-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
button {
  font-size: 1rem;
  padding: 0.35rem 0.6rem;
  border-radius: 0.35rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: inherit;
  cursor: pointer;
}
button:hover {
  border-color: var(--accent);
}
button:focus-visible,
select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.speed {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
}
select {
  font: inherit;
  padding: 0.25rem 0.4rem;
  border-radius: 0.35rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: inherit;
}
.position {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--muted);
}
</style>
