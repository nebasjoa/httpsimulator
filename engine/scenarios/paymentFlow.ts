import type { RequestConfig, Scenario, ServerConfig, SimEvent, WireMessage } from '../types';
import { buildRequestWire, buildResponseWire, byteLength } from '../wire';
import { buildConnectionSetup, nextId } from './shared';

const GATEWAY_HOST = 'pay.computop.com';
const ISSUER_HOST = 'acs.issuingbank.example';
const TRANS_ID = 'TX-1029384';

function connectionMarker(from: SimEvent['from'], to: SimEvent['to'], label: string): SimEvent {
  return {
    id: nextId('tcp'),
    phase: 'tcp',
    from,
    to,
    label,
    detail: `A new secure connection is opened here. Its full DNS/TCP/TLS handshake is elided — see the "Single request / response" scenario for that level of detail.`,
    observableViaFetch: false,
    durationMs: 250,
  };
}

function build(req: RequestConfig, server: ServerConfig): SimEvent[] {
  const failureMode = server.failureMode ?? 'none';

  // 1. Shopper's browser checks out on the merchant site.
  const events = buildConnectionSetup(req, failureMode, 'client', 'server');
  if (events[events.length - 1]?.phase === 'failure') {
    return events;
  }

  const checkoutRequestWire = buildRequestWire(req);
  events.push({
    id: nextId('http-request'),
    phase: 'http-request',
    from: 'client',
    to: 'server',
    label: `${req.method} ${req.path}`,
    detail: 'The shopper clicks "Pay" on the merchant\'s own site. This request never touches the gateway directly — the merchant server does that next, server-to-server.',
    observableViaFetch: false,
    durationMs: 400,
    wire: checkoutRequestWire,
  });

  // 2. Merchant → Gateway: S2S create payment. No browser involved at all.
  events.push(connectionMarker('server', 'gateway', 'Connection: Server ↔ Gateway (S2S, TLS)'));

  const s2sBody = `MerchantID=284500&TransID=${TRANS_ID}&Amount=1999&Currency=EUR&NotifyURL=https%3A%2F%2Fshop.example.com%2Fwebhook`;
  const s2sRequestWire: WireMessage = {
    kind: 'http-request',
    startLine: 'POST /kvp/create HTTP/1.1',
    headers: [
      { name: 'Host', value: GATEWAY_HOST, auto: true },
      { name: 'Content-Type', value: 'application/x-www-form-urlencoded', auto: true },
      { name: 'Content-Length', value: String(byteLength(s2sBody)), auto: true },
    ],
    body: s2sBody,
  };
  events.push({
    id: nextId('http-request'),
    phase: 'http-request',
    from: 'server',
    to: 'gateway',
    label: 'POST /kvp/create',
    detail: 'The merchant server calls the gateway\'s KVP API directly (server-to-server) to create the payment. This is the S2S leg — the shopper\'s browser is never a party to it.',
    observableViaFetch: false,
    durationMs: 400,
    wire: s2sRequestWire,
  });
  events.push({
    id: nextId('processing'),
    phase: 'processing',
    from: 'gateway',
    label: 'Gateway creates the payment session',
    detail: 'The gateway allocates a transaction record and a hosted payment-page URL for the shopper to be sent to.',
    observableViaFetch: false,
    durationMs: 400,
  });

  const s2sResponseBody = `{"paymentPageUrl":"https://${GATEWAY_HOST}/paymentpage?id=${TRANS_ID}"}`;
  const s2sResponseWire: WireMessage = {
    kind: 'http-response',
    startLine: 'HTTP/1.1 200 OK',
    headers: [
      { name: 'Date', value: 'Fri, 10 Jul 2026 10:00:00 GMT', auto: true },
      { name: 'Server', value: 'ComputopSim/1.0', auto: true },
      { name: 'Content-Type', value: 'application/json', auto: true },
      { name: 'Content-Length', value: String(byteLength(s2sResponseBody)), auto: true },
    ],
    body: s2sResponseBody,
  };
  events.push({
    id: nextId('http-response'),
    phase: 'http-response',
    from: 'gateway',
    to: 'server',
    label: 'HTTP/1.1 200 OK',
    detail: 'The gateway hands back a payment-page URL. The merchant now redirects the shopper\'s browser there.',
    observableViaFetch: true,
    durationMs: 400,
    wire: s2sResponseWire,
  });

  // 3. Merchant → Client: redirect the browser to the hosted payment page (this is the
  // response to step 1's checkout request).
  const redirectToGatewayWire: WireMessage = {
    kind: 'http-response',
    startLine: 'HTTP/1.1 302 Found',
    headers: [
      { name: 'Date', value: 'Fri, 10 Jul 2026 10:00:00 GMT', auto: true },
      { name: 'Server', value: 'ComputopSim/1.0', auto: true },
      { name: 'Location', value: `https://${GATEWAY_HOST}/paymentpage?id=${TRANS_ID}` },
    ],
  };
  events.push({
    id: nextId('http-response'),
    phase: 'http-response',
    from: 'server',
    to: 'client',
    label: 'HTTP/1.1 302 Found',
    detail: 'The merchant redirects the shopper\'s browser to the hosted payment page it just got back from the gateway. This is the first leg where the browser is actually involved.',
    observableViaFetch: true,
    durationMs: 400,
    wire: redirectToGatewayWire,
  });

  // 4. Client → Gateway: browser follows the redirect and loads the hosted payment page.
  events.push(connectionMarker('client', 'gateway', 'Connection: Client ↔ Gateway (TLS)'));

  const paymentPageRequestWire: WireMessage = {
    kind: 'http-request',
    startLine: `GET /paymentpage?id=${TRANS_ID} HTTP/1.1`,
    headers: [{ name: 'Host', value: GATEWAY_HOST, auto: true }],
  };
  events.push({
    id: nextId('http-request'),
    phase: 'http-request',
    from: 'client',
    to: 'gateway',
    label: 'GET /paymentpage',
    detail: 'The browser follows the redirect and loads the hosted payment page — a form that runs entirely on the gateway\'s domain, not the merchant\'s.',
    observableViaFetch: false,
    durationMs: 400,
    wire: paymentPageRequestWire,
  });
  events.push({
    id: nextId('processing'),
    phase: 'processing',
    from: 'gateway',
    label: 'Gateway renders the hosted form',
    detail: 'The gateway serves the card-entry form for this transaction ID.',
    observableViaFetch: false,
    durationMs: 300,
  });
  const paymentPageBody = '<form method="POST" action="/paymentpage/submit">...</form>';
  const paymentPageResponseWire: WireMessage = {
    kind: 'http-response',
    startLine: 'HTTP/1.1 200 OK',
    headers: [
      { name: 'Date', value: 'Fri, 10 Jul 2026 10:00:00 GMT', auto: true },
      { name: 'Server', value: 'ComputopSim/1.0', auto: true },
      { name: 'Content-Type', value: 'text/html; charset=utf-8', auto: true },
      { name: 'Content-Length', value: String(byteLength(paymentPageBody)), auto: true },
    ],
    body: paymentPageBody,
  };
  events.push({
    id: nextId('http-response'),
    phase: 'http-response',
    from: 'gateway',
    to: 'client',
    label: 'HTTP/1.1 200 OK',
    detail: 'The card-entry form. Because it\'s served from the gateway\'s own origin, the merchant\'s page never touches raw card data — this is why hosted payment pages exist.',
    observableViaFetch: true,
    durationMs: 400,
    wire: paymentPageResponseWire,
  });

  // 5. Client → Gateway: shopper submits card data.
  const cardBody = 'CardNumber=4111111111111111&Expiry=1228&CVV=123&Amount=1999';
  const cardSubmitRequestWire: WireMessage = {
    kind: 'http-request',
    startLine: 'POST /paymentpage/submit HTTP/1.1',
    headers: [
      { name: 'Host', value: GATEWAY_HOST, auto: true },
      { name: 'Content-Type', value: 'application/x-www-form-urlencoded', auto: true },
      { name: 'Content-Length', value: String(byteLength(cardBody)), auto: true },
    ],
    body: cardBody,
  };
  events.push({
    id: nextId('http-request'),
    phase: 'http-request',
    from: 'client',
    to: 'gateway',
    label: 'POST /paymentpage/submit',
    detail: 'The shopper submits their card data as a form-encoded POST — this is exactly why this connection must be HTTPS.',
    observableViaFetch: false,
    durationMs: 450,
    wire: cardSubmitRequestWire,
  });
  events.push({
    id: nextId('processing'),
    phase: 'processing',
    from: 'gateway',
    label: 'Gateway validates the card and requires 3DS',
    detail: 'The gateway checks the card data and decides this transaction needs a Strong Customer Authentication (3DS) challenge before it can be authorized.',
    observableViaFetch: false,
    durationMs: 400,
  });
  const to3dsWire: WireMessage = {
    kind: 'http-response',
    startLine: 'HTTP/1.1 302 Found',
    headers: [
      { name: 'Date', value: 'Fri, 10 Jul 2026 10:00:00 GMT', auto: true },
      { name: 'Server', value: 'ComputopSim/1.0', auto: true },
      { name: 'Location', value: `https://${ISSUER_HOST}/3ds/challenge?token=abc123` },
    ],
  };
  events.push({
    id: nextId('http-response'),
    phase: 'http-response',
    from: 'gateway',
    to: 'client',
    label: 'HTTP/1.1 302 Found',
    detail: 'The gateway redirects the browser to the card issuer\'s Access Control Server (ACS) — a third domain the shopper is now sent to.',
    observableViaFetch: true,
    durationMs: 400,
    wire: to3dsWire,
  });

  // 6. Client → Issuer: 3DS challenge.
  events.push(connectionMarker('client', 'issuer', 'Connection: Client ↔ Issuer ACS (TLS)'));

  const challengeRequestWire: WireMessage = {
    kind: 'http-request',
    startLine: 'GET /3ds/challenge?token=abc123 HTTP/1.1',
    headers: [{ name: 'Host', value: ISSUER_HOST, auto: true }],
  };
  events.push({
    id: nextId('http-request'),
    phase: 'http-request',
    from: 'client',
    to: 'issuer',
    label: 'GET /3ds/challenge',
    detail: 'The browser loads the issuer\'s own challenge page (e.g. an OTP prompt) — neither the merchant nor the gateway can see what the shopper enters here.',
    observableViaFetch: false,
    durationMs: 400,
    wire: challengeRequestWire,
  });
  events.push({
    id: nextId('processing'),
    phase: 'processing',
    from: 'issuer',
    label: 'Shopper completes the 3DS challenge',
    detail: 'The shopper proves it\'s really them — e.g. an OTP sent to their phone, or biometric approval in their banking app.',
    observableViaFetch: false,
    durationMs: 600,
  });
  const backToGatewayWire: WireMessage = {
    kind: 'http-response',
    startLine: 'HTTP/1.1 302 Found',
    headers: [
      { name: 'Date', value: 'Fri, 10 Jul 2026 10:00:00 GMT', auto: true },
      { name: 'Location', value: `https://${GATEWAY_HOST}/paymentpage/return?token=abc123` },
    ],
  };
  events.push({
    id: nextId('http-response'),
    phase: 'http-response',
    from: 'issuer',
    to: 'client',
    label: 'HTTP/1.1 302 Found',
    detail: 'The issuer redirects the browser back to the gateway\'s return URL with a signed result.',
    observableViaFetch: true,
    durationMs: 400,
    wire: backToGatewayWire,
  });

  // 7. Client → Gateway: return leg, reusing the connection from step 4.
  const returnRequestWire: WireMessage = {
    kind: 'http-request',
    startLine: 'GET /paymentpage/return?token=abc123 HTTP/1.1',
    headers: [{ name: 'Host', value: GATEWAY_HOST, auto: true }],
  };
  events.push({
    id: nextId('http-request'),
    phase: 'http-request',
    from: 'client',
    to: 'gateway',
    label: 'GET /paymentpage/return',
    detail: 'Back on the gateway\'s domain, reusing the earlier keep-alive connection. The gateway confirms the 3DS result with the issuer and finalizes the payment.',
    observableViaFetch: false,
    durationMs: 400,
    wire: returnRequestWire,
  });
  events.push({
    id: nextId('processing'),
    phase: 'processing',
    from: 'gateway',
    label: 'Gateway finalizes the payment',
    detail: 'The gateway marks the transaction authorized and prepares to notify the merchant asynchronously.',
    observableViaFetch: false,
    durationMs: 400,
  });
  const toMerchantWire: WireMessage = {
    kind: 'http-response',
    startLine: 'HTTP/1.1 302 Found',
    headers: [
      { name: 'Date', value: 'Fri, 10 Jul 2026 10:00:00 GMT', auto: true },
      { name: 'Server', value: 'ComputopSim/1.0', auto: true },
      { name: 'Location', value: 'https://shop.example.com/checkout/success?id=' + TRANS_ID },
    ],
  };
  events.push({
    id: nextId('http-response'),
    phase: 'http-response',
    from: 'gateway',
    to: 'client',
    label: 'HTTP/1.1 302 Found',
    detail: 'The gateway sends the browser back to the merchant\'s own success page — the shopper-facing journey ends where it started.',
    observableViaFetch: true,
    durationMs: 400,
    wire: toMerchantWire,
  });

  // 8. Client → Server: browser lands back on the merchant site, reusing the step-1 connection.
  // This is the one leg still driven by ServerConfig, so the status picker stays meaningful.
  const resultReq: RequestConfig = {
    ...req,
    method: 'GET',
    path: '/checkout/success',
    body: undefined,
    contentType: undefined,
  };
  const resultRequestWire = buildRequestWire(resultReq);
  events.push({
    id: nextId('http-request'),
    phase: 'http-request',
    from: 'client',
    to: 'server',
    label: 'GET /checkout/success',
    detail: 'The browser lands back on the merchant site, reusing the keep-alive connection from step 1.',
    observableViaFetch: false,
    durationMs: 400,
    wire: resultRequestWire,
  });
  events.push({
    id: nextId('processing'),
    phase: 'processing',
    from: 'server',
    label: 'Merchant renders the result page',
    detail: 'The merchant hasn\'t heard from the gateway yet at this point — the webhook below is what actually confirms the payment. Pick a status code below to see how a failure here would look.',
    observableViaFetch: false,
    durationMs: 400,
  });
  const resultResponseWire = buildResponseWire(server, resultReq);
  events.push({
    id: nextId('http-response'),
    phase: 'http-response',
    from: 'server',
    to: 'client',
    label: resultResponseWire.startLine,
    detail: 'The merchant\'s result page — driven by the status picker below.',
    observableViaFetch: true,
    durationMs: 400,
    wire: resultResponseWire,
  });
  events.push({
    id: nextId('connection'),
    phase: 'connection',
    from: 'client',
    label: 'Connection: keep-alive',
    detail: 'The shopper-facing part of the flow ends here.',
    observableViaFetch: false,
    durationMs: 200,
  });

  // 9. Separately: Gateway → Merchant async webhook notification.
  events.push(connectionMarker('gateway', 'server', 'Connection: Gateway ↔ Server (S2S webhook, TLS)'));

  const webhookBody = `TransID=${TRANS_ID}&Status=approved&Signature=9f8e7d6c5b4a`;
  const webhookRequestWire: WireMessage = {
    kind: 'http-request',
    startLine: 'POST /webhook/notify HTTP/1.1',
    headers: [
      { name: 'Host', value: req.host, auto: true },
      { name: 'Content-Type', value: 'application/x-www-form-urlencoded', auto: true },
      { name: 'Content-Length', value: String(byteLength(webhookBody)), auto: true },
    ],
    body: webhookBody,
  };
  events.push({
    id: nextId('http-request'),
    phase: 'http-request',
    from: 'gateway',
    to: 'server',
    label: 'POST /webhook/notify',
    detail: 'Independently of the browser, the gateway calls the merchant\'s webhook to confirm the payment outcome. This is the authoritative notification — the browser-mediated redirect above is just a UX convenience and can be lost (e.g. the shopper closes the tab).',
    observableViaFetch: false,
    durationMs: 400,
    wire: webhookRequestWire,
  });
  events.push({
    id: nextId('processing'),
    phase: 'processing',
    from: 'server',
    label: 'Merchant records the payment idempotently',
    detail: 'The merchant looks up TransID before applying this notification. If the same TransID arrives twice (e.g. a retried webhook), it must not double-credit the order — see 409 Conflict in the status catalog for what a badly-handled replay looks like.',
    observableViaFetch: false,
    durationMs: 400,
  });
  const webhookAckWire: WireMessage = {
    kind: 'http-response',
    startLine: 'HTTP/1.1 200 OK',
    headers: [
      { name: 'Date', value: 'Fri, 10 Jul 2026 10:00:00 GMT', auto: true },
    ],
  };
  events.push({
    id: nextId('http-response'),
    phase: 'http-response',
    from: 'server',
    to: 'gateway',
    label: 'HTTP/1.1 200 OK',
    detail: 'The merchant acknowledges the webhook. If this 200 is ever lost, the gateway will retry the notification — which is exactly why the idempotency check above matters.',
    observableViaFetch: true,
    durationMs: 400,
    wire: webhookAckWire,
  });
  events.push({
    id: nextId('connection'),
    phase: 'connection',
    from: 'gateway',
    label: 'Connection: keep-alive',
    detail: 'The async notification leg ends here.',
    observableViaFetch: false,
    durationMs: 200,
  });

  return events;
}

const presetRequest: RequestConfig = {
  method: 'POST',
  https: true,
  host: 'shop.example.com',
  path: '/checkout',
  contentType: 'application/x-www-form-urlencoded',
  body: 'Amount=1999&Currency=EUR&OrderID=ORD-1029384',
  extraHeaders: [],
};

export const paymentFlowScenario: Scenario = {
  id: 'payment-flow',
  title: 'Computop end-to-end payment flow',
  description: 'S2S create → 302 to hosted payment page → form POST → 3DS redirect → return → async webhook notification, across four parties: shopper, merchant, gateway, and card issuer.',
  build,
  presetRequest,
  presetServer: { statusCode: 200 },
};
