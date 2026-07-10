export interface HeaderInfo {
  name: string;
  summary: string;
  example: string;
  context?: string;
}

export const headerCatalog: HeaderInfo[] = [
  {
    name: 'Host',
    summary: 'The domain (and port, if non-default) the request is addressed to. Required on every HTTP/1.1 request.',
    example: 'Host: pay.computop.com',
    context: 'Lets one IP/server serve multiple merchant domains via virtual hosting.',
  },
  {
    name: 'Content-Type',
    summary: 'The media type of the request or response body.',
    example: 'Content-Type: application/x-www-form-urlencoded',
    context: 'The Computop KVP API expects form-encoded POST bodies, not JSON.',
  },
  {
    name: 'Content-Length',
    summary: 'The body size in bytes (not characters - UTF-8 multi-byte characters count as more than one).',
    example: 'Content-Length: 47',
    context: 'A mismatched Content-Length on a payment POST will hang or truncate the request.',
  },
  {
    name: 'Authorization',
    summary: 'Credentials for authenticating the request, e.g. a Basic or Bearer token.',
    example: 'Authorization: Basic bWVyY2hhbnQ6c2VjcmV0',
    context: 'Some gateway APIs use this instead of (or alongside) an API key in the body.',
  },
  {
    name: 'User-Agent',
    summary: 'Identifies the client software making the request.',
    example: 'User-Agent: Mozilla/5.0 (compatible; MerchantServer/1.0)',
  },
  {
    name: 'Accept',
    summary: 'The media type(s) the client is willing to receive in the response.',
    example: 'Accept: application/json',
  },
  {
    name: 'Connection',
    summary: 'Controls whether the underlying TCP connection stays open (keep-alive) or closes after the response.',
    example: 'Connection: keep-alive',
  },
  {
    name: 'Location',
    summary: 'On a 3xx response, the URL to redirect to; on 201, the URL of the newly created resource.',
    example: 'Location: https://pay.computop.com/paymentpage?id=abc',
    context: 'Merchant server redirects use this to send the shopper to the hosted payment page.',
  },
  {
    name: 'Set-Cookie',
    summary: 'Server asks the client to store a cookie, sent back on subsequent requests to this origin.',
    example: 'Set-Cookie: sessionid=abc123; Secure; HttpOnly',
    context: 'The hosted payment page uses this to track the shopper\'s session across the 3DS redirect.',
  },
  {
    name: 'Cookie',
    summary: 'Cookies the client is sending back to the server, as previously set via Set-Cookie.',
    example: 'Cookie: sessionid=abc123',
  },
  {
    name: 'Cache-Control',
    summary: 'Directives for how the request/response may be cached.',
    example: 'Cache-Control: no-store',
    context: 'Payment pages should typically use no-store to keep sensitive data out of caches.',
  },
  {
    name: 'ETag',
    summary: 'An opaque identifier for a specific version of a resource, used for conditional requests.',
    example: 'ETag: "33a64df551"',
  },
  {
    name: 'If-None-Match',
    summary: 'Client sends the ETag it already has; server replies 304 if it still matches.',
    example: 'If-None-Match: "33a64df551"',
    context: 'Used for conditional GETs on rarely-changing config or status resources.',
  },
  {
    name: 'WWW-Authenticate',
    summary: 'Sent with a 401 to tell the client what authentication scheme is required.',
    example: 'WWW-Authenticate: Basic realm="KVP"',
  },
  {
    name: 'Retry-After',
    summary: 'Tells the client how long to wait before retrying, in seconds or as an HTTP-date.',
    example: 'Retry-After: 30',
    context: 'Seen on 429 (rate limiting) and 503 (maintenance) from gateway APIs.',
  },
  {
    name: 'Allow',
    summary: 'Sent with a 405 to list the methods the resource does support.',
    example: 'Allow: GET, POST',
  },
  {
    name: 'Server',
    summary: 'Identifies the server software handling the request.',
    example: 'Server: nginx/1.25',
  },
  {
    name: 'Date',
    summary: 'The date and time the response was generated.',
    example: 'Date: Fri, 10 Jul 2026 10:00:00 GMT',
  },
  {
    name: 'Access-Control-Allow-Origin',
    summary: 'CORS: which origin(s) may read this response from a cross-origin browser request.',
    example: 'Access-Control-Allow-Origin: https://shop.example.com',
    context: 'Needed when a merchant\'s storefront JS calls the gateway API cross-origin.',
  },
  {
    name: 'Access-Control-Request-Method',
    summary: 'CORS preflight: the method the actual request intends to use.',
    example: 'Access-Control-Request-Method: POST',
    context: 'Sent by the browser on the OPTIONS preflight before a cross-origin payment POST.',
  },
];

const headerByName = new Map(headerCatalog.map((h) => [h.name.toLowerCase(), h]));

export function getHeaderInfo(name: string): HeaderInfo | undefined {
  return headerByName.get(name.toLowerCase());
}
