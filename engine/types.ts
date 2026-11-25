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
// to); 'gateway' and 'issuer' only appear in the payment-flow scenario; 'proxy' is the
// TLS-terminating edge proxy in the mtls-s2s scenario.
export type Party = 'client' | 'proxy' | 'server' | 'gateway' | 'issuer';

// Injectable connection-level failure. 'none' runs the normal flow.
// The 'mtls-*' modes only apply when RequestConfig.mtls is on: the server rejects the
// client certificate and ends the handshake with the matching TLS alert.
export type FailureMode =
  | 'none'
  | 'refused'
  | 'tls-error'
  | 'timeout'
  | 'mtls-no-cert'      // client has no cert to send → alert certificate_required
  | 'mtls-unknown-ca'   // client cert issued by a CA the server doesn't trust → alert unknown_ca
  | 'mtls-expired';     // client cert past its notAfter date → alert certificate_expired

export function isMtlsFailureMode(mode: FailureMode | undefined): boolean {
  return mode === 'mtls-no-cert' || mode === 'mtls-unknown-ca' || mode === 'mtls-expired';
}

// Where the mTLS connection ends: on the origin app itself, or on an edge proxy that
// verifies the client cert and forwards its identity to the app in a header.
export type TlsTermination = 'origin' | 'edge-proxy';

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
  mtls?: boolean;                    // mutual TLS: server requests and verifies a client certificate (https only)
  tlsTermination?: TlsTermination;   // mtls-s2s scenario only; defaults to 'origin'
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
  partyLabels?: Partial<Record<Party, string>>; // override lifeline names, e.g. client → "Merchant server"
}
