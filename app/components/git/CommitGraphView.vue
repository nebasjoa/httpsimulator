<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import gsap from 'gsap';
import { useGitSimulatorStore } from '../../stores/gitSimulator';
import { computeGraphLayout } from '../../../git-engine/graphLayout';

const store = useGitSimulatorStore();
const headEl = ref<HTMLElement | null>(null);

const layout = computed(() => computeGraphLayout(store.repoState));

const X_GAP = 90;
const Y_GAP = 56;
const PAD = 30;
const NODE_R = 16;

function nodeStyle(node: { x: number; y: number }) {
  return { left: `${PAD + node.x * X_GAP}px`, top: `${PAD + node.y * Y_GAP}px` };
}

const width = computed(() => PAD * 2 + (Math.max(0, ...layout.value.nodes.map((n) => n.x)) + 1) * X_GAP);
const height = computed(() => PAD * 2 + (Math.max(0, ...layout.value.nodes.map((n) => n.y)) + 1) * Y_GAP + 20);

function edgePoints(edge: { from: string; to: string }) {
  const byId = new Map(layout.value.nodes.map((n) => [n.id, n]));
  const from = byId.get(edge.from);
  const to = byId.get(edge.to);
  if (!from || !to) return null;
  return {
    x1: PAD + from.x * X_GAP + NODE_R,
    y1: PAD + from.y * Y_GAP + NODE_R + 20,
    x2: PAD + to.x * X_GAP + NODE_R,
    y2: PAD + to.y * Y_GAP + NODE_R + 20,
  };
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

watch(
  () => [store.cursor, store.repoState.head, layout.value.nodes.length] as const,
  async () => {
    await nextTick();
    const node = layout.value.nodes.find((n) => n.isHead);
    const el = headEl.value;
    if (!node || !el) return;
    const target = { left: `${PAD + node.x * X_GAP - 6}px`, top: `${PAD + node.y * Y_GAP - 2}px`, opacity: 1 };
    if (prefersReducedMotion()) {
      gsap.set(el, target);
    } else {
      gsap.to(el, { ...target, duration: 0.35, ease: 'power1.inOut' });
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="commit-graph">
    <p v-if="layout.nodes.length === 0" class="empty-hint">No commits yet - "git init" then "git commit" to start the graph.</p>
    <div v-else class="graph-scroll">
      <div class="graph-canvas" :style="{ width: width + 'px', height: height + 'px' }">
        <svg class="edges" :width="width" :height="height">
          <line v-for="(edge, i) in layout.edges" :key="i" v-bind="edgePoints(edge) ?? {}" class="edge-line" />
        </svg>

        <div
          v-for="node in layout.nodes"
          :key="node.id"
          class="commit-node"
          :class="{ dangling: node.dangling, head: node.isHead }"
          :style="{ left: `${PAD + node.x * X_GAP}px`, top: `${PAD + node.y * Y_GAP + 20}px` }"
          :title="node.message"
        >
          <span class="dot" />
          <div class="node-body">
            <span class="hash">{{ node.shortId }}</span>
            <span class="message">{{ node.message }}</span>
            <span v-if="node.branchLabels.length || node.tagLabels.length" class="labels">
              <span v-for="b in node.branchLabels" :key="b" class="ref-chip branch">{{ b }}</span>
              <span v-for="t in node.tagLabels" :key="'t' + t" class="ref-chip tag">{{ t }}</span>
            </span>
          </div>
        </div>

        <div ref="headEl" class="head-marker">HEAD</div>
      </div>
    </div>
    <p class="dangling-hint" v-if="layout.nodes.some((n) => n.dangling)">
      Faded, dashed nodes are <strong>dangling</strong> - not reachable from any branch/tag, but still recoverable via "git reflog".
    </p>
  </div>
</template>

<style scoped>
.commit-graph {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.empty-hint {
  color: var(--muted);
  margin: 0;
}
.graph-scroll {
  overflow-x: auto;
  background: var(--surface-2);
  border-radius: 0.5rem;
}
.graph-canvas {
  position: relative;
  min-width: 100%;
}
.edges {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}
.edge-line {
  stroke: var(--border);
  stroke-width: 2;
}
.commit-node {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transform: translateY(-50%);
}
.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--surface);
  flex-shrink: 0;
  z-index: 1;
}
.commit-node.dangling .dot {
  background: var(--surface-3);
  border: 2px dashed var(--muted);
}
.commit-node.head .dot {
  background: var(--green);
}
.node-body {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.35rem;
  padding: 0.15rem 0.45rem;
  font-size: 0.72rem;
  white-space: nowrap;
  max-width: 220px;
}
.commit-node.dangling .node-body {
  opacity: 0.55;
  border-style: dashed;
}
.commit-node.head .node-body {
  border-color: var(--green);
}
.hash {
  font-family: var(--font-mono);
  font-weight: 700;
}
.message {
  overflow: hidden;
  text-overflow: ellipsis;
}
.labels {
  display: flex;
  gap: 0.2rem;
  margin-top: 0.15rem;
  flex-wrap: wrap;
}
.ref-chip {
  font-size: 0.6rem;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  border: 1px solid currentColor;
}
.ref-chip.branch {
  color: var(--client-color);
}
.ref-chip.tag {
  color: var(--gateway-color);
}
.head-marker {
  position: absolute;
  background: var(--green);
  color: var(--surface);
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
  z-index: 2;
  left: 0;
  top: 0;
  opacity: 0;
}
.dangling-hint {
  font-size: 0.75rem;
  color: var(--muted);
  margin: 0;
}
</style>
