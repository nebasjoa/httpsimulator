import type { QueryParamExample } from './types';

// Each example is a full URL so the query string's position (after ? , joined by &)
// is visible in context, not just the parameter in isolation.
export const queryParamExamples: QueryParamExample[] = [
  {
    id: 'filter',
    url: '/orders?status=paid',
    paramName: 'status',
    paramValue: 'paid',
    purpose: 'Filtering',
    explanation:
      'Narrows a collection to items matching a condition. "?status=paid" asks the server to return only orders whose status field equals "paid" — the collection itself is still /orders, this just filters which members come back.',
  },
  {
    id: 'pagination',
    url: '/orders?page=2&limit=25',
    paramName: 'page / limit',
    paramValue: '2 / 25',
    purpose: 'Pagination',
    explanation:
      'Splits a large collection into pages. "page=2&limit=25" asks for the second page of 25 results (items 26–50). Some APIs use "offset/limit" or opaque cursor tokens instead — same idea, different mechanics.',
  },
  {
    id: 'sort',
    url: '/orders?sort=-createdAt',
    paramName: 'sort',
    paramValue: '-createdAt',
    purpose: 'Sorting',
    explanation:
      'Controls the order results are returned in. The leading "-" is a common convention for descending order, so "-createdAt" means newest first; "sort=createdAt" (no minus) would mean oldest first.',
  },
  {
    id: 'search',
    url: '/orders?q=mug',
    paramName: 'q',
    paramValue: 'mug',
    purpose: 'Search',
    explanation:
      'A free-text search term, conventionally named "q". Unlike a filter on an exact field, the server is expected to match this loosely against one or more searchable fields.',
  },
  {
    id: 'fields',
    url: '/orders/42?fields=id,status',
    paramName: 'fields',
    paramValue: 'id,status',
    purpose: 'Sparse fieldsets',
    explanation:
      'Asks the server to return only the listed fields instead of the full resource — useful for trimming payload size on mobile clients or high-frequency polling.',
  },
  {
    id: 'test',
    url: '/orders?parameter=test',
    paramName: 'parameter',
    paramValue: 'test',
    purpose: '(generic example)',
    explanation:
      'This is the generic shape every query parameter follows: a "?" marks the start of the query string, "parameter" is the key, "=" separates key from value, and "test" is the value. It means literally "pass the value test under the name parameter to the server" — what the server DOES with it depends entirely on that endpoint\'s implementation (it could filter, page, sort, toggle a mode, or be silently ignored if the server does not recognize the key). Multiple pairs are joined with "&", e.g. "?parameter=test&limit=10".',
  },
];

const queryParamById = new Map(queryParamExamples.map((q) => [q.id, q]));

export function getQueryParamExample(id: string): QueryParamExample {
  const info = queryParamById.get(id);
  if (!info) throw new Error(`Unknown query param example: ${id}`);
  return info;
}
