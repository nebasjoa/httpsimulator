import type { HeaderLine } from './types';

export type StatusClass = '1xx' | '2xx' | '3xx' | '4xx' | '5xx';

export interface StatusInfo {
  code: number;
  reason: string;                    // "Not Modified"
  class: StatusClass;
  responseHeaders: HeaderLine[];     // scenario-appropriate headers this status carries
  body?: string;
  summary: string;                   // what it means, plainly
  paymentsExample: string;           // when it fires in a KVP / gateway context
  clientAction: string;              // how a well-behaved client should react
}

export const statusCatalog: StatusInfo[] = [
  // 1xx
  {
    code: 100, reason: 'Continue', class: '1xx',
    responseHeaders: [],
    summary: 'Interim response telling the client to go ahead and send the request body.',
    paymentsExample: 'A merchant server signals readiness before accepting a large POST body, used with an `Expect: 100-continue` request header.',
    clientAction: 'Send the request body now that the server has signaled readiness.',
  },
  {
    code: 101, reason: 'Switching Protocols', class: '1xx',
    responseHeaders: [{ name: 'Upgrade', value: 'websocket' }, { name: 'Connection', value: 'Upgrade' }],
    summary: 'The server agrees to switch protocols, as requested by the client\'s `Upgrade` header.',
    paymentsExample: 'Rare in payment APIs; could appear when upgrading a live notification channel to WebSocket.',
    clientAction: 'Continue the exchange using the new protocol.',
  },

  // 2xx
  {
    code: 200, reason: 'OK', class: '2xx',
    responseHeaders: [],
    body: '{"status":"approved","transId":"TX-1029384"}',
    summary: 'Standard success response.',
    paymentsExample: 'A KVP API call succeeded and returned the transaction result.',
    clientAction: 'Read the body; no special handling required.',
  },
  {
    code: 201, reason: 'Created', class: '2xx',
    responseHeaders: [{ name: 'Location', value: 'https://pay.computop.com/transactions/TX-1029384' }],
    body: '{"transId":"TX-1029384"}',
    summary: 'A new resource was created; `Location` points at it.',
    paymentsExample: 'The merchant server creates a payment/transaction resource via the API.',
    clientAction: 'Optionally GET `Location` to fetch the created resource.',
  },
  {
    code: 202, reason: 'Accepted', class: '2xx',
    responseHeaders: [],
    summary: 'The request was accepted for asynchronous processing but is not yet complete.',
    paymentsExample: 'The gateway accepted a notification/webhook for async handling.',
    clientAction: 'Do not assume completion; wait for a follow-up notification or poll status.',
  },
  {
    code: 204, reason: 'No Content', class: '2xx',
    responseHeaders: [],
    summary: 'Success with no response body.',
    paymentsExample: 'A merchant acknowledges receipt of a webhook notification.',
    clientAction: 'Treat as success; there is nothing to parse in the body.',
  },
  {
    code: 206, reason: 'Partial Content', class: '2xx',
    responseHeaders: [{ name: 'Content-Range', value: 'bytes 0-499/1234' }],
    body: '...(partial)',
    summary: 'Only part of the resource is returned, per a `Range` request.',
    paymentsExample: 'Downloading a large settlement/reconciliation file in chunks.',
    clientAction: 'Combine ranges using `Content-Range` to reassemble the full resource.',
  },

  // 3xx
  {
    code: 301, reason: 'Moved Permanently', class: '3xx',
    responseHeaders: [{ name: 'Location', value: 'https://pay.computop.com/v2/paymentpage' }],
    summary: 'A permanent redirect; clients should update any stored link.',
    paymentsExample: 'An old API version endpoint has permanently moved to v2.',
    clientAction: 'Follow `Location` and update the cached/stored URL.',
  },
  {
    code: 302, reason: 'Found', class: '3xx',
    responseHeaders: [{ name: 'Location', value: 'https://pay.computop.com/paymentpage?id=abc' }],
    summary: 'Temporary redirect. Historically clients change the method to GET on the follow-up.',
    paymentsExample: 'Merchant server redirects the shopper’s browser to the hosted payment page.',
    clientAction: 'Follow Location with GET. Do not resubmit the body.',
  },
  {
    code: 303, reason: 'See Other', class: '3xx',
    responseHeaders: [{ name: 'Location', value: 'https://pay.computop.com/paymentpage/result' }],
    summary: 'Redirect after processing - always follow with GET, regardless of the original method.',
    paymentsExample: 'After processing a payment POST, the gateway sends the browser to a result page.',
    clientAction: 'Follow `Location` with GET.',
  },
  {
    code: 304, reason: 'Not Modified', class: '3xx',
    responseHeaders: [{ name: 'ETag', value: '"33a64df551"' }],
    summary: 'Conditional GET - the cached copy is still valid, so no body is sent.',
    paymentsExample: 'The merchant re-fetches a rarely-changing config resource using `If-None-Match`.',
    clientAction: 'Use the cached response body; no new body is provided.',
  },
  {
    code: 307, reason: 'Temporary Redirect', class: '3xx',
    responseHeaders: [{ name: 'Location', value: 'https://pay.computop.com/retry' }],
    summary: 'Temporary redirect that PRESERVES method and body (unlike 302/303).',
    paymentsExample: 'Redirecting an in-flight POST without turning it into a GET.',
    clientAction: 'Re-issue the SAME method + body to Location.',
  },
  {
    code: 308, reason: 'Permanent Redirect', class: '3xx',
    responseHeaders: [{ name: 'Location', value: 'https://pay.computop.com/v2/notify' }],
    summary: 'Permanent redirect that PRESERVES method and body (unlike 301).',
    paymentsExample: 'A webhook notification URL has permanently moved to a new host.',
    clientAction: 'Re-issue the SAME method + body to `Location`, and update the stored URL.',
  },

  // 4xx
  {
    code: 400, reason: 'Bad Request', class: '4xx',
    responseHeaders: [],
    summary: 'Malformed request syntax or invalid parameters.',
    paymentsExample: 'A required field (e.g. TransID) is missing from a KVP POST.',
    clientAction: 'Fix the request before retrying; do not retry unchanged.',
  },
  {
    code: 401, reason: 'Unauthorized', class: '4xx',
    responseHeaders: [{ name: 'WWW-Authenticate', value: 'Basic realm="KVP"' }],
    summary: 'Authentication required or failed. Note the challenge header.',
    paymentsExample: 'Merchant called the API with missing/invalid credentials.',
    clientAction: 'Read WWW-Authenticate, then retry with an Authorization header.',
  },
  {
    code: 402, reason: 'Payment Required', class: '4xx',
    responseHeaders: [],
    summary: 'Reserved for future use; rarely implemented, but on-theme for payment APIs.',
    paymentsExample: 'Some gateways repurpose it to signal a declined or unfunded payment attempt.',
    clientAction: 'Treat as a hard failure; check gateway-specific documentation for exact meaning.',
  },
  {
    code: 403, reason: 'Forbidden', class: '4xx',
    responseHeaders: [],
    summary: 'Authenticated but not permitted to access this resource.',
    paymentsExample: 'Merchant credentials are valid but the calling IP is not whitelisted for the API.',
    clientAction: 'Do not retry with the same credentials; fix permissions or IP whitelisting.',
  },
  {
    code: 404, reason: 'Not Found', class: '4xx',
    responseHeaders: [],
    summary: 'No resource exists at this URL.',
    paymentsExample: 'Querying a transaction ID that does not exist.',
    clientAction: 'Verify the URL/ID; do not retry unchanged.',
  },
  {
    code: 405, reason: 'Method Not Allowed', class: '4xx',
    responseHeaders: [{ name: 'Allow', value: 'GET, POST' }],
    summary: 'The method is not supported on this resource. Allow lists what is.',
    paymentsExample: 'A GET sent to an endpoint that only accepts POST.',
    clientAction: 'Switch to a method listed in Allow.',
  },
  {
    code: 406, reason: 'Not Acceptable', class: '4xx',
    responseHeaders: [],
    summary: 'The server cannot produce a response matching the request\'s `Accept` header.',
    paymentsExample: 'A client requests `Accept: application/xml` but the API only serves JSON.',
    clientAction: 'Adjust the `Accept` header to a supported media type.',
  },
  {
    code: 408, reason: 'Request Timeout', class: '4xx',
    responseHeaders: [],
    summary: 'The server gave up waiting for the request.',
    paymentsExample: 'A slow client connection stalls mid-way through a large form POST.',
    clientAction: 'Retry the request; consider a faster or more reliable connection.',
  },
  {
    code: 409, reason: 'Conflict', class: '4xx',
    responseHeaders: [],
    summary: 'Request conflicts with current state - classic idempotency collision.',
    paymentsExample: 'Same idempotency key / TransID replayed for a payment already created.',
    clientAction: 'Do NOT blindly retry; reconcile against the existing resource.',
  },
  {
    code: 410, reason: 'Gone', class: '4xx',
    responseHeaders: [],
    summary: 'The resource existed but was permanently removed.',
    paymentsExample: 'An old sandbox/test endpoint has been decommissioned.',
    clientAction: 'Stop requesting this URL; it will not come back.',
  },
  {
    code: 411, reason: 'Length Required', class: '4xx',
    responseHeaders: [],
    summary: 'The server requires a `Content-Length` header.',
    paymentsExample: 'A POST is sent with chunked encoding but no explicit length.',
    clientAction: 'Resend with an explicit `Content-Length` header.',
  },
  {
    code: 413, reason: 'Payload Too Large', class: '4xx',
    responseHeaders: [],
    summary: 'The request body exceeds the server\'s size limit.',
    paymentsExample: 'Uploading an oversized reconciliation file.',
    clientAction: 'Reduce payload size or use chunked/paginated upload.',
  },
  {
    code: 415, reason: 'Unsupported Media Type', class: '4xx',
    responseHeaders: [],
    summary: 'The `Content-Type` is not one the server accepts.',
    paymentsExample: 'Sending JSON to an endpoint that only accepts `x-www-form-urlencoded`.',
    clientAction: 'Resend with a supported `Content-Type`.',
  },
  {
    code: 422, reason: 'Unprocessable Entity', class: '4xx',
    responseHeaders: [],
    summary: 'Syntactically valid but semantically invalid request (validation failure).',
    paymentsExample: 'A well-formed KVP POST with an invalid card expiry date.',
    clientAction: 'Fix the invalid field(s) indicated in the response body, then retry.',
  },
  {
    code: 429, reason: 'Too Many Requests', class: '4xx',
    responseHeaders: [{ name: 'Retry-After', value: '30' }],
    summary: 'Rate limited. Retry-After says how long to wait.',
    paymentsExample: 'Merchant is polling notification status too aggressively.',
    clientAction: 'Back off for Retry-After seconds, then retry with jitter.',
  },

  // 5xx
  {
    code: 500, reason: 'Internal Server Error', class: '5xx',
    responseHeaders: [],
    summary: 'Unexpected server-side failure.',
    paymentsExample: 'An unhandled exception occurs while processing a payment.',
    clientAction: 'Retry with backoff; escalate if it persists.',
  },
  {
    code: 501, reason: 'Not Implemented', class: '5xx',
    responseHeaders: [],
    summary: 'The server does not support the functionality required to fulfill the request.',
    paymentsExample: 'Calling a method/endpoint not yet implemented in a given gateway API version.',
    clientAction: 'Do not retry; use a supported operation.',
  },
  {
    code: 502, reason: 'Bad Gateway', class: '5xx',
    responseHeaders: [],
    summary: 'An upstream server returned an invalid response.',
    paymentsExample: 'The gateway\'s call to the card issuer/acquirer failed upstream.',
    clientAction: 'Retry with backoff; the failure is upstream, not in your request.',
  },
  {
    code: 503, reason: 'Service Unavailable', class: '5xx',
    responseHeaders: [{ name: 'Retry-After', value: '120' }],
    summary: 'The server is temporarily unable to handle requests (overload or maintenance).',
    paymentsExample: 'A gateway maintenance window during a deployment.',
    clientAction: 'Wait Retry-After seconds, then retry.',
  },
  {
    code: 504, reason: 'Gateway Timeout', class: '5xx',
    responseHeaders: [],
    summary: 'An upstream server did not respond in time.',
    paymentsExample: 'The card issuer took too long to authorize the transaction.',
    clientAction: 'Retry with backoff; consider checking transaction status first to avoid duplicates.',
  },
  {
    code: 505, reason: 'HTTP Version Not Supported', class: '5xx',
    responseHeaders: [],
    summary: 'The server does not support the HTTP version used in the request line.',
    paymentsExample: 'A legacy client sends HTTP/1.0 to an endpoint requiring HTTP/1.1+.',
    clientAction: 'Resend using a supported HTTP version.',
  },
];

const statusByCode = new Map(statusCatalog.map((s) => [s.code, s]));

export function getStatusInfo(code: number): StatusInfo {
  const info = statusByCode.get(code);
  if (!info) {
    throw new Error(`Unknown status code: ${code}`);
  }
  return info;
}

export function statusClassOf(code: number): StatusClass {
  return getStatusInfo(code).class;
}

const CLASS_COLORS: Record<StatusClass, string> = {
  '1xx': '#6b7280', // grey
  '2xx': '#16a34a', // green
  '3xx': '#2563eb', // blue
  '4xx': '#d97706', // amber
  '5xx': '#dc2626', // red
};

export function statusClassColor(statusClass: StatusClass): string {
  return CLASS_COLORS[statusClass];
}

// Status codes that never carry a body on the wire, regardless of scenario.
export const BODYLESS_STATUS_CODES = new Set([204, 304]);
