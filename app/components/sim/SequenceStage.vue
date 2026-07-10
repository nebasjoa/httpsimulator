<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import gsap from 'gsap';
import { useSimulatorStore } from '../../stores/simulator';
import type { Party, SimEvent } from '../../../engine/types';
import TransportControls from './TransportControls.vue';
import Timeline from './Timeline.vue';

const store = useSimulatorStore();
const packetEls = ref<Record<number, HTMLElement>>({});

const PARTY_ORDER: Party[] = ['client', 'server', 'gateway', 'issuer'];
const PARTY_LABELS: Record<Party, string> = {
  client: 'Client',
  server: 'Server',
  gateway: 'Gateway',
  issuer: 'Issuer',
};

// Only draw a lifeline for parties this scenario actually uses, in a stable canonical order.
const visibleParties = computed<Party[]>(() => {
  const used = new Set<Party>();
  for (const event of store.events) {
    used.add(event.from);
    if (event.to) used.add(event.to);
  }
  return PARTY_ORDER.filter((p) => used.has(p));
});

function partyPosition(party: Party): number {
  const parties = visibleParties.value;
  const index = parties.indexOf(party);
  if (index < 0) return 50;
  if (parties.length <= 1) return 50;
  return (index / (parties.length - 1)) * 100;
}

function eventColor(event: SimEvent, party: Party): string {
  if (event.phase === 'failure') return 'var(--red)';
  return `var(--${party}-color)`;
}

function setPacketRef(el: Element | null, index: number) {
  if (el instanceof HTMLElement) {
    packetEls.value[index] = el;
  } else {
    delete packetEls.value[index];
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

watch(
  () => store.cursor,
  async () => {
    await nextTick();
    const event = store.activeEvent;
    const el = packetEls.value[store.cursor];
    if (!event || !el || !event.to) return;

    const from = partyPosition(event.from);
    const to = partyPosition(event.to);
    const reduced = prefersReducedMotion();
    const seconds = Math.max(event.durationMs / 1000, 0.05);

    gsap.killTweensOf(el);
    if (reduced) {
      gsap.set(el, { left: `${to}%` });
    } else {
      gsap.fromTo(el, { left: `${from}%` }, { left: `${to}%`, duration: seconds, ease: 'power1.inOut' });
    }
  },
  { immediate: true }
);
</script>

<template>
  <section class="sequence-stage" aria-labelledby="sequence-stage-heading">
    <h2 id="sequence-stage-heading">Sequence</h2>

    <TransportControls />
    <Timeline />

    <div class="lifeline-labels">
      <span
        v-for="party in visibleParties"
        :key="party"
        class="lifeline-label"
        :style="{ left: partyPosition(party) + '%', color: `var(--${party}-color)` }"
      >{{ PARTY_LABELS[party] }}</span>
    </div>

    <div class="event-rows-wrap">
      <div
        v-for="party in visibleParties"
        :key="party"
        class="rail"
        :style="{ left: partyPosition(party) + '%', background: `var(--${party}-color)` }"
      />

      <ol class="event-rows">
        <li
          v-for="(event, index) in store.events"
          :key="event.id"
          class="event-row"
          :class="[event.phase, { active: index === store.cursor, past: index < store.cursor, future: index > store.cursor }]"
        >
          <template v-if="!event.to">
            <span
              class="self-loop-badge"
              :style="{ left: partyPosition(event.from) + '%', color: eventColor(event, event.from), borderColor: eventColor(event, event.from) }"
            >{{ event.label }}</span>
          </template>
          <template v-else>
            <span
              class="arrow-line"
              :class="partyPosition(event.to) >= partyPosition(event.from) ? 'points-right' : 'points-left'"
              :style="{
                left: Math.min(partyPosition(event.from), partyPosition(event.to)) + '%',
                width: Math.abs(partyPosition(event.to) - partyPosition(event.from)) + '%',
                background: eventColor(event, event.from),
                '--arrow-color': eventColor(event, event.from),
              }"
              aria-hidden="true"
            />
            <span
              class="event-label"
              :style="{ left: (partyPosition(event.from) + partyPosition(event.to)) / 2 + '%' }"
            >{{ event.label }}</span>
            <span
              v-if="index === store.cursor"
              class="packet"
              :style="{ background: eventColor(event, event.from) }"
              :ref="(el) => setPacketRef(el as Element | null, index)"
            />
          </template>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.sequence-stage {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.lifeline-labels {
  position: relative;
  height: 1.4rem;
  font-weight: 600;
  font-size: 0.85rem;
}
.lifeline-label {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  white-space: nowrap;
}
.event-rows-wrap {
  position: relative;
}
.rail {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
}
.event-rows {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.event-row {
  position: relative;
  min-height: 2.2rem;
  opacity: 0.9;
  transition: opacity 0.2s ease;
}
.event-row.past {
  opacity: 0.35;
}
.event-row.future {
  opacity: 0.3;
}
.event-row.active {
  opacity: 1;
}
.arrow-line {
  position: absolute;
  top: 50%;
  height: 2px;
  transform: translateY(-50%);
}
.arrow-line.points-right::after,
.arrow-line.points-left::after {
  content: '';
  position: absolute;
  top: -3px;
  width: 0;
  height: 0;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
}
.arrow-line.points-right::after {
  right: 0;
  border-left: 6px solid var(--arrow-color, var(--border));
}
.arrow-line.points-left::after {
  left: 0;
  border-right: 6px solid var(--arrow-color, var(--border));
}
.event-label {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  background: var(--surface);
  padding: 0 0.4rem;
  font-size: 0.75rem;
  white-space: nowrap;
  z-index: 1;
}
.self-loop-badge {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  background: var(--surface);
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 0.3rem;
  border: 1px dashed var(--border);
  white-space: nowrap;
  z-index: 1;
}
.event-row.failure .event-label {
  color: var(--red);
  font-weight: 600;
}
.packet {
  position: absolute;
  top: 50%;
  left: 0%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
}
@media (prefers-reduced-motion: reduce) {
  .event-row {
    transition: none;
  }
}
</style>
