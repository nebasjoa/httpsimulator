import type { FailureMode, Party, RequestConfig, ServerConfig, SimEvent, WireMessage } from '../types';
import { isMtlsFailureMode } from '../types';
import { buildRequestWire, buildResponseWire } from '../wire';

let counter = 0;
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export const CONDITIONAL_ETAG = '"33a64df551"';

// dns → SYN → [refused ⇒ stop] → SYN-ACK → ACK → [https] ClientHello → [tls-error ⇒ stop] →
// ServerHello+Certificate → KeyExchange+Finished. With req.mtls the TLS part is replaced by
// the TLS 1.3 mutual-auth handshake from buildMtlsHandshake. Parameterized by party pair so payment-flow
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

  if (req.https && req.mtls) {
    events.push(...buildMtlsHandshake(req, failureMode, from, to));
    return events;
  }

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

export const CLIENT_CA = 'CN=Computop Client CA G2, O=Computop';
export const CLIENT_CERT_SUBJECT = 'CN=merchant-284500, O=Example Shop GmbH';

// The TLS 1.3 handshake with client authentication (RFC 8446 §4.3.2 / §4.4.2). Everything
// after ServerHello is encrypted with handshake keys, shown in {braces} like the RFC does.
// The mtls-* failure modes end it with the TLS alert a real server would send.
export function buildMtlsHandshake(
  req: RequestConfig,
  failureMode: FailureMode,
  from: Party,
  to: Party
): SimEvent[] {
  const events: SimEvent[] = [];

  events.push({
    id: nextId('tls'),
    phase: 'tls',
    from,
    to,
    label: 'ClientHello',
    detail: 'The client starts the TLS handshake: supported versions, cipher suites, and a key share so keys can be agreed in a single round trip. Nothing here says who the client is yet.',
    observableViaFetch: false,
    durationMs: 200,
    meta: {
      'TLS versions offered': 'TLS 1.3',
      'Cipher suites offered': 'TLS_AES_128_GCM_SHA256, TLS_CHACHA20_POLY1305_SHA256',
      'Key share': 'x25519',
      'SNI': req.host,
    },
  });

  if (failureMode === 'tls-error') {
    events.push({
      id: nextId('failure'),
      phase: 'failure',
      from: to,
      to: from,
      label: 'TLS alert: handshake_failure',
      detail: 'The TLS handshake failed before client authentication even started - e.g. client and server share no cipher suite. The connection is aborted before any HTTP request is sent.',
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
    label: 'ServerHello',
    detail: 'The server picks the cipher suite and sends its own key share. Both sides now derive handshake keys, so every handshake message after this one is encrypted - including both certificates.',
    observableViaFetch: false,
    durationMs: 200,
    meta: {
      'Version chosen': 'TLS 1.3',
      'Cipher suite chosen': 'TLS_AES_128_GCM_SHA256',
      'Key share': 'x25519',
    },
  });

  events.push({
    id: nextId('tls'),
    phase: 'tls',
    from: to,
    to: from,
    label: '{EncryptedExtensions, CertificateRequest}',
    detail: 'This is what makes it mutual TLS: the server sends CertificateRequest, asking the client to prove who it is. It lists the signature algorithms it accepts and the CAs it trusts, so the client can pick a matching certificate.',
    observableViaFetch: false,
    durationMs: 250,
    meta: {
      'Acceptable CAs': CLIENT_CA,
      'Signature algorithms': 'ecdsa_secp256r1_sha256, rsa_pss_rsae_sha256',
    },
  });

  events.push({
    id: nextId('tls'),
    phase: 'tls',
    from: to,
    to: from,
    label: '{Certificate, CertificateVerify, Finished}',
    detail: 'The server authenticates itself exactly as in normal TLS: its certificate, a signature over the handshake so far made with its private key, and a Finished MAC. The client checks the chain and that the certificate name matches the host it asked for.',
    observableViaFetch: false,
    durationMs: 250,
    meta: {
      'Server cert subject': `CN=${req.host}`,
      'Server cert issuer': 'CN=DigiCert TLS RSA SHA256 2020 CA1',
      'Server cert expires': '2027-03-01',
    },
  });

  if (failureMode === 'mtls-no-cert') {
    events.push({
      id: nextId('tls'),
      phase: 'tls',
      from,
      to,
      label: '{Certificate} (empty)',
      detail: 'The client has no certificate from any of the requested CAs, so it sends an empty Certificate message. TLS allows this - the server decides whether a certificate is required.',
      observableViaFetch: false,
      durationMs: 250,
      meta: { 'Certificates sent': 'none' },
    });
  } else {
    events.push({
      id: nextId('tls'),
      phase: 'tls',
      from,
      to,
      label: '{Certificate}',
      detail: 'The client sends its own certificate chain. A certificate is public information, so sending it proves nothing by itself. The proof comes in the next message.',
      observableViaFetch: false,
      durationMs: 250,
      meta: {
        'Client cert subject': CLIENT_CERT_SUBJECT,
        'Client cert issuer': failureMode === 'mtls-unknown-ca' ? 'CN=Example Shop Internal CA' : CLIENT_CA,
        'Valid until': failureMode === 'mtls-expired' ? '2026-10-31 (expired)' : '2027-06-30',
        'Extended key usage': 'clientAuth',
      },
    });
    events.push({
      id: nextId('tls'),
      phase: 'tls',
      from,
      to,
      label: '{CertificateVerify}',
      detail: 'The client signs a hash of the whole handshake so far with the private key that belongs to its certificate. Only the key holder can produce this signature, and because it covers this handshake it cannot be replayed on another connection. This is the actual proof of identity.',
      observableViaFetch: false,
      durationMs: 250,
      meta: {
        'Signature algorithm': 'ecdsa_secp256r1_sha256',
        'Signed data': 'transcript hash (ClientHello … client Certificate)',
      },
    });
  }

  events.push({
    id: nextId('tls'),
    phase: 'tls',
    from,
    to,
    label: '{Finished}',
    detail: 'The client sends its Finished MAC. From the client\'s side the handshake is now complete - in TLS 1.3 it may start sending application data right away, before the server has accepted its certificate.',
    observableViaFetch: false,
    durationMs: 200,
  });

  const accepted = !isMtlsFailureMode(failureMode);
  const verifyMeta: Record<string, string> =
    failureMode === 'mtls-no-cert'
      ? { 'Certificate present': '✗ none sent - this endpoint requires one' }
      : {
          'Chain to trusted CA': failureMode === 'mtls-unknown-ca' ? '✗ issuer not in trust store' : `✓ ${CLIENT_CA}`,
          'Validity period': failureMode === 'mtls-expired' ? '✗ expired 2026-10-31' : '✓ valid until 2027-06-30',
          'Key usage': '✓ clientAuth',
          'CertificateVerify signature': '✓ matches the certificate\'s public key',
        };

  events.push({
    id: nextId('tls'),
    phase: 'tls',
    from: to,
    label: 'Verify client certificate',
    detail: accepted
      ? 'The server checks the client certificate the way the client checked the server\'s: the chain ends at a CA it trusts, the dates are valid, the key usage allows client auth, and the CertificateVerify signature matches. Both sides are now authenticated - mutual TLS is established.'
      : 'The server checks the client certificate the way the client checked the server\'s - and one of the checks fails.',
    observableViaFetch: false,
    durationMs: 300,
    meta: verifyMeta,
  });

  if (!accepted) {
    const alerts: Record<string, { label: string; detail: string }> = {
      'mtls-no-cert': {
        label: 'TLS alert: certificate_required',
        detail: 'Alert 116 (TLS 1.3). The server requires a client certificate and got none. This is a TLS failure, not an HTTP 401 or 403 - the request never reaches the application, so there is no status code to read.',
      },
      'mtls-unknown-ca': {
        label: 'TLS alert: unknown_ca',
        detail: 'Alert 48. The certificate chain does not end at any CA in the server\'s trust store - here it was issued by the merchant\'s internal CA instead of the gateway\'s client CA. The fix is a certificate from the right CA, not a retry.',
      },
      'mtls-expired': {
        label: 'TLS alert: certificate_expired',
        detail: 'Alert 45. The client certificate is past its expiry date. A common production outage: client certificates often sit in a config file nobody watches, and expire silently.',
      },
    };
    const alert = alerts[failureMode];
    if (alert) {
      events.push({
        id: nextId('failure'),
        phase: 'failure',
        from: to,
        to: from,
        label: alert.label,
        detail: `${alert.detail} Because the client already sent Finished, many client libraries only notice on their next read and report a vague "connection reset" or "bad certificate" error.`,
        observableViaFetch: false,
        durationMs: 250,
      });
    }
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
