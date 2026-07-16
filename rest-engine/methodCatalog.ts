import type { MethodInfo } from './types';

// Every example operates on the same imaginary resource so the differences between
// methods are the only thing changing: a collection at /orders and items at /orders/42.
export const methodCatalog: MethodInfo[] = [
  {
    method: 'GET',
    crud: 'Read',
    safe: true,
    idempotent: true,
    cacheable: true,
    requestBody: 'never',
    responseBody: 'typical',
    summary: 'Retrieve a representation of a resource or collection. Never changes server state.',
    whenToUse: 'Fetching a list of orders, or a single order by id, for display or further processing.',
    commonMistakes: [
      'Putting a request body on a GET — most servers and proxies ignore or reject it.',
      'Using GET for an action that changes state (e.g. "/orders/42/cancel") — that belongs on POST.',
      'Forgetting that GET responses can be cached, so stale data may be served unless headers say otherwise.',
    ],
    example: {
      title: 'Look up a single order',
      request: {
        line: 'GET /orders/42 HTTP/1.1',
        headers: ['Host: api.example.com', 'Accept: application/json'],
      },
      response: {
        line: 'HTTP/1.1 200 OK',
        headers: ['Content-Type: application/json', 'ETag: "a1b2c3"'],
        body: '{"id":42,"status":"paid","total":19.99}',
      },
      resourceBefore: '{"id":42,"status":"paid","total":19.99}',
      resourceAfter: '{"id":42,"status":"paid","total":19.99}',
      narrative:
        'The client asks to read order 42. The server returns its current representation unchanged — a GET never modifies anything, so "before" and "after" are identical.',
    },
  },
  {
    method: 'POST',
    crud: 'Create',
    safe: false,
    idempotent: false,
    cacheable: false,
    requestBody: 'typical',
    responseBody: 'typical',
    summary: 'Submit data to be processed by the target resource — most often to create a new subordinate resource.',
    whenToUse: 'Creating a new order under the /orders collection; the server decides the new id.',
    commonMistakes: [
      'Retrying a failed POST without an idempotency key — you may create the same order twice.',
      'Using POST for an update just because PUT/PATCH "feel unfamiliar".',
      'Assuming the response has no body — POST responses usually return the created resource.',
    ],
    example: {
      title: 'Create a new order',
      request: {
        line: 'POST /orders HTTP/1.1',
        headers: ['Host: api.example.com', 'Content-Type: application/json', 'Content-Length: 32'],
        body: '{"sku":"MUG-01","quantity":2}',
      },
      response: {
        line: 'HTTP/1.1 201 Created',
        headers: ['Content-Type: application/json', 'Location: /orders/43'],
        body: '{"id":43,"status":"pending","sku":"MUG-01","quantity":2}',
      },
      resourceBefore: null,
      resourceAfter: '{"id":43,"status":"pending","sku":"MUG-01","quantity":2}',
      narrative:
        'Order 43 does not exist yet. The client POSTs the order details to the collection URL /orders; the server assigns id 43, creates the resource, and returns 201 Created with a Location header pointing at the new resource.',
    },
  },
  {
    method: 'PUT',
    crud: 'Update',
    safe: false,
    idempotent: true,
    cacheable: false,
    requestBody: 'typical',
    responseBody: 'optional',
    summary: 'Replace a resource entirely with the representation supplied — every field, not just the changed ones.',
    whenToUse: 'Overwriting the whole order 42 with a complete new representation, e.g. from an edit form that submits every field.',
    commonMistakes: [
      'Sending only the changed fields on a PUT — fields you omit may be reset to defaults or removed.',
      'Assuming PUT always creates — it updates an existing resource at a known URL (it MAY create if the URL does not exist, but that is the exception, not the rule).',
      'Treating PUT as non-idempotent — sending the same PUT twice must leave the resource in the same state as sending it once.',
    ],
    example: {
      title: 'Replace an existing order',
      request: {
        line: 'PUT /orders/42 HTTP/1.1',
        headers: ['Host: api.example.com', 'Content-Type: application/json', 'Content-Length: 48'],
        body: '{"status":"paid","sku":"MUG-01","quantity":3}',
      },
      response: {
        line: 'HTTP/1.1 200 OK',
        headers: ['Content-Type: application/json'],
        body: '{"id":42,"status":"paid","sku":"MUG-01","quantity":3}',
      },
      resourceBefore: '{"id":42,"status":"paid","sku":"MUG-01","quantity":2}',
      resourceAfter: '{"id":42,"status":"paid","sku":"MUG-01","quantity":3}',
      narrative:
        'The client sends the FULL new representation of order 42 (status, sku, and quantity all included). The server replaces the entire stored resource with what it received — quantity changes from 2 to 3. Sending this same request again produces the exact same end state.',
    },
  },
  {
    method: 'PATCH',
    crud: 'Partial update',
    safe: false,
    idempotent: false,
    cacheable: false,
    requestBody: 'typical',
    responseBody: 'optional',
    summary: 'Apply a partial modification to a resource — only the fields included are touched.',
    whenToUse: 'Changing just the quantity on order 42 without resending status or sku.',
    commonMistakes: [
      'Assuming PATCH is always idempotent — a PATCH like "increment quantity by 1" is not, even though "set quantity to 3" would be.',
      'Sending a full resource body on PATCH — that is what PUT is for; PATCH should describe a delta.',
      'Forgetting servers may expect a specific patch format (JSON Merge Patch, JSON Patch) rather than an arbitrary partial object.',
    ],
    example: {
      title: 'Change one field on an order',
      request: {
        line: 'PATCH /orders/42 HTTP/1.1',
        headers: ['Host: api.example.com', 'Content-Type: application/merge-patch+json', 'Content-Length: 16'],
        body: '{"quantity":3}',
      },
      response: {
        line: 'HTTP/1.1 200 OK',
        headers: ['Content-Type: application/json'],
        body: '{"id":42,"status":"paid","sku":"MUG-01","quantity":3}',
      },
      resourceBefore: '{"id":42,"status":"paid","sku":"MUG-01","quantity":2}',
      resourceAfter: '{"id":42,"status":"paid","sku":"MUG-01","quantity":3}',
      narrative:
        'The client only sends the one field that changed: quantity. The server merges it into the existing resource, leaving status and sku untouched — contrast with PUT, which required the whole object.',
    },
  },
  {
    method: 'DELETE',
    crud: 'Delete',
    safe: false,
    idempotent: true,
    cacheable: false,
    requestBody: 'never',
    responseBody: 'optional',
    summary: 'Remove the resource identified by the URL.',
    whenToUse: 'Cancelling/removing order 42 permanently.',
    commonMistakes: [
      'Expecting a 404 on the second DELETE to mean "it failed" — idempotently, the resource is gone either way; many APIs still return 404 for the repeat, which is fine as long as the end state is consistent.',
      'Putting a request body on DELETE to specify "what" to delete — the URL alone should identify the resource.',
      'Using DELETE for a soft-cancel that should really be a PATCH (e.g. {"status":"cancelled"}) if the record must be kept for audit.',
    ],
    example: {
      title: 'Remove an order',
      request: {
        line: 'DELETE /orders/42 HTTP/1.1',
        headers: ['Host: api.example.com'],
      },
      response: {
        line: 'HTTP/1.1 204 No Content',
        headers: [],
      },
      resourceBefore: '{"id":42,"status":"paid","sku":"MUG-01","quantity":3}',
      resourceAfter: null,
      narrative:
        'The client asks the server to delete order 42. The server removes it and returns 204 No Content — success, with nothing to return because there is no resource left to describe.',
    },
  },
  {
    method: 'HEAD',
    crud: 'Metadata only',
    safe: true,
    idempotent: true,
    cacheable: true,
    requestBody: 'never',
    responseBody: 'never',
    summary: 'Identical to GET, but the server sends only the headers — never a body.',
    whenToUse: 'Checking whether order 42 exists, or whether it changed (via ETag/Last-Modified), without downloading it.',
    commonMistakes: [
      'Expecting a body — HEAD responses are headers only, even if the matching GET would return one.',
      'Forgetting Content-Length on a HEAD response still reports the size the GET body WOULD be.',
      'Using HEAD to check existence when the API does not implement it — fall back to a cheap GET if HEAD 404s unexpectedly on a server that never wired it up.',
    ],
    example: {
      title: 'Check if an order exists and has changed',
      request: {
        line: 'HEAD /orders/42 HTTP/1.1',
        headers: ['Host: api.example.com'],
      },
      response: {
        line: 'HTTP/1.1 200 OK',
        headers: ['Content-Type: application/json', 'Content-Length: 42', 'ETag: "a1b2c3"'],
      },
      resourceBefore: '{"id":42,"status":"paid","sku":"MUG-01","quantity":3}',
      resourceAfter: '{"id":42,"status":"paid","sku":"MUG-01","quantity":3}',
      narrative:
        'The client wants to know the order exists and get its ETag, without paying the cost of downloading the body. The server responds exactly as it would to GET, minus the body.',
    },
  },
  {
    method: 'OPTIONS',
    crud: 'Discovery',
    safe: true,
    idempotent: true,
    cacheable: false,
    requestBody: 'never',
    responseBody: 'optional',
    summary: 'Ask what operations are allowed on a resource, without performing any of them. Browsers also send this automatically before certain cross-origin requests (a CORS "preflight").',
    whenToUse: 'A browser-based client checks whether a cross-origin POST to /orders will be allowed before actually sending it.',
    commonMistakes: [
      'Hand-writing an OPTIONS call in application code — it is almost always sent automatically by the browser, not by your JS.',
      'Forgetting the server must answer OPTIONS itself with the right Access-Control-Allow-* headers, or the browser blocks the real request entirely.',
      'Assuming OPTIONS is only about CORS — it is also a general "what can I do here" discovery method (see the Allow header).',
    ],
    example: {
      title: 'CORS preflight for a cross-origin POST',
      request: {
        line: 'OPTIONS /orders HTTP/1.1',
        headers: [
          'Host: api.example.com',
          'Origin: https://shop.example.com',
          'Access-Control-Request-Method: POST',
          'Access-Control-Request-Headers: Content-Type',
        ],
      },
      response: {
        line: 'HTTP/1.1 204 No Content',
        headers: [
          'Access-Control-Allow-Origin: https://shop.example.com',
          'Access-Control-Allow-Methods: GET, POST, PATCH, DELETE',
          'Access-Control-Allow-Headers: Content-Type',
        ],
      },
      resourceBefore: null,
      resourceAfter: null,
      narrative:
        'Before the browser lets client-side JS send a cross-origin POST with a JSON body, it automatically asks permission with OPTIONS. The server answers with which origins/methods/headers are allowed. No order is created or touched by this exchange — it is purely a permission check.',
    },
  },
];

const methodByName = new Map(methodCatalog.map((m) => [m.method, m]));

export function getMethodInfo(method: string): MethodInfo {
  const info = methodByName.get(method.toUpperCase() as MethodInfo['method']);
  if (!info) throw new Error(`Unknown HTTP method: ${method}`);
  return info;
}
