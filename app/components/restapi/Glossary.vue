<script setup lang="ts">
import { computed, ref } from 'vue';
import { glossary } from '../../../rest-engine/glossary';

const filter = ref('');
const openTerm = ref<string | null>(null);

const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase();
  if (!q) return glossary;
  return glossary.filter((g) => g.term.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q));
});

function toggle(term: string) {
  openTerm.value = openTerm.value === term ? null : term;
}

function jumpTo(term: string) {
  filter.value = '';
  openTerm.value = term;
  requestAnimationFrame(() => {
    document.getElementById(`glossary-${term}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}
</script>

<template>
  <section class="glossary" aria-labelledby="glossary-heading">
    <h2 id="glossary-heading">Glossary</h2>
    <input
      v-model="filter"
      type="search"
      class="filter-input"
      placeholder="Filter terms…"
      aria-label="Filter glossary terms"
    />
    <dl class="term-list">
      <div v-for="g in filtered" :key="g.term" :id="`glossary-${g.term}`" class="term-row">
        <dt>
          <button type="button" class="term-toggle" :aria-expanded="openTerm === g.term" @click="toggle(g.term)">
            {{ g.term }}
          </button>
        </dt>
        <dd v-show="openTerm === g.term">
          <p>{{ g.definition }}</p>
          <p v-if="g.seeAlso?.length" class="see-also">
            See also:
            <button v-for="s in g.seeAlso" :key="s" type="button" class="see-also-link" @click="jumpTo(s)">{{ s }}</button>
          </p>
        </dd>
      </div>
    </dl>
    <p v-if="!filtered.length" class="empty">No terms match "{{ filter }}".</p>
  </section>
</template>

<style scoped>
.glossary {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.filter-input {
  font: inherit;
  padding: 0.4rem 0.6rem;
  border-radius: 0.35rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: inherit;
}
.term-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.term-row {
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.3rem;
}
.term-toggle {
  font: inherit;
  font-weight: 600;
  font-size: 0.9rem;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0.2rem 0;
  text-align: left;
}
.term-toggle:hover,
.term-toggle:focus-visible {
  color: var(--accent);
}
dd {
  margin: 0.2rem 0 0.3rem;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
dd p {
  margin: 0;
}
.see-also {
  font-size: 0.78rem;
  color: var(--muted);
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: baseline;
}
.see-also-link {
  font: inherit;
  font-size: 0.78rem;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 0.3rem;
  padding: 0.05rem 0.4rem;
  color: var(--accent);
  cursor: pointer;
}
.empty {
  color: var(--muted);
  font-size: 0.85rem;
}
</style>
