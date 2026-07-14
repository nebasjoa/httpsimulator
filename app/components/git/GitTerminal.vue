<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { useGitSimulatorStore } from '../../stores/gitSimulator';

const store = useGitSimulatorStore();
const scrollEl = ref<HTMLElement | null>(null);

function submit() {
  if (!store.commandInput.trim()) return;
  store.runCommand(store.commandInput);
}

watch(
  () => store.history.length,
  async () => {
    await nextTick();
    scrollEl.value?.scrollTo({ top: scrollEl.value.scrollHeight });
  }
);
</script>

<template>
  <section class="git-terminal" aria-labelledby="git-terminal-heading">
    <h2 id="git-terminal-heading">Terminal</h2>
    <div class="transcript" ref="scrollEl">
      <p v-if="store.history.length === 0" class="empty-hint">Nothing has run yet - type a command below, e.g. "git init".</p>
      <div v-for="(step, index) in store.history" :key="step.id" class="line" :class="{ current: index === store.cursor }">
        <div class="prompt-row" :class="{ edit: step.kind === 'edit' }">
          <span class="prompt">{{ step.kind === 'edit' ? '✎' : '$' }}</span>
          <span class="input">{{ step.input }}</span>
        </div>
        <pre class="output" :class="{ error: step.error, destructive: step.destructive }">{{ step.detail }}</pre>
      </div>
    </div>
    <form class="input-row" @submit.prevent="submit">
      <span class="prompt">$</span>
      <input
        v-model="store.commandInput"
        type="text"
        autocomplete="off"
        spellcheck="false"
        placeholder="git status"
        aria-label="Type a git command"
      />
      <button type="submit">Run</button>
    </form>
  </section>
</template>

<style scoped>
.git-terminal {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.transcript {
  background: var(--surface-2);
  border-radius: 0.5rem;
  padding: 0.6rem 0.75rem;
  max-height: 260px;
  overflow-y: auto;
  font-family: var(--font-mono);
  font-size: 0.8rem;
}
.empty-hint {
  color: var(--muted);
  margin: 0;
}
.line {
  margin-bottom: 0.5rem;
  opacity: 0.7;
}
.line.current {
  opacity: 1;
}
.prompt-row {
  display: flex;
  gap: 0.4rem;
}
.prompt-row.edit .input {
  font-style: italic;
  color: var(--muted);
}
.prompt {
  color: var(--accent);
  font-weight: 700;
}
.output {
  margin: 0.15rem 0 0 1.1rem;
  white-space: pre-wrap;
  color: var(--muted);
  font-family: var(--font-mono);
}
.output.error {
  color: var(--red);
}
.output.destructive {
  color: var(--amber);
}
.input-row {
  display: flex;
  gap: 0.4rem;
}
.input-row .prompt {
  align-self: center;
}
.input-row input {
  flex: 1;
  font: inherit;
  font-family: var(--font-mono);
  padding: 0.4rem 0.6rem;
  border-radius: 0.35rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: inherit;
}
.input-row button {
  font: inherit;
  padding: 0.4rem 0.8rem;
  border-radius: 0.35rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: inherit;
  cursor: pointer;
}
.input-row button:hover {
  border-color: var(--accent);
}
</style>
