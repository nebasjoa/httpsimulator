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
        <span class="field-label">Content-Type</span>
        <input type="text" v-model="contentType" placeholder="application/x-www-form-urlencoded" />
      </label>
      <label class="field">
        <span class="field-label">Body</span>
        <textarea v-model="body" rows="3" placeholder="MerchantID=Test&amp;Amount=1999" />
      </label>
    </template>

    <label class="checkbox">
      <input type="checkbox" :checked="store.authEnabled" @change="onAuthToggle" />
      Add Authorization header
    </label>

    <label class="checkbox">
      <input type="checkbox" v-model="crossOrigin" />
      Cross-origin request (adds CORS preflight)
    </label>

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
