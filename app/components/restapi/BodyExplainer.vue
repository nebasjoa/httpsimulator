<script setup lang="ts">
import { methodCatalog } from '../../../rest-engine/methodCatalog';

const contentTypes = [
  { type: 'application/json', use: 'The overwhelming default for REST APIs today — structured, typed data.', example: '{"sku":"MUG-01","quantity":2}' },
  { type: 'application/x-www-form-urlencoded', use: 'Classic HTML form submissions — key=value pairs joined by &, percent-encoded.', example: 'sku=MUG-01&quantity=2' },
  { type: 'multipart/form-data', use: 'Needed when the body includes binary data alongside fields, e.g. a file upload.', example: '--boundary\\r\\nContent-Disposition: form-data; name="file"; filename="receipt.png"\\r\\n...' },
  { type: 'application/merge-patch+json', use: 'A JSON body for PATCH describing only the fields to change/remove.', example: '{"quantity":3}' },
];
</script>

<template>
  <section class="body-explainer" aria-labelledby="body-explainer-heading">
    <h2 id="body-explainer-heading">The request/response body</h2>
    <p class="intro">
      The <strong>body</strong> (or "payload") is the actual data being sent — as opposed to headers, which are
      metadata about that data. Whether a body is present, and what shape it takes, depends on the method and the
      <code>Content-Type</code> header.
    </p>

    <table class="body-table">
      <thead>
        <tr>
          <th>Method</th>
          <th>Request body</th>
          <th>Response body</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in methodCatalog" :key="m.method">
          <td><code>{{ m.method }}</code></td>
          <td>
            <span class="policy" :class="m.requestBody">{{ m.requestBody }}</span>
          </td>
          <td>
            <span class="policy" :class="m.responseBody">{{ m.responseBody }}</span>
          </td>
        </tr>
      </tbody>
    </table>

    <p class="note">
      "never" means sending one is meaningless or actively wrong for that method (GET, DELETE, HEAD, OPTIONS);
      "typical" means most real calls include one; "optional" means it depends on the specific endpoint.
    </p>

    <h3>Common body formats</h3>
    <div class="content-types">
      <div v-for="ct in contentTypes" :key="ct.type" class="content-type-card">
        <code class="ct-name">Content-Type: {{ ct.type }}</code>
        <p class="ct-use">{{ ct.use }}</p>
        <pre class="ct-example">{{ ct.example }}</pre>
      </div>
    </div>

    <p class="note">
      The server needs to know the body's exact byte length before it can safely read it — that's what
      <code>Content-Length</code> is for. It counts <strong>bytes</strong>, not characters: a body containing
      multi-byte UTF-8 characters (accents, emoji, non-Latin scripts) will have a Content-Length larger than its
      character count.
    </p>
  </section>
</template>

<style scoped>
.body-explainer {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.intro {
  margin: 0;
  font-size: 0.85rem;
  color: var(--muted);
}
.intro code {
  font-family: var(--font-mono);
}
.body-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.85rem;
}
.body-table th,
.body-table td {
  text-align: left;
  padding: 0.35rem 0.6rem;
  border-bottom: 1px solid var(--border);
}
.body-table code {
  font-family: var(--font-mono);
  font-weight: 600;
}
.policy {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 0.3rem;
  font-size: 0.78rem;
  border: 1px solid var(--border);
}
.policy.never {
  color: var(--muted);
}
.policy.typical {
  color: var(--green);
  border-color: var(--green);
}
.policy.optional {
  color: var(--amber);
  border-color: var(--amber);
}
.note {
  font-size: 0.8rem;
  color: var(--muted);
  margin: 0;
}
.note code {
  font-family: var(--font-mono);
}
h3 {
  margin: 0.4rem 0 0;
  font-size: 0.95rem;
}
.content-types {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
}
@media (max-width: 700px) {
  .content-types {
    grid-template-columns: 1fr;
  }
}
.content-type-card {
  background: var(--surface-2);
  border-radius: 0.5rem;
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.ct-name {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 600;
}
.ct-use {
  margin: 0;
  font-size: 0.8rem;
}
.ct-example {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.35rem;
  padding: 0.4rem 0.5rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
