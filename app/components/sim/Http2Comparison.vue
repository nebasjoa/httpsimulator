<script setup lang="ts">
import { computed, ref } from 'vue';
import { compareProtocols } from '../../../engine/http2Compare';

const requestCount = ref(4);
const comparison = computed(() => compareProtocols(requestCount.value));
const maxMs = computed(() => Math.max(comparison.value.totalMs.http1, comparison.value.totalMs.http2, 1));

const PALETTE = [
  'var(--client-color)',
  'var(--server-color)',
  'var(--gateway-color)',
  'var(--issuer-color)',
  'var(--green)',
  'var(--amber)',
  'var(--red)',
  'var(--accent)',
];

function colorFor(requestIndex: number): string {
  return PALETTE[requestIndex % PALETTE.length]!;
}
</script>

<template>
  <section class="http2-comparison" aria-labelledby="http2-comparison-heading">
    <h2 id="http2-comparison-heading">HTTP/1.1 vs HTTP/2</h2>
    <p class="intro">
      Same {{ requestCount }} parallel requests, two very different wire strategies. HTTP/1.1 has no
      pipelining, so a browser opens up to 6 TCP connections and queues the rest. HTTP/2 multiplexes
      every request as interleaved frames on a single connection - no connection ceiling, no queuing.
    </p>

    <label class="slider-field">
      <span>Parallel requests: {{ requestCount }}</span>
      <input type="range" min="2" max="8" step="1" v-model.number="requestCount" />
    </label>

    <div class="protocol-block">
      <h3>HTTP/1.1 <span class="total">Total: {{ Math.round(comparison.totalMs.http1) }}ms</span></h3>
      <div v-for="lane in comparison.http1" :key="lane.label" class="lane">
        <span class="lane-label">{{ lane.label }}</span>
        <div class="lane-track">
          <span
            v-for="(block, i) in lane.blocks"
            :key="i"
            class="block"
            :style="{
              left: (block.startMs / maxMs) * 100 + '%',
              width: (block.durationMs / maxMs) * 100 + '%',
              background: colorFor(block.requestIndex),
            }"
          >R{{ block.requestIndex + 1 }}</span>
        </div>
      </div>
    </div>

    <div class="protocol-block">
      <h3>HTTP/2 <span class="total">Total: {{ Math.round(comparison.totalMs.http2) }}ms</span></h3>
      <div v-for="lane in comparison.http2" :key="lane.label" class="lane">
        <span class="lane-label">{{ lane.label }}</span>
        <div class="lane-track">
          <span
            v-for="(block, i) in lane.blocks"
            :key="i"
            class="block frame"
            :style="{
              left: (block.startMs / maxMs) * 100 + '%',
              width: (block.durationMs / maxMs) * 100 + '%',
              background: colorFor(block.requestIndex),
            }"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.http2-comparison {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.intro {
  color: var(--muted);
  font-size: 0.85rem;
  margin: 0;
}
.slider-field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.85rem;
  max-width: 20rem;
}
.protocol-block {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.protocol-block h3 {
  margin: 0.4rem 0 0.2rem;
  font-size: 0.85rem;
  display: flex;
  justify-content: space-between;
}
.total {
  font-weight: 400;
  color: var(--muted);
  font-size: 0.75rem;
}
.lane {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.lane-label {
  width: 8rem;
  flex-shrink: 0;
  font-size: 0.7rem;
  color: var(--muted);
}
.lane-track {
  position: relative;
  flex: 1;
  height: 1.4rem;
  background: var(--surface-2);
  border-radius: 0.25rem;
}
.block {
  position: absolute;
  top: 2px;
  bottom: 2px;
  border-radius: 0.2rem;
  color: #fff;
  font-size: 0.65rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  white-space: nowrap;
}
.block.frame {
  border-right: 1px solid var(--surface-2);
}
</style>
