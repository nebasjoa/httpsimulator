<script setup lang="ts">
import { computed } from 'vue';

const route = useRoute();
const router = useRouter();

const titles: Record<string, string> = {
  '/': 'HTTP Simulator',
  '/git': 'Git Simulator',
  '/rest-api': 'REST API Simulator',
};

const title = computed(() => titles[route.path] ?? 'Simulator');

function onChange(event: Event) {
  router.push((event.target as HTMLSelectElement).value);
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <h1>{{ title }}</h1>
      <select class="simulator-select" :value="route.path" aria-label="Choose simulator" @change="onChange">
        <option value="/">HTTP Simulator</option>
        <option value="/git">Git Simulator</option>
        <option value="/rest-api">REST API Simulator</option>
      </select>
    </header>
    <slot />
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
.simulator-select {
  font: inherit;
  padding: 0.35rem 0.6rem;
  border-radius: 0.35rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: inherit;
  cursor: pointer;
}
</style>
