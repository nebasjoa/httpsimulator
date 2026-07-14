<script setup lang="ts">
import { useGitSimulatorStore } from '../../stores/gitSimulator';

const store = useGitSimulatorStore();
</script>

<template>
  <section class="step-detail" aria-labelledby="step-detail-heading" aria-live="polite">
    <h2 id="step-detail-heading" class="visually-hidden">Step detail</h2>
    <template v-if="store.activeStep">
      <div class="step-detail-header">
        <span class="kind-badge" :class="store.activeStep.kind">{{ store.activeStep.kind === 'edit' ? 'editor' : 'command' }}</span>
        <code class="input-line">{{ store.activeStep.input }}</code>
        <span v-if="store.activeStep.error" class="flag error">error</span>
        <span v-else-if="store.activeStep.destructive" class="flag destructive">destructive</span>
      </div>
      <p class="detail-text" :class="{ 'is-error': store.activeStep.error }">{{ store.activeStep.detail }}</p>
      <div v-if="store.activeStep.warning" class="warning-box">
        <strong>⚠ {{ store.activeStep.recoverable ? 'Be careful' : 'No undo' }}:</strong> {{ store.activeStep.warning }}
      </div>
      <p v-if="store.activeStep.undo" class="undo-hint"><strong>To undo:</strong> <code>{{ store.activeStep.undo }}</code></p>
    </template>
    <p v-else class="empty-hint">Step through the history (or run a command below) to see an explanation of each step here.</p>
  </section>
</template>

<style scoped>
.step-detail {
  background: var(--surface-2);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  margin-top: 0.75rem;
  font-size: 0.85rem;
}
.step-detail-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.3rem;
  flex-wrap: wrap;
}
.kind-badge {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
  border: 1px solid var(--border);
  color: var(--muted);
}
.kind-badge.edit {
  border-style: dashed;
}
.input-line {
  font-family: var(--font-mono);
  font-size: 0.8rem;
}
.flag {
  margin-left: auto;
  font-size: 0.65rem;
  text-transform: uppercase;
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
  border: 1px solid currentColor;
}
.flag.destructive {
  color: var(--amber);
}
.flag.error {
  color: var(--red);
}
.detail-text {
  margin: 0 0 0.3rem;
  color: var(--muted);
  white-space: pre-wrap;
}
.detail-text.is-error {
  color: var(--red);
}
.warning-box {
  background: color-mix(in srgb, var(--amber) 12%, transparent);
  border: 1px solid var(--amber);
  border-radius: 0.4rem;
  padding: 0.5rem 0.6rem;
  margin: 0.4rem 0 0;
  color: var(--amber);
}
.undo-hint {
  margin: 0.4rem 0 0;
  color: var(--muted);
}
.undo-hint code {
  font-family: var(--font-mono);
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
