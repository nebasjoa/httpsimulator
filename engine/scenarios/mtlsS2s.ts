import type { HeaderLine, Party, RequestConfig, Scenario, ServerConfig, SimEvent, WireMessage } from '../types';
import { buildRequestWire, buildResponseWire } from '../wire';
import { CLIENT_CERT_SUBJECT, buildConnectionSetup, nextId } from './shared';

// Envoy-style forwarded identity. RFC 9440 standardises the same idea as the
// `Client-Cert` header (the whole DER cert, base64), but XFCC is what most stacks still use.
const XFCC_VALUE = `Hash=9f2c51d07be3a8e41a;Subject="${CLIENT_CERT_SUBJECT.replace(', ', ',')}"`;

const presetRequest: RequestConfig = {
  method: 'POST',
  https: true,
  mtls: true,
  tlsTermination: 'origin',
  host: 'api.computop.com',
  path: '/kvp/create',
  contentType: 'application/x-www-form-urlencoded',
  body: 'MerchantID=284500&TransID=TX-1029384&Amount=1999&Currency=EUR',
  extraHeaders: [],
};

function timeoutTail(at: Party, client: Party): SimEvent[] {
  return [
    {
      id: nextId('processing'),
      phase: 'processing',
      from: at,
      label: 'Server processing',
      detail: 'The server received the request but never sends a response.',
      observableViaFetch: false,
      durationMs: 600,
    },
    {
      id: nextId('failure'),
      phase: 'failure',
      from: client,
      label: 'Request timed out',
      detail: 'No response arrived within the client\'s timeout window. The mutually-authenticated connection was fine - the failure is above TLS, so the client must decide whether retrying is safe (idempotency).',
      observableViaFetch: false,
      durationMs: 250,
    },
  ];
}

function build(req: RequestConfig, server: ServerConfig): SimEvent[] {
  const failureMode = server.failureMode ?? 'none';
  const viaProxy = req.tlsTermination === 'edge-proxy';
  const tlsPeer: Party = viaProxy ? 'proxy' : 'server';

  const events = buildConnectionSetup(req, failureMode, 'client', tlsPeer);
  if (events[events.length - 1]?.phase === 'failure') {
    return events;
  }

  const requestWire = buildRequestWire(req);
  const certNote = req.mtls
    ? 'Notice there is no Authorization header: the caller was already authenticated by its certificate during the handshake. mTLS authenticates the connection; a header would authenticate each request.'
    : 'mTLS is switched off, so the connection proves nothing about the caller - the API would need an Authorization header or similar to know who this is.';
  events.push({
    id: nextId('http-request'),
    phase: 'http-request',
    from: 'client',
    to: tlsPeer,
    label: `${req.method} ${req.path}`,
    detail: `The merchant backend sends its API request over the established connection. ${certNote}`,
    observableViaFetch: false,
    durationMs: 400,
    wire: requestWire,
  });

  if (viaProxy) {
    events.push({
      id: nextId('processing'),
      phase: 'processing',
      from: 'proxy',
      label: 'Strip & forward identity',
      detail: 'TLS ends at the proxy, so the app behind it never sees the certificate. The proxy first deletes any X-Forwarded-Client-Cert header the caller sent (otherwise anyone could forge one), then adds its own describing the certificate it verified.',
      observableViaFetch: false,
      durationMs: 300,
      meta: req.mtls
        ? { 'Verified subject': CLIENT_CERT_SUBJECT, 'Incoming XFCC header': 'removed if present' }
        : { 'Verified subject': 'none - no client certificate on this connection' },
    });

    const forwardedHeaders: HeaderLine[] = [
      ...requestWire.headers,
      { name: 'X-Forwarded-For', value: '203.0.113.24' },
      ...(req.mtls ? [{ name: 'X-Forwarded-Client-Cert', value: XFCC_VALUE }] : []),
    ];
    const forwardedWire: WireMessage = { ...requestWire, headers: forwardedHeaders };
    events.push({
      id: nextId('http-request'),
      phase: 'http-request',
      from: 'proxy',
      to: 'server',
      label: `${req.method} ${req.path} (forwarded)`,
      detail: 'A second, separate hop on the internal network. The client identity now travels as an ordinary HTTP header, so the app must only trust that header when the request really came from the proxy - if the app is reachable directly, the header is just text anyone can type.',
      observableViaFetch: false,
      durationMs: 400,
      wire: forwardedWire,
    });
  }

  if (failureMode === 'timeout') {
    events.push(...timeoutTail('server', 'client'));
    return events;
  }

  events.push({
    id: nextId('processing'),
    phase: 'processing',
    from: 'server',
    label: req.mtls ? 'Map certificate → merchant' : 'Server processing',
    detail: req.mtls
      ? viaProxy
        ? 'The app reads X-Forwarded-Client-Cert, maps the subject to a merchant account, and checks that the MerchantID in the body belongs to it. The certificate proves who is calling; it does not by itself say what they may do.'
        : 'The app asks its TLS layer for the verified peer certificate, maps the subject to a merchant account, and checks that the MerchantID in the body belongs to it. The certificate proves who is calling; it does not by itself say what they may do.'
      : 'The server handles the request without any caller identity from the connection.',
    observableViaFetch: false,
    durationMs: 500,
    meta: req.mtls
      ? { 'Certificate subject': CLIENT_CERT_SUBJECT, 'Mapped merchant': '284500', 'MerchantID in body': '284500 ✓' }
      : undefined,
  });

  const responseWire = buildResponseWire(server, req);
  events.push({
    id: nextId('http-response'),
    phase: 'http-response',
    from: 'server',
    to: viaProxy ? 'proxy' : 'client',
    label: responseWire.startLine,
    detail: 'The API answers. Any HTTP status from here on - 401, 403, 409 - is an application decision made after mTLS already succeeded.',
    observableViaFetch: true,
    durationMs: 400,
    wire: responseWire,
  });

  if (viaProxy) {
    events.push({
      id: nextId('http-response'),
      phase: 'http-response',
      from: 'proxy',
      to: 'client',
      label: `${responseWire.startLine} (relayed)`,
      detail: 'The proxy relays the response back over the mutually-authenticated connection it holds with the merchant.',
      observableViaFetch: true,
      durationMs: 300,
      wire: responseWire,
    });
  }

  events.push({
    id: nextId('connection'),
    phase: 'connection',
    from: tlsPeer,
    label: 'Connection: keep-alive',
    detail: 'Keeping the connection open matters more with mTLS: the certificate exchange and signature checks are the expensive part, and a reused connection skips them for later requests.',
    observableViaFetch: false,
    durationMs: 200,
  });

  return events;
}

export const mtlsS2sScenario: Scenario = {
  id: 'mtls-s2s',
  title: 'Mutual TLS (server-to-server)',
  description: 'A merchant backend calls the gateway API and authenticates with a client certificate. Both sides prove their identity during the TLS 1.3 handshake, before any HTTP is sent.',
  build,
  presetRequest,
  presetServer: { statusCode: 201, failureMode: 'none' },
  partyLabels: { client: 'Merchant server', proxy: 'Edge proxy', server: 'Gateway API' },
};
