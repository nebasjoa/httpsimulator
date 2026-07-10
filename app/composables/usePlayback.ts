import { onScopeDispose, watch } from 'vue';
import { useSimulatorStore } from '../stores/simulator';

// Ties store.playing to a timer that advances the cursor using each event's
// durationMs / speedMultiplier, stopping automatically at the end of the run.
export function usePlayback() {
  const store = useSimulatorStore();
  let timer: ReturnType<typeof setTimeout> | undefined;

  function clear() {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  function scheduleNext() {
    clear();
    const event = store.events[store.cursor];
    if (!event) return;
    const delay = Math.max(50, event.durationMs / store.speedMultiplier);
    timer = setTimeout(() => {
      if (!store.playing) return;
      if (store.isAtEnd) {
        store.pause();
        return;
      }
      store.step(1);
    }, delay);
  }

  watch(
    () => [store.playing, store.cursor, store.speedMultiplier] as const,
    ([playing]) => {
      clear();
      if (playing) scheduleNext();
    },
    { immediate: true }
  );

  onScopeDispose(clear);
}
