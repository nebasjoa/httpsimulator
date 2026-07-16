<script setup lang="ts">
import MethodExplorer from '../components/restapi/MethodExplorer.vue';
import RequestAnatomy from '../components/restapi/RequestAnatomy.vue';
import AuthExplainer from '../components/restapi/AuthExplainer.vue';
import BodyExplainer from '../components/restapi/BodyExplainer.vue';
import BestPractices from '../components/restapi/BestPractices.vue';
import Glossary from '../components/restapi/Glossary.vue';
</script>

<template>
  <div class="rest-api-page">
    <p class="page-intro">
      A REST API lets clients act on server-side resources using a small, standard set of HTTP methods. Explore what
      each method really does, how authorization and query parameters work, and the practices that separate a
      well-designed API from a confusing one.
    </p>

    <section class="panel">
      <MethodExplorer />
    </section>

    <div class="two-col">
      <section class="panel">
        <RequestAnatomy />
      </section>
      <section class="panel">
        <AuthExplainer />
      </section>
    </div>

    <section class="panel">
      <BodyExplainer />
    </section>

    <section class="panel">
      <BestPractices />
    </section>

    <section class="panel">
      <Glossary />
    </section>
  </div>
</template>

<style scoped>
.rest-api-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.page-intro {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
  max-width: 70ch;
}
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: start;
}
@media (max-width: 900px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  padding: 1rem;
}
</style>
