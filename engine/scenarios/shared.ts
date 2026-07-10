import type { FailureMode, Party, RequestConfig, ServerConfig, SimEvent, WireMessage } from '../types';
import { buildRequestWire, buildResponseWire } from '../wire';

let counter = 0;
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export const CONDITIONAL_ETAG = '"33a64df551"';

// dns → SYN → [refused ⇒ stop] → SYN-ACK → ACK → [https] ClientHello → [tls-error ⇒ stop] →
// ServerHello+Certificate → KeyExchange+Finished. Parameterized by party pair so payment-flow
// can reuse it for its opening (client→server) leg with full failureMode support.
export function buildConnectionSetup(
  req: RequestConfig,
  failureMode: FailureMode = 'none',
  from: Party = 'client',
  to: Party = 'server'
): SimEvent[] {
  const events: SimEvent[] = [];

  events.push({
    id: nextId('dns'),
    phase: 'dns',
    from,
    label: 'DNS lookup',
    detail: `The client resolves "${req.host}" to an IP address before it can open a connection.`,
    observableViaFetch: false,
    durationMs: 350,
  });

  events.push({
    id: nextId('tcp'),
    phase: 'tcp',
    from,
    to,
    label: 'SYN',
    detail: 'The client opens a TCP connection by sending a SYN segment with an initial sequence number.',
    observableViaFetch: false,
    durationMs: 150,
    meta: { 'Client ISN': '1,000,000 (illustrative)' },
  });

  if (failureMode === 'refused') {
    events.push({
      id: nextId('failure'),
      phase: 'failure',
      from: to,
      to: from,
      label: 'RST (Connection refused)',
      detail: 'The server actively refused the connection - nothing is listening on this port, or a firewall rejected it. No TLS or HTTP exchange can happen.',
      observableViaFetch: false,
      durationMs: 250,
    });
    return events;
  }

  events.push({
    id: nextId('tcp'),
    phase: 'tcp',
    from: to,
    to: from,
    label: 'SYN-ACK',
    detail: 'The server acknowledges the SYN and sends its own sequence number back.',
    observableViaFetch: false,
    durationMs: 150,
    meta: { 'Server ISN': '2,000,000 (illustrative)' },
  });
  events.push({
    id: nextId('tcp'),
    phase: 'tcp',
    from,
    to,
    label: 'ACK',
    detail: 'The client acknowledges the server\'s SYN. The three-way handshake is complete - the TCP connection is open.',
    observableViaFetch: false,
    durationMs: 150,
  });

  if (req.https) {
    events.push({
      id: nextId('tls'),
      phase: 'tls',
      from,
      to,
      label: 'ClientHello',
      detail: 'The client starts the TLS handshake, proposing supported TLS versions and cipher suites.',
      observableViaFetch: false,
      durationMs: 200,
      meta: {
        'TLS versions offered': 'TLS 1.3, TLS 1.2',
        'Cipher suites offered': 'TLS_AES_128_GCM_SHA256, TLS_CHACHA20_POLY1305_SHA256',
      },
    });

    if (failureMode === 'tls-error') {
      events.push({
        id: nextId('failure'),
        phase: 'failure',
        from: to,
        to: from,
        label: 'TLS alert: handshake_failure',
        detail: 'The TLS handshake failed - e.g. the server presented an untrusted/expired certificate, or the client and server share no common cipher suite. The connection is aborted before any HTTP request is sent.',
        observableViaFetch: false,
        durationMs: 250,
      });
      return events;
    }

    events.push({
      id: nextId('tls'),
      phase: 'tls',
      from: to,
      to: from,
      label: 'ServerHello + Certificate',
      detail: 'The server picks a cipher suite and presents its certificate so the client can verify its identity.',
      observableViaFetch: false,
      durationMs: 250,
      meta: {
        'Cipher suite chosen': 'TLS_AES_128_GCM_SHA256',
        'Certificate subject': `CN=${req.host}`,
        'Certificate issuer': 'CN=DigiCert TLS RSA SHA256 2020 CA1',
        'Certificate expires': '2027-03-01',
      },
    });
    events.push({
      id: nextId('tls'),
      phase: 'tls',
      from,
      to,
      label: 'KeyExchange + Finished',
      detail: 'The client verifies the certificate, exchanges key material, and both sides derive session keys. TLS is now established - everything from here on is encrypted.',
      observableViaFetch: false,
      durationMs: 250,
    });
  }

  return events;
}

