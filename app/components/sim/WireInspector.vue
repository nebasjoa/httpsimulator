<script setup lang="ts">
import { ref } from 'vue';
import { useSimulatorStore } from '../../stores/simulator';
import type { HeaderLine, WireMessage } from '../../../engine/types';
import { getHeaderInfo, type HeaderInfo } from '../../../engine/headerCatalog';
import { getStatusInfo, type StatusInfo } from '../../../engine/statusCatalog';

const store = useSimulatorStore();

type Line = { kind: 'start' | 'header' | 'blank' | 'body'; text: string; header?: HeaderLine };

function toLines(wire: WireMessage): Line[] {
  const lines: Line[] = [{ kind: 'start', text: wire.startLine }];
  for (const h of wire.headers) lines.push({ kind: 'header', text: `${h.name}: ${h.value}`, header: h });
  lines.push({ kind: 'blank', text: '' });
  if (wire.body) lines.push({ kind: 'body', text: wire.body });
  return lines;
}

const selected = ref<{ kind: 'header'; info: HeaderInfo } | { kind: 'status'; info: StatusInfo } | null>(null);

function onHeaderClick(header: HeaderLine) {
  const info = getHeaderInfo(header.name);
  selected.value = info ? { kind: 'header', info } : null;
}

function onStatusLineClick(wire: WireMessage) {
  const match = wire.startLine.match(/HTTP\/\d\.\d (\d{3})/);
  if (!match) return;
  try {
    selected.value = { kind: 'status', info: getStatusInfo(Number(match[1])) };
  } catch {
    selected.value = null;
  }
}
</script>

<template>
  <section class="wire-inspector" aria-labelledby="wire-inspector-heading">
    <h2 id="wire-inspector-heading">Wire</h2>

    <p v-if="!store.wirePairs.length" class="empty-hint">Build a request to see the raw bytes.</p>

    <div v-for="(pair, pairIndex) in store.wirePairs" :key="pairIndex" class="wire-pair">
      <h3 v-if="pair.label" class="pair-label">{{ pair.label }}</h3>

      <div v-if="pair.requestEvent?.wire" class="wire-panel">
        <div class="wire-panel-header">
          <h4>Request</h4>
          <span
            v-if="store.mode === 'real' && !pair.requestEvent.observableViaFetch"
            class="badge reconstructed"
          >reconstructed</span>
        </div>
        <div class="wire-text">
          <div v-for="(line, i) in toLines(pair.requestEvent.wire)" :key="i" class="wire-line" :class="line.kind">
            <template v-if="line.kind === 'header'">
              <button type="button" class="line-btn" @click="onHeaderClick(line.header!)">{{ line.text }}</button>
              <span v-if="line.header?.auto" class="auto-badge">auto</span>
            </template>
            <span v-else-if="line.kind === 'body'" class="body-text">{{ line.text }}</span>
            <span v-else class="line-text">{{ line.text }}</span>
            <span v-if="line.kind !== 'body'" class="crlf" aria-hidden="true">␍␊</span>
          </div>
        </div>
      </div>

      <div v-if="pair.responseEvent?.wire" class="wire-panel">
        <div class="wire-panel-header">
          <h4>Response</h4>
          <span
            v-if="store.mode === 'real' && !pair.responseEvent.observableViaFetch"
            class="badge reconstructed"
          >reconstructed</span>
          <span
            v-else-if="store.mode === 'real' && pair.responseEvent.observableViaFetch"
            class="badge observed"
          >observed via fetch</span>
        </div>
        <div class="wire-text">
          <div v-for="(line, i) in toLines(pair.responseEvent.wire)" :key="i" class="wire-line" :class="line.kind">
            <template v-if="line.kind === 'header'">
              <button type="button" class="line-btn" @click="onHeaderClick(line.header!)">{{ line.text }}</button>
              <span v-if="line.header?.auto" class="auto-badge">auto</span>
            </template>
            <button
              v-else-if="line.kind === 'start'"
              type="button"
              class="line-btn"
              @click="onStatusLineClick(pair.responseEvent.wire!)"
            >{{ line.text }}</button>
            <span v-else-if="line.kind === 'body'" class="body-text">{{ line.text }}</span>
            <span v-else class="line-text">{{ line.text }}</span>
            <span v-if="line.kind !== 'body'" class="crlf" aria-hidden="true">␍␊</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selected" class="info-panel" role="dialog" aria-live="polite">
      <button class="close" type="button" aria-label="Close" @click="selected = null">✕</button>
      <template v-if="selected.kind === 'header'">
        <h4><code>{{ selected.info.name }}</code></h4>
        <p>{{ selected.info.summary }}</p>
        <p class="example"><code>{{ selected.info.example }}</code></p>
        <p v-if="selected.info.context" class="context">{{ selected.info.context }}</p>
      </template>
      <template v-else>
        <h4>{{ selected.info.code }} {{ selected.info.reason }}</h4>
        <p>{{ selected.info.summary }}</p>
        <p class="payments-example"><strong>In payments:</strong> {{ selected.info.paymentsExample }}</p>
        <p class="client-action"><strong>Client should:</strong> {{ selected.info.clientAction }}</p>
      </template>
    </div>
  </section>
</template>

<style scoped>
.wire-inspector {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.wire-pair {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border);
}
.wire-pair:first-child {
  border-top: none;
  padding-top: 0;
}
.pair-label {
  margin: 0;
  font-size: 0.8rem;
  color: var(--muted);
}
.wire-panel-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.wire-panel-header h4 {
  margin: 0;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}
.badge {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 0.3rem;
  border: 1px solid currentColor;
}
.badge.reconstructed {
  color: var(--amber);
}
.badge.observed {
  color: var(--green);
}
.wire-text {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  background: var(--surface-2);
  border-radius: 0.5rem;
  padding: 0.75rem;
  overflow-x: auto;
}
.wire-line {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  white-space: pre-wrap;
  word-break: break-word;
  min-height: 1.4em;
}
.wire-line.blank {
  background: var(--surface-3);
  border-radius: 0.2rem;
}
.line-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-decoration: underline dotted;
  text-align: left;
}
.line-btn:hover,
.line-btn:focus-visible {
  color: var(--accent);
}
.auto-badge {
  font-size: 0.65rem;
  color: var(--muted);
  border: 1px solid var(--muted);
  border-radius: 0.25rem;
  padding: 0 0.25rem;
}
.crlf {
  margin-left: auto;
  color: var(--muted);
  opacity: 0.7;
}
.body-text {
  white-space: pre-wrap;
}
.info-panel {
  position: relative;
  background: var(--surface-2);
  border-radius: 0.5rem;
  padding: 1rem;
  border-left: 3px solid var(--accent);
}
.info-panel .close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}
.empty-hint {
  color: var(--muted);
}
</style>
