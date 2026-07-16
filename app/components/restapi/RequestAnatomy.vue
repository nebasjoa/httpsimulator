<script setup lang="ts">
import { computed } from 'vue';
import { useRestApiSimulatorStore } from '../../stores/restApiSimulator';
import { queryParamExamples } from '../../../rest-engine/queryParams';

const store = useRestApiSimulatorStore();

const selected = computed(() => store.queryParamExample);

const parts = computed(() => {
  const [pathPart, queryPart] = selected.value.url.split('?');
  return {
    scheme: 'https://',
    host: 'api.example.com',
    path: pathPart,
    query: queryPart ?? '',
  };
});
</script>

<template>
  <section class="request-anatomy" aria-labelledby="request-anatomy-heading">
    <h2 id="request-anatomy-heading">Anatomy of a URL — and what "?parameter=test" means</h2>
    <p class="intro">
      A request URL is built from labelled pieces. The part after "?" is the <strong>query string</strong>: a set of
      <code>key=value</code> pairs, joined with <code>&amp;</code>, that pass extra instructions to the server without
      changing which resource/endpoint you're calling.
    </p>

    <div class="url-diagram" aria-hidden="false">
      <div class="url-line">
        <span class="seg scheme">{{ parts.scheme }}</span><span class="seg host">{{ parts.host }}</span><span
          class="seg path"
          >{{ parts.path }}</span
        ><template v-if="parts.query"><span class="seg mark">?</span><span class="seg query">{{ parts.query }}</span></template>
      </div>
      <div class="url-labels">
        <span class="label scheme">protocol</span>
        <span class="label host">host</span>
        <span class="label path">path (identifies the resource)</span>
        <span v-if="parts.query" class="label query">query string (modifies the request)</span>
      </div>
    </div>

    <div class="param-picker">
      <button
        v-for="q in queryParamExamples"
        :key="q.id"
        type="button"
        class="param-chip"
        :class="{ active: store.selectedQueryParamId === q.id }"
        @click="store.selectQueryParam(q.id)"
      >
        {{ q.purpose }}
      </button>
    </div>

    <div class="param-detail">
      <p class="param-url"><code>{{ selected.url }}</code></p>
      <p>
        <strong>{{ selected.paramName }}</strong> = <code>{{ selected.paramValue }}</code>
        <span class="purpose-tag">{{ selected.purpose }}</span>
      </p>
      <p class="explanation">{{ selected.explanation }}</p>
    </div>

    <p class="note">
      Query parameters live only in the URL — they are visible in server access logs and browser history, so they
      are fine for filters/pagination/sorting but the wrong place for secrets. Compare with a <strong>path
      parameter</strong> like the "42" in <code>/orders/42</code>, which identifies WHICH resource, not how to
      treat it.
    </p>
  </section>
</template>

<style scoped>
.request-anatomy {
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
.url-diagram {
  background: var(--surface-2);
  border-radius: 0.5rem;
  padding: 0.75rem;
  overflow-x: auto;
}
.url-line {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  white-space: pre;
}
.url-labels {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.4rem;
  font-size: 0.7rem;
  flex-wrap: wrap;
}
.seg,
.label {
  border-radius: 0.2rem;
  padding: 0 0.15rem;
}
.seg.scheme,
.label.scheme {
  color: var(--muted);
}
.seg.host,
.label.host {
  color: var(--accent);
  font-weight: 600;
}
.seg.path,
.label.path {
  color: var(--green);
  font-weight: 600;
}
.seg.mark {
  color: var(--muted);
}
.seg.query,
.label.query {
  color: var(--amber);
  font-weight: 600;
}
.param-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.param-chip {
  font: inherit;
  font-size: 0.78rem;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.param-chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--surface);
}
.param-detail {
  background: var(--surface-2);
  border-radius: 0.5rem;
  padding: 0.75rem;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.param-url code,
.param-detail code {
  font-family: var(--font-mono);
}
.purpose-tag {
  margin-left: 0.5rem;
  font-size: 0.7rem;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0.3rem;
  padding: 0.05rem 0.4rem;
}
.explanation {
  margin: 0;
}
.note {
  font-size: 0.8rem;
  color: var(--muted);
  margin: 0;
}
.note code {
  font-family: var(--font-mono);
}
</style>
