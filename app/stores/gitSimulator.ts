import { defineStore } from 'pinia';
import type { GitStep, RepoState } from '../../git-engine/types';
import { initialRepoState } from '../../git-engine/repo';
import { runCommand as executeCommand, runEdit as executeEdit } from '../../git-engine/commandParser';
import { getGitScenario, DEFAULT_GIT_SCENARIO_ID } from '../../git-engine/scenarios';

export const useGitSimulatorStore = defineStore('gitSimulator', {
  state: () => ({
    scenarioId: DEFAULT_GIT_SCENARIO_ID,
    history: [] as GitStep[],
    cursor: 0,
    playing: false,
    speedMultiplier: 1,
    commandInput: '',
    commandError: '',
  }),

  getters: {
    activeStep: (state) => state.history[state.cursor],
    isAtEnd: (state) => state.cursor >= state.history.length - 1,
    scenario: (state) => getGitScenario(state.scenarioId),
    // The repo snapshot to render in the diagrams - the result of the step at the cursor.
    repoState: (state): RepoState => state.history[state.cursor]?.stateAfter ?? initialRepoState(),
  },

  actions: {
    loadScenario(id: string) {
      this.scenarioId = id;
      this.history = this.scenario.build();
      this.cursor = 0;
      this.playing = false;
      this.commandError = '';
    },

    newBlankRepo() {
      this.history = [];
      this.cursor = 0;
      this.playing = false;
      this.commandError = '';
    },

    // Free-play: runs one command on top of whatever is at the current cursor, discarding
    // any steps after it (so scrubbing back and then typing something new behaves like a
    // normal undo-then-branch, not a silent append to a future you've moved away from).
    runCommand(input: string) {
      const trimmed = input.trim();
      if (!trimmed) return;
      const base = this.history[this.cursor]?.stateAfter ?? initialRepoState();
      this.history = this.history.slice(0, this.cursor + 1);
      const step = executeCommand(base, trimmed, this.history.length);
      this.history.push(step);
      this.cursor = this.history.length - 1;
      this.commandInput = '';
      this.commandError = step.error ? step.detail : '';
    },

    editFile(content: string, note?: string) {
      const base = this.history[this.cursor]?.stateAfter ?? initialRepoState();
      if (content === base.workingDir.content) return;
      this.history = this.history.slice(0, this.cursor + 1);
      const step = executeEdit(base, content, note, this.history.length);
      this.history.push(step);
      this.cursor = this.history.length - 1;
    },

    setSpeed(multiplier: number) {
      this.speedMultiplier = multiplier;
    },

    play() {
      if (this.history.length === 0) return;
      if (this.isAtEnd) this.cursor = 0;
      this.playing = true;
    },

    pause() {
      this.playing = false;
    },

    togglePlay() {
      if (this.playing) this.pause();
      else this.play();
    },

    step(delta: number) {
      const next = this.cursor + delta;
      this.cursor = Math.min(Math.max(next, 0), Math.max(this.history.length - 1, 0));
      if (this.isAtEnd) this.playing = false;
    },

    jumpTo(index: number) {
      this.cursor = Math.min(Math.max(index, 0), Math.max(this.history.length - 1, 0));
      this.playing = false;
    },

    reset() {
      this.cursor = 0;
      this.playing = false;
    },
  },
});
