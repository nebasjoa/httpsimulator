<script setup lang="ts">
import { computed } from 'vue';
import { useRestApiSimulatorStore } from '../../stores/restApiSimulator';
import { methodCatalog } from '../../../rest-engine/methodCatalog';
import type { HttpMethod } from '../../../rest-engine/types';

const store = useRestApiSimulatorStore();

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'var(--accent)',
  POST: 'var(--green)',
  PUT: 'var(--amber)',
  PATCH: 'var(--gateway-color)',
  DELETE: 'var(--red)',
  HEAD: 'var(--muted)',
  OPTIONS: 'var(--issuer-color)',
};

const info = computed(() => store.methodInfo);
const color = computed(() => METHOD_COLORS[store.selectedMethod]);

function wireText(line: string, headers: string[], body?: string): string {
  const lines = [line, ...headers, ''];
  if (body) lines.push(body);
  return lines.join('\n');
}

const requestWire = computed(() => wireText(info.value.example.request.line, info.value.example.request.headers, info.value.example.request.body));
const responseWire = computed(() => wireText(info.value.example.response.line, info.value.example.response.headers, info.value.example.response.body));
</script>

<template>
  <section class="method-explorer" aria-labelledby="method-explorer-heading">
    <h2 id="method-explorer-heading">What does each method actually do?</h2>
    <p class="intro">
      Every example below acts on the same imaginary resource — an order — so you can see exactly what changes
      between methods instead of guessing from different examples each time.
    </p>

    <div class="method-tabs" role="tablist">
      <button
        v-for="m in methodCatalog"
        :key="m.method"
        type="button"
        role="tab"
        class="method-tab"
        :class="{ active: store.selectedMethod === m.method }"
        :style="{ '--tab-color': METHOD_COLORS[m.method] }"
        :aria-selected="store.selectedMethod === m.method"
        @click="store.selectMethod(m.method)"
      >
        {{ m.method }}
      </button>
    </div>

    <div class="method-body" :style="{ '--tab-color': color }">
      <div class="method-headline">
        <span class="method-badge" :style="{ background: color }">{{ info.method }}</span>
        <span class="crud-label">{{ info.crud }}</span>
      </div>
      <p class="summary">{{ info.summary }}</p>

      <div class="traits">
        <span class="trait" :class="{ yes: info.safe, no: !info.safe }">
          {{ info.safe ? '✓' : '✕' }} Safe (never changes state)
        </span>
        <span class="trait" :class="{ yes: info.idempotent, no: !info.idempotent }">
          {{ info.idempotent ? '✓' : '✕' }} Idempotent
        </span>
        <span class="trait" :class="{ yes: info.cacheable, no: !info.cacheable }">
          {{ info.cacheable ? '✓' : '✕' }} Cacheable
        </span>
        <span class="trait neutral">Request body: {{ info.requestBody }}</span>
        <span class="trait neutral">Response body: {{ info.responseBody }}</span>
      </div>

      <p class="when-to-use"><strong>Use it when:</strong> {{ info.whenToUse }}</p>

      <div class="example">
        <h3>{{ info.example.title }}</h3>

        <div class="state-flow">
          <div class="state-box">
            <h4>Before</h4>
            <pre v-if="info.example.resourceBefore">{{ info.example.resourceBefore }}</pre>
            <p v-else class="none">does not exist yet</p>
          </div>
          <div class="state-arrow" :style="{ color }" aria-hidden="true">
            {{ info.method }} →
          </div>
          <div class="state-box">
            <h4>After</h4>
            <pre v-if="info.example.resourceAfter">{{ info.example.resourceAfter }}</pre>
            <p v-else class="none">no longer exists</p>
          </div>
        </div>

        <p class="narrative">{{ info.example.narrative }}</p>

        <div class="wire-pair">
          <div class="wire-panel">
            <h4>Request</h4>
            <pre class="wire-text">{{ requestWire }}</pre>
          </div>
          <div class="wire-panel">
            <h4>Response</h4>
            <pre class="wire-text">{{ responseWire }}</pre>
          </div>
        </div>

        <div class="mistakes">
          <h4>Common mistakes</h4>
          <ul>
            <li v-for="(m, i) in info.commonMistakes" :key="i">{{ m }}</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.method-explorer {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.intro {
  color: var(--muted);
  font-size: 0.85rem;
  margin: 0;
}
.method-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.method-tab {
  font: inherit;
  font-weight: 600;
  font-size: 0.8rem;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--tab-color);
  color: var(--tab-color);
  background: transparent;
  cursor: pointer;
}
.method-tab.active {
  background: var(--tab-color);
  color: var(--surface);
}
.method-body {
  border-left: 3px solid var(--tab-color);
  padding-left: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.method-headline {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.method-badge {
  color: #fff;
  font-weight: 700;
  font-size: 0.85rem;
  padding: 0.15rem 0.6rem;
  border-radius: 0.3rem;
}
.crud-label {
  color: var(--muted);
  font-size: 0.85rem;
}
.summary {
  margin: 0;
}
.traits {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-size: 0.75rem;
}
.trait {
  padding: 0.15rem 0.5rem;
  border-radius: 0.3rem;
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.trait.yes {
  color: var(--green);
  border-color: var(--green);
}
.trait.no {
  color: var(--muted);
}
.trait.neutral {
  color: inherit;
}
.when-to-use {
  margin: 0;
  font-size: 0.9rem;
}
.example {
  background: var(--surface-2);
  border-radius: 0.5rem;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.example h3 {
  margin: 0;
  font-size: 0.95rem;
}
.state-flow {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0.5rem;
  align-items: center;
}
.state-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.4rem;
  padding: 0.5rem 0.6rem;
  min-width: 0;
}
.state-box h4 {
  margin: 0 0 0.3rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--muted);
}
.state-box pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  white-space: pre-wrap;
  word-break: break-word;
}
.state-box .none {
  margin: 0;
  font-size: 0.75rem;
  color: var(--muted);
  font-style: italic;
}
.state-arrow {
  font-weight: 700;
  font-size: 0.8rem;
  white-space: nowrap;
}
.narrative {
  margin: 0;
  font-size: 0.85rem;
}
.wire-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}
@media (max-width: 700px) {
  .wire-pair {
    grid-template-columns: 1fr;
  }
  .state-flow {
    grid-template-columns: 1fr;
  }
  .state-arrow {
    justify-self: start;
  }
}
.wire-panel h4 {
  margin: 0 0 0.25rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--muted);
}
.wire-text {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.4rem;
  padding: 0.6rem;
  margin: 0;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
.mistakes h4 {
  margin: 0 0 0.25rem;
  font-size: 0.8rem;
}
.mistakes ul {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.82rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
</style>
