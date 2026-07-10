import type { HeaderLine, RequestConfig, Scenario, ServerConfig, SimEvent } from '../types';
import { buildRequestWire, buildResponseWire } from '../wire';
import { getStatusInfo } from '../statusCatalog';
import { buildConnectionSetup, nextId } from './shared';

const SESSION_COOKIE = 'sessionid=abc123; Secure; HttpOnly';
const SESSION_COOKIE_VALUE = SESSION_COOKIE.split(';')[0] ?? SESSION_COOKIE;
const METHOD_PRESERVING_CODES = new Set([307, 308]);

function hop1StatusInfo(code: number) {
  const info = getStatusInfo(code);
  // Only a 3xx makes sense as the first hop of a redirect chain — fall back to 302.
  return info.class === '3xx' ? info : getStatusInfo(302);
}

function splitLocation(location: string, fallbackHost: string, fallbackPath: string): { host: string; path: string } {
  try {
    const url = new URL(location);
    return { host: url.host, path: `${url.pathname}${url.search}` };
  } catch {
    return { host: fallbackHost, path: location.startsWith('/') ? location : fallbackPath };
  }
}

function build(req: RequestConfig, server: ServerConfig): SimEvent[] {
  const failureMode = server.failureMode ?? 'none';
  const events = buildConnectionSetup(req, failureMode);
  if (events[events.length - 1]?.phase === 'failure') {
    return events;
  }

  const status = hop1StatusInfo(server.statusCode);

  const hop1RequestWire = buildRequestWire(req);
  events.push({
    id: nextId('http-request'),
    phase: 'http-request',
    from: 'client',
    to: 'server',
    label: `${req.method} ${req.path}`,
    detail: 'The client sends the initial request that will trigger a redirect.',
    observableViaFetch: false,
    durationMs: 400,
    wire: hop1RequestWire,
  });
  events.push({
    id: nextId('processing'),
    phase: 'processing',
    from: 'server',
    label: 'Server processing',
    detail: 'The server decides the shopper needs to be sent elsewhere — e.g. to the hosted payment page — and starts a session for them.',
    observableViaFetch: false,
    durationMs: 500,
  });

  const setCookie: HeaderLine = { name: 'Set-Cookie', value: SESSION_COOKIE };
  const hop1ResponseWire = buildResponseWire({ statusCode: status.code }, req, [setCookie]);
  events.push({
    id: nextId('http-response'),
    phase: 'http-response',
    from: 'server',
    to: 'client',
    label: hop1ResponseWire.startLine,
    detail: `${status.summary} The server also opens a session with Set-Cookie, which the browser will carry on the follow-up request.`,
    observableViaFetch: true,
    durationMs: 400,
    wire: hop1ResponseWire,
  });

  const location = status.responseHeaders.find((h) => h.name === 'Location')?.value ?? `https://${req.host}${req.path}`;
  const { host: hop2Host, path: hop2Path } = splitLocation(location, req.host, req.path);
  const preserveMethod = METHOD_PRESERVING_CODES.has(status.code);

  const hop2Req: RequestConfig = {
    ...req,
    host: hop2Host,
    path: hop2Path,
    method: preserveMethod ? req.method : 'GET',
    body: preserveMethod ? req.body : undefined,
    contentType: preserveMethod ? req.contentType : undefined,
    extraHeaders: [...(req.extraHeaders ?? []), { name: 'Cookie', value: SESSION_COOKIE_VALUE }],
  };

  const hop2RequestWire = buildRequestWire(hop2Req);
  events.push({
    id: nextId('http-request'),
    phase: 'http-request',
    from: 'client',
    to: 'server',
    label: `${hop2Req.method} ${hop2Req.path}`,
    detail: preserveMethod
      ? `${status.code} preserves the method and body — the browser re-issues the SAME ${req.method} to Location, now carrying the session cookie back.`
      : `${status.code} follows the classic redirect convention — the browser re-issues this as a GET with no body, carrying the session cookie back.`,
    observableViaFetch: false,
    durationMs: 400,
    wire: hop2RequestWire,
  });
  events.push({
    id: nextId('processing'),
    phase: 'processing',
    from: 'server',
    label: 'Server processing',
    detail: 'The server recognizes the session from the Cookie header and serves the destination page.',
    observableViaFetch: false,
    durationMs: 400,
  });

  const hop2ResponseWire = buildResponseWire({ statusCode: 200 }, hop2Req);
  events.push({
    id: nextId('http-response'),
    phase: 'http-response',
    from: 'server',
    to: 'client',
    label: hop2ResponseWire.startLine,
    detail: 'The redirect chain ends here with a normal 200 OK for the destination page.',
    observableViaFetch: true,
    durationMs: 400,
    wire: hop2ResponseWire,
  });

  events.push({
    id: nextId('connection'),
    phase: 'connection',
    from: 'server',
    label: 'Connection: keep-alive',
    detail: 'Same host, so the browser reuses the existing keep-alive connection for the follow-up request rather than repeating the TCP/TLS handshake.',
    observableViaFetch: false,
    durationMs: 200,
  });

  return events;
}

const presetRequest: RequestConfig = {
  method: 'GET',
  https: true,
  host: 'pay.computop.com',
  path: '/paymentpage/start',
  extraHeaders: [],
};

export const redirectChainScenario: Scenario = {
  id: 'redirect-chain',
  title: 'Redirect chain',
  description: '301/302/303 vs 307/308 method-preservation differences across hops, plus the Set-Cookie/Cookie session that rides along.',
  build,
  presetRequest,
  presetServer: { statusCode: 302 },
};
