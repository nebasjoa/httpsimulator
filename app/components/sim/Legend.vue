<script setup lang="ts">
import { statusClassColor, type StatusClass } from '../../../engine/statusCatalog';

const classes: StatusClass[] = ['1xx', '2xx', '3xx', '4xx', '5xx'];
</script>

<template>
  <div class="legend" aria-label="Legend">
    <span class="legend-item"><span class="swatch client" /> Client</span>
    <span class="legend-item"><span class="swatch server" /> Server</span>
    <span class="legend-item"><span class="swatch gateway" /> Gateway</span>
    <span class="legend-item"><span class="swatch issuer" /> Issuer</span>
    <span v-for="c in classes" :key="c" class="legend-item">
      <span class="swatch" :style="{ background: statusClassColor(c) }" /> {{ c }}
    </span>
  </div>
</template>

<style scoped>
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: var(--muted);
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.swatch {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  display: inline-block;
}
.swatch.client {
  background: var(--client-color);
}
.swatch.server {
  background: var(--server-color);
}
.swatch.gateway {
  background: var(--gateway-color);
}
.swatch.issuer {
  background: var(--issuer-color);
}
</style>
