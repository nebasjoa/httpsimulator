# CLAUDE.md — HTTP Simulator

A visual, interactive web app for learning how HTTP works **at the wire level** — from DNS and the TCP/TLS handshake up to the raw request/response bytes and full status-code semantics. Built to make the abstraction that `fetch`, browsers, and frameworks normally hide visible and steppable.

**Why this exists:** the developer works on a payment gateway (Computop KVP API) where merchants POST to `.aspx` endpoints and shoppers get redirected to payment pages. That is all HTTP, but every tool in the stack hides the wire. This app pulls it back apart.

---

## Golden rules for working in this repo

1. **The protocol engine is framework-agnostic TypeScript.** It never imports Vue, Pinia, or GSAP. It takes config in, returns a timed list of events out. Keep it pure and unit-testable.
2. **The UI only plays back events.** Components render and animate the event list; they contain no protocol logic.
3. **Scenarios are data producers, not renderers.** A scenario is a function `(input) => SimEvent[]`. Adding a new flow = adding a new function.
4. **Be honest about the abstraction boundary.** In *real mode* the browser hides the request line, TLS, and the connection. Any layer that `fetch` cannot observe must be visibly labelled as **reconstructed / not observable**, never faked as if it were real.
5. **CRLF is a first-class citizen.** The wire view always renders line endings as a visible glyph and shows the empty line that separates headers from body. This is the single most important teaching detail.
6. **Prefer clarity over cleverness.** This is a teaching tool; annotations and explanations are part of the deliverable, not an afterthought.

---

## Tech stack

