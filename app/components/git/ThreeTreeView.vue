<script setup lang="ts">
import { computed } from 'vue';
import { useGitSimulatorStore } from '../../stores/gitSimulator';

const store = useGitSimulatorStore();

const headCommit = computed(() => {
  const state = store.repoState;
  const id = state.head?.type === 'detached' ? state.head.commit : state.head?.type === 'branch' ? state.branches[state.head.name] : undefined;
  return id ? state.commits[id] : undefined;
});

function preview(content: string | undefined): string {
  if (content === undefined || content === '') return '(empty)';
  return content.length > 160 ? content.slice(0, 160) + '…' : content;
}
</script>

<template>
  <div class="three-tree">
    <div class="tree-box">
      <h3>Working directory</h3>
      <p class="file-name">{{ store.repoState.fileName }} <span class="status-badge" :class="store.repoState.workingDir.status">{{ store.repoState.workingDir.status }}</span></p>
      <pre class="content">{{ preview(store.repoState.workingDir.content) }}</pre>
    </div>

    <div class="arrow-col">
      <span class="arrow" title="git add">git add →</span>
      <span class="arrow back" title="git restore / checkout">← restore</span>
    </div>

    <div class="tree-box">
      <h3>Staging area (index)</h3>
      <pre class="content" :class="{ empty: store.repoState.staging === null }">{{ store.repoState.staging === null ? '(nothing staged)' : preview(store.repoState.staging) }}</pre>
    </div>

    <div class="arrow-col">
      <span class="arrow" title="git commit">git commit →</span>
      <span class="arrow back" title="git checkout / reset">← checkout / reset</span>
    </div>

    <div class="tree-box">
      <h3>Repository (HEAD)</h3>
      <p class="file-name" v-if="headCommit"><span class="hash">{{ headCommit.id.slice(0, 7) }}</span> {{ headCommit.message }}</p>
      <p class="file-name empty" v-else>(no commits yet)</p>
      <pre class="content">{{ headCommit ? preview(headCommit.content) : '(empty)' }}</pre>
    </div>
  </div>
</template>

<style scoped>
.three-tree {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  gap: 0.5rem;
  align-items: stretch;
}
@media (max-width: 900px) {
  .three-tree {
    grid-template-columns: 1fr;
  }
  .arrow-col {
    flex-direction: row;
    justify-content: center;
  }
}
.tree-box {
  background: var(--surface-2);
  border-radius: 0.5rem;
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}
.tree-box h3 {
  margin: 0;
  font-size: 0.8rem;
  color: var(--muted);
}
.file-name {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.file-name.empty {
  color: var(--muted);
  font-style: italic;
}
.hash {
  color: var(--accent);
}
.status-badge {
  font-size: 0.6rem;
  text-transform: uppercase;
  padding: 0.05rem 0.35rem;
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
.content {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  white-space: pre-wrap;
  word-break: break-word;
  color: inherit;
  flex: 1;
}
.content.empty {
  color: var(--muted);
  font-style: italic;
}
.arrow-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-size: 0.68rem;
  color: var(--muted);
  white-space: nowrap;
}
.arrow.back {
  color: var(--muted);
  opacity: 0.7;
}
</style>
