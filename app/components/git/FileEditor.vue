<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useGitSimulatorStore } from '../../stores/gitSimulator';

const store = useGitSimulatorStore();
const draft = ref(store.repoState.workingDir.content);

// Resync the draft whenever the underlying working-dir content changes for a reason
// other than this editor (stepping through history, running a command, switching
// branches). Saving is explicit - this is "your editor", not a live git input.
watch(
  () => store.repoState.workingDir.content,
  (content) => {
    draft.value = content;
  }
);

const dirty = computed(() => draft.value !== store.repoState.workingDir.content);

function save() {
  store.editFile(draft.value);
}
</script>

<template>
  <section class="file-editor" aria-labelledby="file-editor-heading">
    <div class="file-editor-header">
      <h2 id="file-editor-heading">{{ store.repoState.fileName }}</h2>
      <span class="status-badge" :class="store.repoState.workingDir.status">{{ store.repoState.workingDir.status }}</span>
    </div>
    <textarea v-model="draft" spellcheck="false" rows="7" aria-label="test.txt contents" />
    <div class="editor-actions">
      <button type="button" :disabled="!dirty" @click="save">Save edit</button>
      <span v-if="dirty" class="dirty-hint">Unsaved - this isn't a git operation until you save, then "git add" it.</span>
    </div>
  </section>
</template>

<style scoped>
.file-editor {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.file-editor-header {
  display: flex;
  align-items: center;
  margin-top: 0.75rem;
  gap: 0.5rem;
}
.file-editor-header h2 {
  margin: 0;
  font-size: 1rem;
  font-family: var(--font-mono);
}
.status-badge {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
  border: 1px solid var(--border);
  color: var(--muted);
}
.status-badge.modified {
  border-color: var(--amber);
  color: var(--amber);
}
.status-badge.untracked {
  border-color: var(--red);
  color: var(--red);
}
.status-badge.clean {
  border-color: var(--green);
  color: var(--green);
}
textarea {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  padding: 0.6rem;
  border-radius: 0.4rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: inherit;
  resize: vertical;
}
.editor-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.editor-actions button {
  font: inherit;
  padding: 0.3rem 0.7rem;
  border-radius: 0.35rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: inherit;
  cursor: pointer;
}
.editor-actions button:not(:disabled):hover {
  border-color: var(--accent);
}
.editor-actions button:disabled {
  opacity: 0.5;
  cursor: default;
}
.dirty-hint {
  font-size: 0.75rem;
  color: var(--muted);
}
</style>
