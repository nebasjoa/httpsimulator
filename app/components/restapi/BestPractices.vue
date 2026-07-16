<script setup lang="ts">
import { bestPractices } from '../../../rest-engine/bestPractices';
</script>

<template>
  <section class="best-practices" aria-labelledby="best-practices-heading">
    <h2 id="best-practices-heading">Good practices</h2>
    <div class="practice-list">
      <article v-for="p in bestPractices" :key="p.title" class="practice-card">
        <h3>{{ p.title }}</h3>
        <p class="description">{{ p.description }}</p>
        <div class="examples">
          <div class="example good">
            <span class="tag">Good</span>
            <code>{{ p.good }}</code>
          </div>
          <div class="example bad">
            <span class="tag">Avoid</span>
            <code>{{ p.bad }}</code>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.best-practices {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.practice-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}
@media (max-width: 900px) {
  .practice-list {
    grid-template-columns: 1fr;
  }
}
.practice-card {
  background: var(--surface-2);
  border-radius: 0.5rem;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.practice-card h3 {
  margin: 0;
  font-size: 0.9rem;
}
.description {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
}
.examples {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.example {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  font-size: 0.78rem;
  background: var(--surface);
  border-radius: 0.35rem;
  padding: 0.35rem 0.5rem;
  border-left: 3px solid var(--border);
}
.example code {
  font-family: var(--font-mono);
  overflow-wrap: anywhere;
}
.example.good {
  border-left-color: var(--green);
}
.example.bad {
  border-left-color: var(--red);
}
.tag {
  font-size: 0.65rem;
  text-transform: uppercase;
  font-weight: 700;
  flex-shrink: 0;
}
.example.good .tag {
  color: var(--green);
}
.example.bad .tag {
  color: var(--red);
}
</style>
