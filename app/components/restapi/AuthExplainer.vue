<script setup lang="ts">
import { computed } from 'vue';
import { useRestApiSimulatorStore } from '../../stores/restApiSimulator';
import { authSchemes } from '../../../rest-engine/authSchemes';

const store = useRestApiSimulatorStore();
const scheme = computed(() => store.authScheme);
</script>

<template>
  <section class="auth-explainer" aria-labelledby="auth-explainer-heading">
    <h2 id="auth-explainer-heading">Authorization</h2>
    <p class="intro">
      Two different questions get confused constantly: <strong>authentication</strong> ("who are you?" — fails with
      <code>401 Unauthorized</code>) and <strong>authorization</strong> ("are you allowed to do this?" — fails with
      <code>403 Forbidden</code>). Pick a scheme below to see how it answers the first question.
    </p>

    <div class="scheme-picker">
      <button
        v-for="s in authSchemes"
        :key="s.id"
        type="button"
        class="scheme-chip"
        :class="{ active: store.selectedAuthSchemeId === s.id }"
        @click="store.selectAuthScheme(s.id)"
      >
        {{ s.name }}
      </button>
    </div>

    <div class="scheme-detail">
      <p class="header-example"><code>{{ scheme.headerExample }}</code></p>
      <p>{{ scheme.summary }}</p>
      <p><strong>How it works:</strong> {{ scheme.howItWorks }}</p>
      <p><strong>Use it when:</strong> {{ scheme.whenToUse }}</p>

      <div class="pros-cons">
        <div>
          <h4>Pros</h4>
          <ul>
            <li v-for="(p, i) in scheme.pros" :key="i">{{ p }}</li>
          </ul>
        </div>
        <div>
          <h4>Cons</h4>
          <ul>
            <li v-for="(c, i) in scheme.cons" :key="i">{{ c }}</li>
          </ul>
        </div>
      </div>

      <div class="failures">
        <h4>What failure looks like</h4>
        <div v-for="(f, i) in scheme.failureCodes" :key="i" class="failure-row">
          <span class="failure-code" :class="{ forbidden: f.code === 403 }">{{ f.code }} {{ f.reason }}</span>
          <span class="failure-meaning">{{ f.meaning }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.auth-explainer {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.intro {
  margin: 0;
  font-size: 0.85rem;
  color: var(--muted);
}
.intro code {
  font-family: var(--font-mono);
}
.scheme-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.scheme-chip {
  font: inherit;
  font-size: 0.78rem;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.scheme-chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--surface);
}
.scheme-detail {
  background: var(--surface-2);
  border-radius: 0.5rem;
  padding: 0.85rem;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.header-example {
  font-family: var(--font-mono);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.35rem;
  padding: 0.5rem 0.6rem;
  overflow-x: auto;
  margin: 0;
}
.pros-cons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
@media (max-width: 700px) {
  .pros-cons {
    grid-template-columns: 1fr;
  }
}
.pros-cons h4 {
  margin: 0 0 0.25rem;
  font-size: 0.8rem;
}
.pros-cons ul {
  margin: 0;
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.failures h4 {
  margin: 0 0 0.4rem;
  font-size: 0.8rem;
}
.failure-row {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.4rem 0.5rem;
  border-radius: 0.35rem;
  background: var(--surface);
  border: 1px solid var(--border);
  margin-bottom: 0.35rem;
}
.failure-code {
  font-weight: 700;
  color: var(--amber);
  font-size: 0.8rem;
}
.failure-code.forbidden {
  color: var(--red);
}
.failure-meaning {
  font-size: 0.8rem;
}
</style>
