import type { HeaderLine, RequestConfig, ServerConfig, WireMessage } from './types';
import { BODYLESS_STATUS_CODES, getStatusInfo } from './statusCatalog';

const METHODS_ALLOWING_BODY = new Set(['POST', 'PUT', 'PATCH']);

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function buildRequestWire(req: RequestConfig): WireMessage {
  const startLine = `${req.method} ${req.path} HTTP/1.1`;
  const headers: HeaderLine[] = [{ name: 'Host', value: req.host, auto: true }];

  for (const h of req.extraHeaders ?? []) {
    headers.push(h);
  }

  const hasBody = METHODS_ALLOWING_BODY.has(req.method) && !!req.body;
  if (hasBody) {
    headers.push({ name: 'Content-Type', value: req.contentType ?? 'text/plain', auto: true });
    headers.push({ name: 'Content-Length', value: String(byteLength(req.body!)), auto: true });
  }

  return {
    kind: 'http-request',
    startLine,
    headers,
    body: hasBody ? req.body : undefined,
  };
}

export function buildResponseWire(
  server: ServerConfig,
  req: RequestConfig,
  extraResponseHeaders: HeaderLine[] = []
): WireMessage {
  const info = getStatusInfo(server.statusCode);
  const startLine = `HTTP/1.1 ${info.code} ${info.reason}`;

  const headers: HeaderLine[] = [
    { name: 'Date', value: 'Fri, 10 Jul 2026 10:00:00 GMT', auto: true },
    { name: 'Server', value: 'ComputopSim/1.0', auto: true },
    ...info.responseHeaders,
    ...extraResponseHeaders,
  ];

  const suppressBody = BODYLESS_STATUS_CODES.has(info.code) || req.method === 'HEAD';
  const body = suppressBody ? undefined : info.body;

  if (body) {
    const contentType = body.trimStart().startsWith('{') || body.trimStart().startsWith('[')
      ? 'application/json'
      : 'text/plain; charset=utf-8';
    headers.push({ name: 'Content-Type', value: contentType, auto: true });
    headers.push({ name: 'Content-Length', value: String(byteLength(body)), auto: true });
  }

  return {
    kind: 'http-response',
    startLine,
    headers,
    body,
  };
}

// Joins with CRLF and renders the mandatory blank line separating headers from body.
// Bodyless messages still end in the blank line (no trailing body bytes).
export function serializeWire(msg: WireMessage): string {
  const lines = [msg.startLine, ...msg.headers.map((h) => `${h.name}: ${h.value}`)];
  return `${lines.join('\r\n')}\r\n\r\n${msg.body ?? ''}`;
}
