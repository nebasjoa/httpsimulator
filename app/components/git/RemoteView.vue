<script setup lang="ts">
import { computed } from 'vue';
import { useGitSimulatorStore } from '../../stores/gitSimulator';
import { computeGraphLayout } from '../../../git-engine/graphLayout';
import type { RepoState } from '../../../git-engine/types';

const store = useGitSimulatorStore();

// computeGraphLayout expects a full RepoState; a remote only has commits + branches, so
// wrap it in a minimal shell for layout purposes (no HEAD/tags/staging concept on a remote).
const remoteAsRepoState = computed<RepoState | null>(() => {
  const remote = store.repoState.remote;
  if (!remote) return null;
  return {
    initialized: true,
    fileName: store.repoState.fileName,
    commits: remote.commits,
    branches: remote.branches,
    tags: {},
    head: null,
    staging: null,
    workingDir: { content: '', status: 'clean' },
    stash: [],
    reflog: [],
    remoteName: null,
    remote: null,
    conflict: null,
    clock: 0,
  };
});

const layout = computed(() => (remoteAsRepoState.value ? computeGraphLayout(remoteAsRepoState.value) : { nodes: [], edges: [] }));
</script>

<template>
  <div v-if="remoteAsRepoState" class="remote-view">
    <h3>{{ store.repoState.remoteName }} (remote)</h3>
    <p v-if="layout.nodes.length === 0" class="empty-hint">Nothing pushed here yet.</p>
    <ul v-else class="remote-commits">
      <li v-for="node in [...layout.nodes].sort((a, b) => b.x - a.x)" :key="node.id">
        <span class="hash">{{ node.shortId }}</span>
        <span class="message">{{ node.message }}</span>
        <span v-for="b in node.branchLabels" :key="b" class="ref-chip">{{ b }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.remote-view {
  background: var(--surface-2);
  border-radius: 0.5rem;
  padding: 0.6rem 0.75rem;
  font-size: 0.78rem;
}
.remote-view h3 {
  margin: 0 0 0.35rem;
  font-size: 0.8rem;
  color: var(--muted);
}
.empty-hint {
  margin: 0;
  color: var(--muted);
}
.remote-commits {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.remote-commits li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.hash {
  font-family: var(--font-mono);
  color: var(--accent);
}
.ref-chip {
  font-size: 0.6rem;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  border: 1px solid var(--client-color);
  color: var(--client-color);
}
</style>