// A CORS preflight: OPTIONS with Origin/Access-Control-Request-Method, answered
// with a 204 carrying Access-Control-Allow-*. Only the real request follows if allowed.
export function buildCorsPreflight(req: RequestConfig): SimEvent[] {
  const origin = 'https://shop.example.com';
  const preflightReq: RequestConfig = {
    ...req,
    method: 'OPTIONS',
    body: undefined,
    extraHeaders: [
      { name: 'Origin', value: origin },
      { name: 'Access-Control-Request-Method', value: req.method },
    ],
  };
  const requestWire = buildRequestWire(preflightReq);
  const responseWire: WireMessage = {
    kind: 'http-response',
    startLine: 'HTTP/1.1 204 No Content',
    headers: [
      { name: 'Access-Control-Allow-Origin', value: origin },
      { name: 'Access-Control-Allow-Methods', value: `${req.method}, OPTIONS` },
      { name: 'Access-Control-Allow-Headers', value: 'Content-Type' },
    ],
  };

  return [
    {
      id: nextId('http-request'),
      phase: 'http-request',
      from: 'client',
      to: 'server',
      label: `OPTIONS ${req.path} (preflight)`,
      detail: 'Because this is a cross-origin request, the browser sends an OPTIONS preflight first, asking the server for permission before sending the real request.',
      observableViaFetch: false,
      durationMs: 300,
      wire: requestWire,
    },
    {
      id: nextId('processing'),
      phase: 'processing',
      from: 'server',
      label: 'CORS check',
      detail: 'The server decides whether to allow this origin, method, and headers.',
      observableViaFetch: false,
      durationMs: 200,
    },
    {
      id: nextId('http-response'),
      phase: 'http-response',
      from: 'server',
      to: 'client',
      label: 'HTTP/1.1 204 No Content',
      detail: 'The server grants permission via Access-Control-Allow-* headers. Only now does the browser send the real request.',
      observableViaFetch: true,
      durationMs: 300,
      wire: responseWire,
    },
  ];
}

// A second GET carrying If-None-Match, answered with 304 (no body) when the ETag still matches.
export function buildConditionalRefetch(req: RequestConfig): SimEvent[] {
  const refetchReq: RequestConfig = {
    ...req,
    extraHeaders: [...(req.extraHeaders ?? []), { name: 'If-None-Match', value: CONDITIONAL_ETAG }],
  };
  const requestWire = buildRequestWire(refetchReq);
  const responseWire = buildResponseWire({ statusCode: 304 }, refetchReq);

  return [
    {
      id: nextId('http-request'),
      phase: 'http-request',
      from: 'client',
      to: 'server',
      label: `${req.method} ${req.path} (conditional)`,
      detail: 'The client refetches the same resource, but this time sends If-None-Match with the ETag it already has cached.',
      observableViaFetch: false,
      durationMs: 350,
      wire: requestWire,
    },
    {
      id: nextId('processing'),
      phase: 'processing',
      from: 'server',
      label: 'Cache check',
      detail: 'The server compares If-None-Match against the resource\'s current ETag.',
      observableViaFetch: false,
      durationMs: 200,
    },
    {
      id: nextId('http-response'),
      phase: 'http-response',
      from: 'server',
      to: 'client',
      label: responseWire.startLine,
      detail: 'The ETag still matches, so the server replies 304 Not Modified with no body - the client\'s cached copy is still good.',
      observableViaFetch: true,
      durationMs: 300,
      wire: responseWire,
    },
  ];
}

// Full pipeline shared by simple-request and form-post: connection setup, optional CORS
// preflight, the request/response, optional conditional refetch, then keep-alive -
// short-circuiting into a terminal failure event when server.failureMode is set.
export function assembleExchange(req: RequestConfig, server: ServerConfig): SimEvent[] {
  const failureMode = server.failureMode ?? 'none';
  const events = buildConnectionSetup(req, failureMode);
  if (events[events.length - 1]?.phase === 'failure') {
    return events;
  }

  if (req.crossOrigin) {
    events.push(...buildCorsPreflight(req));
  }

  const requestWire = buildRequestWire(req);
  events.push({
    id: nextId('http-request'),
    phase: 'http-request',
    from: 'client',
    to: 'server',
    label: `${req.method} ${req.path}`,
    detail: 'The client sends the HTTP request line, headers, and (if present) body over the open connection.',
    observableViaFetch: false,
    durationMs: 400,
    wire: requestWire,
  });

  if (failureMode === 'timeout') {
    events.push({
      id: nextId('processing'),
      phase: 'processing',
      from: 'server',
      label: 'Server processing',
      detail: 'The server received the request but never sends a response.',
      observableViaFetch: false,
      durationMs: 600,
    });
    events.push({
      id: nextId('failure'),
      phase: 'failure',
      from: 'client',
      label: 'Request timed out',
      detail: 'The server never responded within the client\'s timeout window. No HTTP response is received; the client must decide whether it\'s safe to retry.',
      observableViaFetch: false,
      durationMs: 250,
    });
    return events;
  }

  events.push({
    id: nextId('processing'),
    phase: 'processing',
    from: 'server',
    label: 'Server processing',
    detail: 'The server handles the request - routing, business logic, maybe a database call - before it has a response ready.',
    observableViaFetch: false,
    durationMs: 600,
  });

  const wantsConditionalRefetch = req.method === 'GET' && !!req.conditionalRefetch && server.statusCode === 200;
  const responseWire = buildResponseWire(
    server,
    req,
    wantsConditionalRefetch ? [{ name: 'ETag', value: CONDITIONAL_ETAG }] : []
  );
  events.push({
    id: nextId('http-response'),
    phase: 'http-response',
    from: 'server',
    to: 'client',
    label: responseWire.startLine,
    detail: 'The server sends the status line, headers, and (if present) body back to the client.',
    observableViaFetch: true,
    durationMs: 400,
    wire: responseWire,
  });

  if (wantsConditionalRefetch) {
    events.push(...buildConditionalRefetch(req));
  }

  events.push({
    id: nextId('connection'),
    phase: 'connection',
    from: 'server',
    label: 'Connection: keep-alive',
    detail: 'With HTTP/1.1 keep-alive, the TCP connection stays open so a future request can reuse it without a new handshake.',
    observableViaFetch: false,
    durationMs: 200,
  });

  return events;
}
