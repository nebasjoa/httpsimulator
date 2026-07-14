<script setup lang="ts">
import { computed, ref } from 'vue';
import { commandReference, outOfScopeNote, type CommandInfo } from '../../../git-engine/commandReference';

const categories: { key: CommandInfo['category']; label: string }[] = [
  { key: 'setup', label: 'Setup & inspection' },
  { key: 'snapshot', label: 'Snapshotting' },
  { key: 'branch', label: 'Branching & tags' },
  { key: 'history', label: 'History & undo' },
  { key: 'merge', label: 'Merging' },
  { key: 'stash', label: 'Stashing' },
  { key: 'remote', label: 'Remotes' },
  { key: 'cleanup', label: 'Cleanup' },
];

const grouped = computed(() => categories.map((c) => ({ ...c, items: commandReference.filter((cmd) => cmd.category === c.key) })));
const selected = ref<CommandInfo | null>(null);
</script>

<template>
  <section class="command-reference" aria-labelledby="command-reference-heading">
    <h2 id="command-reference-heading">Command reference</h2>
    <div class="reference-layout">
      <div class="groups">
        <div v-for="group in grouped" :key="group.key" class="command-group">
          <h3>{{ group.label }}</h3>
          <div class="command-chips">
            <button
              v-for="c in group.items"
              :key="c.command"
              type="button"
              class="command-chip"
              :class="{ active: selected?.command === c.command, destructive: c.destructive }"
              @click="selected = c"
            >
              {{ c.command }}
            </button>
          </div>
        </div>
      </div>

      <div class="detail" v-if="selected">
        <h4>{{ selected.command }} <span v-if="selected.destructive" class="destructive-tag">destructive</span></h4>
        <p>{{ selected.summary }}</p>
        <p class="example"><code>{{ selected.example }}</code></p>
      </div>
      <p class="detail empty" v-else>Select a command to read what it does.</p>
    </div>
    <p class="out-of-scope">{{ outOfScopeNote }}</p>
  </section>
</template>

<style scoped>
.command-reference {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.reference-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
}
@media (max-width: 900px) {
  .reference-layout {
    grid-template-columns: 1fr;
  }
}
.command-group h3 {
  margin: 0.5rem 0 0.25rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--muted);
}
.command-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.command-chip {
  font: inherit;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: inherit;
  background: transparent;
  cursor: pointer;
}
.command-chip.destructive {
  border-color: var(--amber);
  color: var(--amber);
}
.command-chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--surface);
  font-weight: 600;
}
.command-chip.destructive.active {
  background: var(--amber);
  border-color: var(--amber);
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
.destructive-tag {
  font-size: 0.6rem;
  text-transform: uppercase;
  color: var(--amber);
  border: 1px solid var(--amber);
  border-radius: 0.25rem;
  padding: 0.05rem 0.35rem;
  vertical-align: middle;
}
.example code {
  font-family: var(--font-mono);
  background: var(--surface-3);
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
}
.out-of-scope {
  font-size: 0.75rem;
  color: var(--muted);
  margin: 0;
}
</style>
