import { onScopeDispose, watch } from 'vue';

interface PlaybackStore {
  cursor: number;
  playing: boolean;
  speedMultiplier: number;
  isAtEnd: boolean;
  step(delta: number): void;
  pause(): void;
}

// Ties store.playing to a timer that advances the cursor using the active item's
// durationMs / speedMultiplier, stopping automatically at the end of the run. Shared by
// both simulators - `getActive` tells it where to find "the current item" since the HTTP
// store calls its list `events` and the git store calls its list `history`.
export function usePlayback<T extends PlaybackStore>(store: T, getActive: (store: T) => { durationMs: number } | undefined) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  function clear() {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  function scheduleNext() {
    clear();
    const active = getActive(store);
    if (!active) return;
    const delay = Math.max(50, active.durationMs / store.speedMultiplier);
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
