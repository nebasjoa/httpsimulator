import { defineStore } from 'pinia';
import type { HeaderLine, RequestConfig, ServerConfig, SimEvent } from '../../engine/types';
import { getScenario, DEFAULT_SCENARIO_ID } from '../../engine/scenarios';
import { buildRequestWire } from '../../engine/wire';
import { getStatusInfo } from '../../engine/statusCatalog';

export type SimMode = 'simulated' | 'real';

function defaultRequestConfig(): RequestConfig {
  return {
    method: 'POST',
    https: true,
    host: 'pay.computop.com',
    path: '/paymentpage',
    contentType: 'application/x-www-form-urlencoded',
    body: 'MerchantID=Test&Amount=1999&Currency=EUR',
    extraHeaders: [],
    crossOrigin: false,
    conditionalRefetch: false,
  };
}

export interface WirePair {
  label: string;
  requestEvent?: SimEvent;
  responseEvent?: SimEvent;
}

const RECONSTRUCTED_NOTE =
  'Reconstructed - fetch cannot observe this. The browser deliberately hides it from JavaScript.';

export const useSimulatorStore = defineStore('simulator', {
  state: () => ({
    requestConfig: defaultRequestConfig(),
    serverConfig: { statusCode: 200, failureMode: 'none' } as ServerConfig,
    scenarioId: DEFAULT_SCENARIO_ID,
    mode: 'simulated' as SimMode,
    events: [] as SimEvent[],
    cursor: 0,
    playing: false,
    speedMultiplier: 1,
    authEnabled: false,
    realLoading: false,
    realError: null as string | null,
  }),

  getters: {
    activeEvent: (state) => state.events[state.cursor],
    isAtEnd: (state) => state.cursor >= state.events.length - 1,
    scenario: (state) => getScenario(state.scenarioId),

    // Pairs each http-request with the http-response that follows it. A scenario can
    // produce several pairs (CORS preflight, redirect-chain hops, conditional refetch) -
    // panels are only numbered when there's more than one.
    wirePairs: (state): WirePair[] => {
      const pairs: WirePair[] = [];
      let current: WirePair | null = null;
      for (const event of state.events) {
        if (event.wire?.kind === 'http-request') {
          current = { label: '', requestEvent: event };
          pairs.push(current);
        } else if (event.wire?.kind === 'http-response' && current) {
          current.responseEvent = event;
        }
      }
      if (pairs.length > 1) {
        pairs.forEach((p, i) => {
          p.label = `Exchange ${i + 1}`;
        });
      }
      return pairs;
    },
  },

  actions: {
    setScenario(id: string) {
      this.scenarioId = id;
      const scenario = getScenario(id);
      if (scenario.presetRequest) {
        this.requestConfig = { ...scenario.presetRequest };
        this.authEnabled = false;
      }
      if (scenario.presetServer) {
        this.serverConfig = { ...scenario.presetServer };
      }
      this.rebuild();
    },

    updateRequestConfig(patch: Partial<RequestConfig>) {
      this.requestConfig = { ...this.requestConfig, ...patch };
      this.rebuild();
    },

    updateServerConfig(patch: Partial<ServerConfig>) {
      this.serverConfig = { ...this.serverConfig, ...patch };
      this.rebuild();
    },

    setAuthEnabled(enabled: boolean) {
      this.authEnabled = enabled;
      const withoutAuth = (this.requestConfig.extraHeaders ?? []).filter(
        (h) => h.name.toLowerCase() !== 'authorization'
      );
      const extraHeaders: HeaderLine[] = enabled
        ? [...withoutAuth, { name: 'Authorization', value: 'Basic bWVyY2hhbnQ6c2VjcmV0' }]
        : withoutAuth;
      this.requestConfig = { ...this.requestConfig, extraHeaders };
      this.rebuild();
    },

    setMode(mode: SimMode) {
      this.mode = mode;
      this.rebuild();
    },

    setSpeed(multiplier: number) {
      this.speedMultiplier = multiplier;
    },

    rebuild() {
      this.playing = false;
      this.cursor = 0;
      if (this.mode === 'simulated') {
        this.events = this.scenario.build(this.requestConfig, this.serverConfig);
      } else {
        this.events = [];
        void this.runReal();
      }
    },

    // Real mode: actually fetch() the echo endpoint and reconstruct an approximate
    // exchange from what the browser exposes. Layers fetch cannot see are clearly
    // badged; the response is built from the real Response object.
    async runReal() {
      this.realLoading = true;
      this.realError = null;
      try {
        const req = this.requestConfig;
        const events: SimEvent[] = [];

        events.push({
          id: 'real-dns',
          phase: 'dns',
          from: 'client',
          label: 'DNS lookup',
          detail: RECONSTRUCTED_NOTE,
          observableViaFetch: false,
          durationMs: 0,
        });
        events.push({
          id: 'real-tcp',
          phase: 'tcp',
          from: 'client',
          to: 'server',
          label: 'TCP handshake',
          detail: RECONSTRUCTED_NOTE,
          observableViaFetch: false,
          durationMs: 0,
        });
        if (req.https) {
          events.push({
            id: 'real-tls',
            phase: 'tls',
            from: 'client',
            to: 'server',
            label: 'TLS handshake',
            detail: RECONSTRUCTED_NOTE,
            observableViaFetch: false,
            durationMs: 0,
          });
        }

        const requestWire = buildRequestWire(req);
        events.push({
          id: 'real-http-request',
          phase: 'http-request',
          from: 'client',
          to: 'server',
          label: `${req.method} ${req.path}`,
          detail: `${RECONSTRUCTED_NOTE} This wire view is our best guess at what was sent - the browser controls the exact header order and casing.`,
          observableViaFetch: false,
          durationMs: 0,
          wire: requestWire,
        });

        const hasBody = ['POST', 'PUT', 'PATCH'].includes(req.method) && !!req.body;
        const headers: Record<string, string> = {};
        if (hasBody && req.contentType) headers['Content-Type'] = req.contentType;
        for (const h of req.extraHeaders ?? []) headers[h.name] = h.value;

        const response = await fetch(`/api/echo?status=${this.serverConfig.statusCode}`, {
          method: req.method,
          headers,
          body: hasBody ? req.body : undefined,
          redirect: 'manual',
        });

        if (response.type === 'opaqueredirect') {
          events.push({
            id: 'real-http-response',
            phase: 'http-response',
            from: 'server',
            to: 'client',
            label: 'Opaque redirect',
            detail:
              'The server returned a 3xx redirect. With redirect: "manual", the Fetch API deliberately hides the status, Location header, and body from JavaScript - you only learn that a redirect happened. This is the browser drawing the exact abstraction boundary this app teaches.',
            observableViaFetch: false,
            durationMs: 0,
          });
        } else {
          const body = await response.text();
          const respHeaders: HeaderLine[] = [];
          response.headers.forEach((value, name) => respHeaders.push({ name, value }));

          let reason = response.statusText;
          if (!reason) {
            try {
              reason = getStatusInfo(response.status).reason;
            } catch {
              reason = '';
            }
          }
          const startLine = `HTTP/1.1 ${response.status}${reason ? ' ' + reason : ''}`;

          events.push({
            id: 'real-http-response',
            phase: 'http-response',
            from: 'server',
            to: 'client',
            label: startLine,
            detail:
              'This is the real response the browser received - status, headers, and body are all directly observable via fetch.',
            observableViaFetch: true,
            durationMs: 0,
            wire: {
              kind: 'http-response',
              startLine,
              headers: respHeaders,
              body: body || undefined,
            },
          });
        }

        events.push({
          id: 'real-connection',
          phase: 'connection',
          from: 'server',
          label: 'Connection',
          detail: RECONSTRUCTED_NOTE,
          observableViaFetch: false,
          durationMs: 0,
        });

        this.events = events;
        this.cursor = 0;
      } catch (err) {
        this.realError = err instanceof Error ? err.message : String(err);
      } finally {
        this.realLoading = false;
      }
    },

    play() {
      if (this.events.length === 0) return;
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
      this.cursor = Math.min(Math.max(next, 0), Math.max(this.events.length - 1, 0));
      if (this.isAtEnd) this.playing = false;
    },

    jumpTo(index: number) {
      this.cursor = Math.min(Math.max(index, 0), Math.max(this.events.length - 1, 0));
      this.playing = false;
    },

    reset() {
      this.cursor = 0;
      this.playing = false;
    },
  },
});
