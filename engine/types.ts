export type Phase =
  | 'dns'            // name resolution
  | 'tcp'            // three-way handshake
  | 'tls'            // TLS handshake (https only)
  | 'http-request'   // client sends request
  | 'processing'     // server-side work (no packet)
  | 'http-response'  // server sends response
  | 'connection'     // keep-alive / close
  | 'failure';       // connection-level failure (refused, TLS error, timeout) - terminal

// The parties that can appear on the sequence diagram. Every scenario uses at least
// 'client' (the shopper's browser) and 'server' (the primary web server it's talking
// to); 'gateway' and 'issuer' only appear in the payment-flow scenario.
export type Party = 'client' | 'server' | 'gateway' | 'issuer';

// Injectable connection-level failure. 'none' runs the normal flow.
export type FailureMode = 'none' | 'refused' | 'tls-error' | 'timeout';

export interface HeaderLine {
  name: string;
  value: string;
  auto?: boolean;    // computed (Host, Content-Length, Content-Type) - mark visually
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
  from: Party;                       // originating party; also the "self" party for internal/self-loop events
  to?: Party;                        // destination party; omitted for internal/self-loop events (DNS lookup, processing)
  label: string;                     // short label for the sequence row, e.g. "SYN"
  detail: string;                    // 1–3 sentence explanation for the inspector
  observableViaFetch: boolean;       // false ⇒ show "reconstructed" badge in real mode
  durationMs: number;                // travel/animation time before auto-advance in play mode
  wire?: WireMessage;                // present only for http-request / http-response
  meta?: Record<string, string>;     // structured detail: TCP sequence numbers, TLS cipher/cert fields
}

export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  https: boolean;
  host: string;                      // "pay.computop.com"
  path: string;                      // "/paymentpage"
  contentType?: string;              // for bodied methods
  body?: string;
  extraHeaders?: HeaderLine[];       // user-added (e.g. Authorization)
  crossOrigin?: boolean;             // prepend a CORS preflight (OPTIONS) exchange
  conditionalRefetch?: boolean;      // append a second GET with If-None-Match (GET only)
}

export interface ServerConfig {
  statusCode: number;                // drives the response via the status catalog
  failureMode?: FailureMode;         // injectable connection-level failure
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  build(req: RequestConfig, server: ServerConfig): SimEvent[];
  presetRequest?: RequestConfig;     // applied to the store when this scenario is selected
  presetServer?: ServerConfig;       // applied to the store when this scenario is selected
}