- **Nuxt 3** (SPA is fine for MVP; SSR not required). Vue 3 `<script setup>`, TypeScript **strict**.
- **Pinia** — playback + config state.
- **GSAP** — the packet-travel animation on the sequence diagram. Respect `prefers-reduced-motion`.
- **Nitro** (`server/api/`) — the real-mode echo endpoint.
- **Playwright** — E2E tests (already the developer's preferred setup).
- **No database for MVP.** Prisma/MariaDB only if we later persist user-authored scenarios — out of scope until Phase 3.

Package manager: **npm** (this repo ships a `package-lock.json`). Commands:

```bash
npm run dev        # Nuxt dev server
npm test           # Playwright E2E
npm run typecheck  # nuxt typecheck
npm run build
```

---

## Architecture

```
Config (request + server response) ──► Scenario.build() ──► SimEvent[] (timed)
                                                                   │
                                              Pinia store (playback: cursor, playing, speed)
                                                                   │
                     ┌─────────────────────────────┬──────────────┴───────────────┐
                     ▼                             ▼                                ▼
             SequenceStage.vue            WireInspector.vue                 TransportControls.vue
             (GSAP packet travel)         (raw bytes + annotations)         (step / play / speed)
```

The engine emits an ordered list of `SimEvent`s. The store holds a **cursor** into that list. Advancing the cursor is the entire runtime: the stage animates the active event, the inspector shows the relevant wire message, the timeline highlights position.

---

## Core data model — `engine/types.ts`

```ts
export type Phase =
  | 'dns'            // name resolution
  | 'tcp'            // three-way handshake
  | 'tls'            // TLS handshake (https only)
  | 'http-request'   // client sends request
  | 'processing'     // server-side work (no packet)
  | 'http-response'  // server sends response
  | 'connection';    // keep-alive / close

export type Actor = 'client' | 'server';
export type Direction = 'c2s' | 's2c' | 'internal';

export interface HeaderLine {
  name: string;
  value: string;
  auto?: boolean;    // computed (Host, Content-Length, Content-Type) — mark visually
}

export interface WireMessage {
  kind: 'http-request' | 'http-response';
  startLine: string;                 // "POST /paymentpage HTTP/1.1" | "HTTP/1.1 302 Found"
  headers: HeaderLine[];
  body?: string;                     // omitted for empty bodies (204/304/HEAD)
}

export interface SimEvent {
  id: string;
  phase: Phase;
  actor: Actor;
  direction: Direction;
  label: string;                     // short label for the sequence row, e.g. "SYN"
  detail: string;                    // 1–3 sentence explanation for the inspector
  observableViaFetch: boolean;       // false ⇒ show "reconstructed" badge in real mode
  durationMs: number;                // travel/animation time before auto-advance in play mode
  wire?: WireMessage;                // present only for http-request / http-response
}

export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  https: boolean;
  host: string;                      // "pay.computop.com"
  path: string;                      // "/paymentpage"
  contentType?: string;              // for bodied methods
  body?: string;
  extraHeaders?: HeaderLine[];       // user-added (e.g. Authorization)
}

export interface ServerConfig {
  statusCode: number;                // drives the response via the status catalog
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  build(req: RequestConfig, server: ServerConfig): SimEvent[];
}
```

### Wire assembly rules — `engine/wire.ts`

- Join lines with **`\r\n`**. Render each `\r\n` in the UI as a dim glyph (use `␍␊` or `⏎`). The blank line before the body is `\r\n\r\n` — make it unmistakable.
- **`Content-Length` is byte length**, not character count: `new TextEncoder().encode(body).length`. Teach this — it trips people up with UTF-8.
- Auto headers on a request: `Host` (from `host`), `Content-Type` + `Content-Length` (only when a body is present). Mark them `auto: true`.
- Bodyless responses (`204`, `304`, `HEAD`) must not emit a body and should still show the terminating blank line.

---

## Scenarios — `engine/scenarios/`

Each file exports one `Scenario`. `index.ts` registers them. MVP ships the first one; the rest are stubs to fill in later.

| id | title | notes |
|----|-------|-------|
| `simple-request` | Single request / response | **MVP.** Full connection story (DNS → TCP → TLS → request → response) for one exchange with a selectable status code. |
| `form-post` | Form POST (`x-www-form-urlencoded`) | The merchant's `.aspx` POST shape. |
| `redirect-chain` | Redirect chain | Show 301/302/303 vs 307/308 method-preservation differences across hops. |
| `payment-flow` | Computop end-to-end | Phase 3 — see below. |

**MVP `simple-request` must emit, in order:** `dns` → `tcp`(SYN) → `tcp`(SYN-ACK) → `tcp`(ACK) → *(if https)* `tls`(ClientHello) → `tls`(ServerHello+Certificate) → `tls`(KeyExchange+Finished) → `http-request` → `processing` → `http-response` → `connection`(keep-alive). Mark `dns`, `tcp`, `tls` events `observableViaFetch: false`.

---

## Status-code catalog — `engine/statusCatalog.ts`

Drives the server response and powers a **Status Explorer** panel. This is a core learning surface — treat it as real content, not filler.

```ts
export interface StatusInfo {
  code: number;
  reason: string;                    // "Not Modified"
  class: '1xx' | '2xx' | '3xx' | '4xx' | '5xx';
  responseHeaders: HeaderLine[];     // scenario-appropriate headers this status carries
  body?: string;
  summary: string;                   // what it means, plainly
  paymentsExample: string;           // when it fires in a KVP / gateway context
  clientAction: string;              // how a well-behaved client should react
}
```

**Fully-worked exemplars** (implement these exactly; they cover the subtle ones):

```ts
{ code: 302, reason: 'Found', class: '3xx',
  responseHeaders: [{ name: 'Location', value: 'https://pay.computop.com/paymentpage?id=abc' }],
  summary: 'Temporary redirect. Historically clients change the method to GET on the follow-up.',
  paymentsExample: 'Merchant server redirects the shopper’s browser to the hosted payment page.',
  clientAction: 'Follow Location with GET. Do not resubmit the body.' },

{ code: 307, reason: 'Temporary Redirect', class: '3xx',
  responseHeaders: [{ name: 'Location', value: 'https://pay.computop.com/retry' }],
  summary: 'Temporary redirect that PRESERVES method and body (unlike 302/303).',
  paymentsExample: 'Redirecting an in-flight POST without turning it into a GET.',
  clientAction: 'Re-issue the SAME method + body to Location.' },

{ code: 401, reason: 'Unauthorized', class: '4xx',
  responseHeaders: [{ name: 'WWW-Authenticate', value: 'Basic realm="KVP"' }],
  summary: 'Authentication required or failed. Note the challenge header.',
  paymentsExample: 'Merchant called the API with missing/invalid credentials.',
  clientAction: 'Read WWW-Authenticate, then retry with an Authorization header.' },

{ code: 409, reason: 'Conflict', class: '4xx',
  responseHeaders: [],
  summary: 'Request conflicts with current state — classic idempotency collision.',
  paymentsExample: 'Same idempotency key / TransID replayed for a payment already created.',
  clientAction: 'Do NOT blindly retry; reconcile against the existing resource.' },

{ code: 405, reason: 'Method Not Allowed', class: '4xx',
  responseHeaders: [{ name: 'Allow', value: 'GET, POST' }],
  summary: 'The method is not supported on this resource. Allow lists what is.',
  paymentsExample: 'A GET sent to an endpoint that only accepts POST.',
  clientAction: 'Switch to a method listed in Allow.' },

{ code: 429, reason: 'Too Many Requests', class: '4xx',
  responseHeaders: [{ name: 'Retry-After', value: '30' }],
  summary: 'Rate limited. Retry-After says how long to wait.',
  paymentsExample: 'Merchant is polling notification status too aggressively.',
  clientAction: 'Back off for Retry-After seconds, then retry with jitter.' },
```

**Implement the full set** following the same pattern. Include (with the noted teaching angle where relevant):

- **1xx:** 100 Continue (`Expect: 100-continue` flow), 101 Switching Protocols (upgrade to WebSocket).
- **2xx:** 200 OK, 201 Created (`Location` of the new resource), 202 Accepted (async notification pattern), 204 No Content (no body), 206 Partial Content.
- **3xx:** 301, 302, 303 See Other (POST→GET after processing), 304 Not Modified (conditional GET, `ETag`, no body), 307, 308.
- **4xx:** 400, **402 Payment Required** (rare but on-theme), 403, 404, 406, 408 Request Timeout, 410 Gone, 411 Length Required, 413 Payload Too Large, 415 Unsupported Media Type, 422 Unprocessable Entity, plus the exemplars above.
- **5xx:** 500, 501, 502 Bad Gateway (upstream acquirer/issuer failure), 503 Service Unavailable (`Retry-After`, maintenance window), 504 Gateway Timeout (upstream slow), 505 HTTP Version Not Supported.

Colour-code by class in the UI: 1xx grey, 2xx green, 3xx blue, 4xx amber, 5xx red. This encoding is functional — keep it consistent everywhere codes appear.

---

## Header catalog — `engine/headerCatalog.ts`

Powers **click-a-header-to-learn** in the wire inspector.

```ts
export interface HeaderInfo { name: string; summary: string; example: string; context?: string }
```

Cover at least: `Host`, `Content-Type`, `Content-Length`, `Authorization`, `User-Agent`, `Accept`, `Connection`, `Location`, `Set-Cookie`, `Cookie`, `Cache-Control`, `ETag`, `If-None-Match`, `WWW-Authenticate`, `Retry-After`, `Allow`, `Server`, `Date`, `Access-Control-Allow-Origin`, `Access-Control-Request-Method`. Keep `context` payments-relevant where it applies (e.g. `Set-Cookie` → session on the hosted payment page; CORS headers → merchant calling cross-origin).

---

## Simulated vs Real (hybrid) mode

A toggle switches the data source; **the UI is identical either way.**

- **Simulated (default, best for low-level):** the engine produces every layer including DNS/TCP/TLS. Fully deterministic, every status injectable.
- **Real:** the front end `fetch`es the Nitro echo endpoint and reconstructs an *approximate* exchange from what the browser exposes.

**Critical honesty rule:** `fetch` cannot observe the request line, exact request header ordering/casing, TLS, or the TCP connection. In real mode, render those layers with a **`reconstructed`** badge (driven by `observableViaFetch: false`) and a note explaining that the browser deliberately hides them — that boundary is itself a key lesson.

### Nitro echo endpoint — `server/api/echo.ts`

```ts
// GET/POST /api/echo?status=302
// Returns the requested status, echoes what the server actually received,
// and attaches scenario-appropriate headers pulled from the status catalog.
export default defineEventHandler(async (event) => {
  const status = Number(getQuery(event).status ?? 200);
  const received = {
    method: getMethod(event),
    path: event.path,
    headers: getRequestHeaders(event),
    body: ['POST', 'PUT', 'PATCH'].includes(getMethod(event))
      ? await readRawBody(event)
      : undefined,
  };
  setResponseStatus(event, status);
  // Apply catalog headers for `status` (Location, Retry-After, WWW-Authenticate, ...)
  return { status, received };
});
```

The client compares `received` against what it *sent* — a good demo of how proxies/frameworks can mutate headers in transit.

---

## UI layout & components — `components/sim/`

Four zones, responsive (stacks vertically under ~900px):

```
┌───────────────────────────────────────────────────────────────┐
│ Header: title · mode toggle (Simulated/Real) · legend           │
├───────────────┬───────────────────────────────┬───────────────┤
│ RequestBuilder│        SequenceStage          │ WireInspector │
│ ServerConfig  │   (client │ wire │ server,     │ raw bytes +   │
│ ScenarioPick  │    GSAP packet travels the     │ CRLF glyphs + │
│               │    active row)                 │ click-to-     │
│               │                                │ explain       │
├───────────────┴───────────────────────────────┴───────────────┤
│ TransportControls: ⟲ reset · ◀ step · ▶/⏸ play · step ▶ · speed │
│ Timeline: clickable event markers, current highlighted          │
└───────────────────────────────────────────────────────────────┘
```

- **RequestBuilder.vue** — method, https toggle, host, path, Content-Type, body; an Authorization toggle that injects a `Basic` header. Auto headers shown read-only and marked `auto`.
- **ServerConfig.vue** — status-code picker (grouped by class, colour-coded).
- **SequenceStage.vue** — two lifelines (`client` left, `server` right) with a wire between. Each event is a row with a directional arrow; the active event gets a GSAP-driven packet travelling `c2s`/`s2c`. `processing` shows a self-loop on the server. Past events dim, future events faint.
- **WireInspector.vue** — the raw request and response as monospace text with visible CRLF and the blank-line separator. Clicking a header line opens its `HeaderInfo`; clicking the status line opens its `StatusInfo`.
- **TransportControls.vue** + **Timeline** — drive the store cursor.
- **StatusExplorer.vue** — browse the full catalog independent of a run.
- **Legend.vue** — actor colours + status-class colours.

### Playback / animation rules

- Store: `{ events, cursor, playing, speedMultiplier }`. Play = advance `cursor` on a timer using each event's `durationMs / speedMultiplier`; stop at the end.
- GSAP animates only the active directional packet. On `prefers-reduced-motion: reduce`, skip travel and snap the packet to its destination.
- Keyboard: `←/→` step, `Space` play/pause. Visible focus rings. Timeline markers are real buttons.

---

## File structure

```
components/sim/{RequestBuilder,ServerConfig,ScenarioPicker,SequenceStage,
                WireInspector,TransportControls,Timeline,StatusExplorer,Legend}.vue
composables/usePlayback.ts
stores/simulator.ts
engine/{types,wire,statusCatalog,headerCatalog}.ts
engine/scenarios/{simpleRequest,formPost,redirectChain,paymentFlow,index}.ts
server/api/echo.ts
pages/index.vue
tests/*.spec.ts
```

---

## MVP — acceptance checklist

- [ ] `engine/types.ts` + `engine/wire.ts` with correct `\r\n`, byte-accurate `Content-Length`, visible blank line.
- [ ] `simple-request` scenario emits the full ordered event list (DNS → TCP → TLS → request → processing → response → keep-alive).
- [ ] Status catalog seeded with **all** listed codes; the six exemplars implemented exactly.
- [ ] Header catalog covers the listed headers.
- [ ] RequestBuilder drives a live raw-request preview that updates as you type.
- [ ] ServerConfig status picker changes the response wire + explanation.
- [ ] SequenceStage animates the active packet (GSAP), reduced-motion respected.
- [ ] WireInspector shows both messages with CRLF glyphs; clicking a header/status line explains it.
- [ ] TransportControls + Timeline: step, play/pause, speed, reset, click-to-jump.
- [ ] Real-mode toggle hits `/api/echo`; non-observable layers show the `reconstructed` badge.
- [ ] Playwright: a test that steps through `simple-request` and asserts the response wire for a chosen status.
- [ ] Responsive to mobile; keyboard controls work; visible focus.

---

## Later phases

**Phase 2** — TCP/TLS handshake detail (sequence numbers, cipher suite, cert view); `form-post` and `redirect-chain` scenarios; cookies/session, conditional-GET caching (`ETag`/`304`), CORS preflight (`OPTIONS` + `Access-Control-*`); connection-level failures (refused, TLS error, timeout) as injectable events.

**Phase 3 — `payment-flow` scenario (the Computop end-to-end):**

1. Merchant server → **S2S POST** creates a payment; response returns the payment-page URL.
2. Merchant **302** redirects the shopper's browser to the hosted `.aspx` page.
3. Browser **GET**s the payment page (HTML form).
4. Shopper submits card data → **POST** (`application/x-www-form-urlencoded`).
5. **3DS**: gateway redirects the browser to the issuer ACS and back.
6. Gateway **302**s the browser to the merchant success/fail URL.
7. Separately, gateway → merchant **server-to-server notification** (webhook POST); merchant acks **200**.

This one scenario demonstrates S2S vs browser-mediated HTTP, redirects, form encoding, why HTTPS is mandatory, idempotency, and the async-notification pattern — all in the developer's own domain.

Also Phase 3: HTTP/1.1 vs HTTP/2 framing/multiplexing comparison; optional TresJS 3D view; optional Prisma/MariaDB persistence for user-authored scenarios.

---

## Conventions

- TypeScript strict; no `any` in the engine. Engine is pure — no framework imports, no side effects.
- Vue: `<script setup lang="ts">`, composables for shared logic, Pinia for cross-component state.
- Keep explanations (`detail`, `summary`, `paymentsExample`, `clientAction`) accurate and concise — they are product surface, not comments.
- Every new scenario ships with a Playwright test asserting its event sequence and key wire output.