<script setup lang="ts">
import { useSimulatorStore } from '../../stores/simulator';
import type { Party } from '../../../engine/types';

const store = useSimulatorStore();

const PARTY_LABELS: Record<Party, string> = {
  client: 'Client',
  server: 'Server',
  gateway: 'Gateway',
  issuer: 'Issuer',
};
</script>

<template>
  <section class="event-detail" aria-labelledby="event-detail-heading" aria-live="polite">
    <h2 id="event-detail-heading" class="visually-hidden">Event detail</h2>
    <template v-if="store.activeEvent">
      <div class="event-detail-header">
        <span class="phase-badge" :class="store.activeEvent.phase">{{ store.activeEvent.phase }}</span>
        <strong>{{ store.activeEvent.label }}</strong>
        <span class="party-path">
          {{ PARTY_LABELS[store.activeEvent.from] }}<template v-if="store.activeEvent.to"> → {{ PARTY_LABELS[store.activeEvent.to] }}</template>
        </span>
      </div>
      <p class="detail-text">{{ store.activeEvent.detail }}</p>
      <dl v-if="store.activeEvent.meta" class="meta-table">
        <template v-for="(value, key) in store.activeEvent.meta" :key="key">
          <dt>{{ key }}</dt>
          <dd>{{ value }}</dd>
        </template>
      </dl>
    </template>
    <p v-else class="empty-hint">Step through the sequence to see an explanation of each event here.</p>
  </section>
</template>

<style scoped>
.event-detail {
  background: var(--surface-2);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.85rem;
}
.event-detail-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.3rem;
}
.phase-badge {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
  border: 1px solid var(--border);
  color: var(--muted);
}
.phase-badge.failure {
  color: var(--red);
  border-color: var(--red);
}
.party-path {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--muted);
}
.detail-text {
  margin: 0 0 0.3rem;
  color: var(--muted);
}
.meta-table {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.15rem 0.75rem;
  margin: 0.4rem 0 0;
  font-family: var(--font-mono);
  font-size: 0.78rem;
}
.meta-table dt {
  color: var(--muted);
}
.meta-table dd {
  margin: 0;
}
.empty-hint {
  color: var(--muted);
  margin: 0;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
</style>
