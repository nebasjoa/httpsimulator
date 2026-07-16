import type { BestPractice } from './types';

export const bestPractices: BestPractice[] = [
  {
    title: 'Name resources with plural nouns, not verbs',
    description: 'The URL identifies a thing, not an action — the HTTP method already supplies the verb.',
    good: 'POST /orders   (create an order)',
    bad: 'POST /createOrder',
  },
  {
    title: 'Use nesting to express relationships, sparingly',
    description: 'One level of nesting shows ownership clearly; going deeper makes URLs brittle and hard to reuse.',
    good: 'GET /orders/42/items',
    bad: 'GET /customers/7/orders/42/items/3/details/full',
  },
  {
    title: 'Let status codes carry meaning — do not bury errors in 200 bodies',
    description: 'A client (or a proxy, cache, or monitoring tool) should be able to tell success from failure without parsing the body.',
    good: '404 Not Found with {"error":"order not found"}',
    bad: '200 OK with {"success":false,"error":"order not found"}',
  },
  {
    title: 'Version your API explicitly',
    description: 'Breaking changes are inevitable; a visible version lets old clients keep working while new ones move forward.',
    good: '/v1/orders  or  Accept: application/vnd.example.v1+json',
    bad: '/orders  (with silent breaking changes over time)',
  },
  {
    title: 'Make writes idempotent with a client-supplied key',
    description: 'Networks retry. Without an idempotency key, a retried POST after a timeout can create the same order twice.',
    good: 'POST /orders with header Idempotency-Key: 6c1f...',
    bad: 'POST /orders relying on the client to "just not retry"',
  },
  {
    title: 'Paginate large collections by default',
    description: 'An unbounded GET /orders will eventually return millions of rows and take the server down with it.',
    good: 'GET /orders?page=1&limit=50  with a documented max limit',
    bad: 'GET /orders  returning every row that has ever existed',
  },
  {
    title: 'Prefer headers over query strings for credentials',
    description: 'Query strings end up in server access logs, browser history, and Referer headers — headers do not.',
    good: 'Authorization: Bearer <token>',
    bad: 'GET /orders?api_key=sk_live_51Hh2xJ2...',
  },
  {
    title: 'Use PATCH for partial updates, PUT for full replacement',
    description: 'Mixing these up causes accidental data loss when a client sends a partial body to an endpoint expecting a full one.',
    good: 'PATCH /orders/42 {"quantity":3}',
    bad: 'PUT /orders/42 {"quantity":3}   (silently wipes status and sku)',
  },
  {
    title: 'Return the created resource (and its location) from POST',
    description: 'The client almost always needs the server-assigned id right away.',
    good: '201 Created, Location: /orders/43, body includes "id":43',
    bad: '200 OK with an empty body, leaving the client to guess the new id',
  },
  {
    title: 'Never put sensitive data in the URL',
    description: 'URLs are logged everywhere — proxies, browser history, analytics — that headers and bodies are not.',
    good: 'Authorization header for tokens, JSON body for card data',
    bad: '/checkout?card_number=4111111111111111',
  },
];
