<script setup lang="ts">
import { computed } from 'vue';
import { useSimulatorStore } from '../../stores/simulator';
import { buildRequestWire } from '../../../engine/wire';
import type { RequestConfig } from '../../../engine/types';

const store = useSimulatorStore();

const methods: RequestConfig['method'][] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const method = computed({
  get: () => store.requestConfig.method,
  set: (value: RequestConfig['method']) => store.updateRequestConfig({ method: value }),
});
const https = computed({
  get: () => store.requestConfig.https,
  set: (value: boolean) => store.updateRequestConfig({ https: value }),
});
const host = computed({
  get: () => store.requestConfig.host,
  set: (value: string) => store.updateRequestConfig({ host: value }),
});
const path = computed({
  get: () => store.requestConfig.path,
  set: (value: string) => store.updateRequestConfig({ path: value }),
});
const contentType = computed({
  get: () => store.requestConfig.contentType ?? '',
  set: (value: string) => store.updateRequestConfig({ contentType: value }),
});
const body = computed({
  get: () => store.requestConfig.body ?? '',
  set: (value: string) => store.updateRequestConfig({ body: value }),
});

const hasBodyMethod = computed(() => ['POST', 'PUT', 'PATCH'].includes(store.requestConfig.method));
const isGet = computed(() => store.requestConfig.method === 'GET');

const autoHeaders = computed(() => buildRequestWire(store.requestConfig).headers.filter((h) => h.auto));

function onAuthToggle(event: Event) {
  store.setAuthEnabled((event.target as HTMLInputElement).checked);
}

const crossOrigin = computed({
  get: () => !!store.requestConfig.crossOrigin,
  set: (value: boolean) => store.updateRequestConfig({ crossOrigin: value }),
});
const conditionalRefetch = computed({
  get: () => !!store.requestConfig.conditionalRefetch,
  set: (value: boolean) => store.updateRequestConfig({ conditionalRefetch: value }),
});
</script>

<template>
  <section class="request-builder" aria-labelledby="request-builder-heading">
    <h2 id="request-builder-heading">Request</h2>

    <div class="field-row">
      <label class="field">
        <span class="field-label">Method</span>
        <select v-model="method">
          <option v-for="m in methods" :key="m" :value="m">{{ m }}</option>
        </select>
      </label>

      <label class="checkbox">
        <input type="checkbox" v-model="https" />
        HTTPS
      </label>
    </div>

    <label class="field">
      <span class="field-label">Host</span>
      <input type="text" v-model="host" placeholder="pay.computop.com" />
    </label>

    <label class="field">
      <span class="field-label">Path</span>
      <input type="text" v-model="path" placeholder="/paymentpage" />
    </label>

    <template v-if="hasBodyMethod">
      <label class="field">
        <span class="field-label">
          Content-Type
          <span class="info-icon-wrap">
            <button type="button" class="info-icon" tabindex="0" aria-label="What is Content-Type?">i</button>
            <span class="tooltip" role="tooltip">
              Tells the server what kind of data the body contains, so it knows how to parse it. Common values:
              <code>application/x-www-form-urlencoded</code> (HTML form fields, key=value pairs),
              <code>application/json</code> (JSON payload),
              <code>multipart/form-data</code> (file uploads),
              <code>text/plain</code> (plain text).
            </span>
          </span>
        </span>
        <input type="text" v-model="contentType" placeholder="application/x-www-form-urlencoded" />
      </label>
      <label class="field">
        <span class="field-label">Body</span>
        <textarea v-model="body" rows="3" placeholder="MerchantID=Test&amp;Amount=1999" />
      </label>
    </template>

    <div class="checkbox-row">
      <label class="checkbox">
        <input type="checkbox" :checked="store.authEnabled" @change="onAuthToggle" />
        Add Authorization header
      </label>
      <span class="info-icon-wrap">
        <button type="button" class="info-icon" tabindex="0" aria-label="What does Add Authorization header do?">i</button>
        <span class="tooltip" role="tooltip">
          Injects an <code>Authorization: Basic ...</code> header carrying credentials with the request. Servers
          that require auth check this header and respond <code>401 Unauthorized</code> (with a
          <code>WWW-Authenticate</code> challenge) if it is missing or invalid.
        </span>
      </span>
    </div>

    <div class="checkbox-row">
      <label class="checkbox">
        <input type="checkbox" v-model="crossOrigin" />
        Cross-origin request (adds CORS preflight)
      </label>
      <span class="info-icon-wrap">
        <button type="button" class="info-icon" tabindex="0" aria-label="What does Cross-origin request do?">i</button>
        <span class="tooltip" role="tooltip">
          Simulates calling the endpoint from a different origin (e.g. a merchant site calling the gateway's API
          directly from the browser). Before the real request, the browser sends an <code>OPTIONS</code> preflight
          with <code>Access-Control-Request-Method</code>, and the server must answer with matching
          <code>Access-Control-Allow-*</code> headers or the browser blocks the response.
        </span>
      </span>
    </div>

    <label class="checkbox" v-if="isGet">
      <input type="checkbox" v-model="conditionalRefetch" />
      Conditional GET (adds If-None-Match refetch)
    </label>

    <div class="auto-headers" v-if="autoHeaders.length">
      <h3>Auto headers</h3>
      <ul>
        <li v-for="h in autoHeaders" :key="h.name">
          <code>{{ h.name }}: {{ h.value }}</code>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.request-builder {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.85rem;
}
.field-label {
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.info-icon-wrap {
  position: relative;
  display: inline-flex;
}
.info-icon {
  width: 1rem;
  height: 1rem;
  line-height: 1rem;
  border-radius: 50%;
  border: 1px solid var(--muted);
  background: none;
  color: var(--muted);
  font-size: 0.65rem;
  font-style: italic;
  font-family: serif;
  padding: 0;
  cursor: help;
}
.info-icon:hover,
.info-icon:focus-visible {
  color: var(--accent);
  border-color: var(--accent);
}
.tooltip {
  position: absolute;
  top: calc(100% + 0.4rem);
  left: 0;
  width: max-content;
  max-width: 18rem;
  background: var(--surface-3);
  color: inherit;
  font-family: var(--font-body, sans-serif);
  font-size: 0.75rem;
  font-weight: normal;
  line-height: 1.35;
  white-space: normal;
  padding: 0.5rem 0.6rem;
  border-radius: 0.35rem;
  border: 1px solid var(--border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.12s ease;
  pointer-events: none;
  z-index: 10;
}
.tooltip code {
  font-family: var(--font-mono);
}
.info-icon-wrap:hover .tooltip,
.info-icon-wrap:focus-within .tooltip {
  opacity: 1;
  visibility: visible;
}
.field-row {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}
.checkbox {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
}
.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
input[type='text'],
select,
textarea {
  font: inherit;
  padding: 0.35rem 0.5rem;
  border-radius: 0.35rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: inherit;
}
textarea {
  font-family: var(--font-mono);
  resize: vertical;
}
.auto-headers {
  font-size: 0.8rem;
  color: var(--muted);
}
.auto-headers h3 {
  margin: 0.4rem 0 0.2rem;
  font-size: 0.75rem;
  text-transform: uppercase;
}
.auto-headers ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
