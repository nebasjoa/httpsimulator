import type { GlossaryTerm } from './types';

export const glossary: GlossaryTerm[] = [
  {
    term: 'REST',
    definition:
      'REpresentational State Transfer — an architectural style for APIs built on: resources identified by URLs, a small fixed set of methods (GET/POST/PUT/PATCH/DELETE...) applied to them, and stateless requests that carry everything the server needs to process them.',
    seeAlso: ['Resource', 'Statelessness'],
  },
  {
    term: 'Resource',
    definition: 'A "thing" the API exposes, addressed by a URL — e.g. the collection /orders, or a single item /orders/42.',
    seeAlso: ['Collection vs item'],
  },
  {
    term: 'Collection vs item',
    definition:
      'A collection URL (e.g. /orders) represents the set of all orders; an item URL (e.g. /orders/42) represents exactly one. GET on a collection returns a list; GET on an item returns one object.',
  },
  {
    term: 'Endpoint',
    definition: 'One specific combination of an HTTP method and a URL path that the API responds to, e.g. "POST /orders" or "GET /orders/{id}".',
  },
  {
    term: 'CRUD',
    definition: 'Create, Read, Update, Delete — the four basic data operations, conventionally mapped to POST, GET, PUT/PATCH, and DELETE.',
  },
  {
    term: 'Idempotent',
    definition:
      'A request is idempotent if making it once has the same end effect as making it 5 times in a row. GET, PUT, and DELETE are idempotent by definition; POST generally is not (each call can create a new resource); PATCH depends on what it describes.',
    seeAlso: ['Safe method'],
  },
  {
    term: 'Safe method',
    definition: 'A method that never changes server state, no matter how many times it is called — GET, HEAD, and OPTIONS. Safe implies idempotent, but not the reverse.',
    seeAlso: ['Idempotent'],
  },
  {
    term: 'Statelessness',
    definition:
      'Each request must contain everything the server needs to understand and process it (credentials, parameters, etc). The server does not rely on memory of previous requests from the same client between calls.',
  },
  {
    term: 'Path parameter',
    definition: 'A variable segment embedded in the URL path itself, e.g. the "42" in /orders/42 — it identifies which specific resource you mean.',
    seeAlso: ['Query parameter'],
  },
  {
    term: 'Query parameter',
    definition:
      'A key=value pair appended to a URL after a "?", used to filter, page, sort, or otherwise modify a request without changing which resource/endpoint it targets, e.g. the status=paid in /orders?status=paid. Multiple pairs are joined with "&".',
    seeAlso: ['Path parameter'],
  },
  {
    term: 'Header',
    definition: 'A name: value line sent alongside a request or response, carrying metadata (content type, auth, caching rules) separately from the body.',
  },
  {
    term: 'Body / payload',
    definition: 'The actual data being sent with a request or returned with a response — a JSON object describing an order, for example — as opposed to the metadata carried in headers.',
  },
  {
    term: 'Content negotiation',
    definition: 'The client and server agreeing on a data format via the Accept (client → server, "I want JSON") and Content-Type (either direction, "this body IS JSON") headers.',
  },
  {
    term: 'Status code',
    definition: 'A 3-digit number in the response start line summarizing the outcome: 2xx success, 3xx redirect, 4xx client error, 5xx server error.',
  },
  {
    term: 'Authentication',
    definition: 'Proving who (or what) is making the request — "who are you?". Failure is 401 Unauthorized.',
    seeAlso: ['Authorization (access control)'],
  },
  {
    term: 'Authorization (access control)',
    definition: 'Deciding whether an already-identified caller is allowed to do this specific thing — "you are Alice, but Alice cannot delete this order". Failure is 403 Forbidden.',
    seeAlso: ['Authentication'],
  },
  {
    term: 'Bearer token',
    definition: 'A credential string where mere possession ("bearing" it) is proof enough — the server does not re-verify a password, only the token itself.',
  },
  {
    term: 'Idempotency key',
    definition: 'A unique value the client generates and sends with a write request (often POST) so that if the client must retry after a timeout, the server can recognize the retry and avoid creating a duplicate resource.',
  },
  {
    term: 'Pagination',
    definition: 'Splitting a large collection response into pages, via parameters like page/limit or offset/limit, or an opaque cursor token.',
  },
  {
    term: 'HATEOAS',
    definition:
      'Hypermedia As The Engine Of Application State — a stricter form of REST where responses include links to the next valid actions (e.g. a "cancel" link on an order), so clients discover the API by following links rather than hardcoding URLs.',
  },
  {
    term: 'CORS',
    definition:
      'Cross-Origin Resource Sharing — the browser-enforced rule that JavaScript on one origin cannot read responses from another origin unless the server opts in via Access-Control-Allow-* headers, often checked first with an OPTIONS preflight.',
  },
  {
    term: 'Preflight request',
    definition: 'An automatic OPTIONS request the browser sends before certain cross-origin requests, asking permission before sending the real one.',
    seeAlso: ['CORS'],
  },
];
