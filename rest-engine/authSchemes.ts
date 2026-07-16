import type { AuthSchemeInfo } from './types';

// 401 vs 403 is the single most-confused pair in API auth, so every scheme
// spells out both rather than leaving 403 implicit.
const STANDARD_FAILURES = [
  { code: 401, reason: 'Unauthorized', meaning: 'No credentials were sent, or the ones sent are missing/invalid/expired. The server does not know who you are.' },
  { code: 403, reason: 'Forbidden', meaning: 'The server knows exactly who you are — your credentials are valid — but you are not allowed to do this. Re-sending the same credentials will never fix a 403.' },
];

export const authSchemes: AuthSchemeInfo[] = [
  {
    id: 'none',
    name: 'No authentication',
    headerExample: '(no Authorization header sent)',
    summary: 'The request carries no credentials at all. Fine for public, read-only endpoints; unsafe for anything that reads or writes private data.',
    howItWorks: 'The server treats the caller as anonymous. It either serves public data or rejects the request outright.',
    whenToUse: 'Public reference data, health checks, documentation endpoints.',
    pros: ['Nothing to implement, nothing to leak.'],
    cons: ['Anyone can call it — no way to attribute, rate-limit per-caller, or restrict access.'],
    failureCodes: [
      { code: 401, reason: 'Unauthorized', meaning: 'The endpoint actually requires credentials and none were sent.' },
    ],
  },
  {
    id: 'basic',
    name: 'Basic auth',
    headerExample: 'Authorization: Basic bWVyY2hhbnQ6c2VjcmV0',
    summary: 'A username and password, joined with a colon and Base64-encoded — NOT encrypted, just encoded. Anyone who can read the header can decode the password instantly.',
    howItWorks: '"merchant:secret" is Base64-encoded to "bWVyY2hhbnQ6c2VjcmV0" and sent on every single request. The server decodes it and checks the credentials each time.',
    whenToUse: 'Simple server-to-server calls over HTTPS where issuing tokens is overkill — never over plain HTTP, since Base64 is trivially reversible.',
    pros: ['Extremely simple — no token issuing/refresh flow needed.', 'Widely supported by HTTP libraries and tools out of the box.'],
    cons: ['Credentials travel on every request — a leaked log line leaks the password, not just a token.', 'No built-in expiry — a compromised password stays valid until manually changed.'],
    failureCodes: STANDARD_FAILURES,
  },
  {
    id: 'bearer',
    name: 'Bearer token',
    headerExample: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    summary: '"Bearer" means exactly what it says: whoever bears (holds) this token is treated as authenticated — the server does not re-check a password, only the token\'s validity and signature/expiry.',
    howItWorks: 'A token (often a JWT) is issued once, typically after a login or OAuth exchange, then attached to every subsequent request until it expires or is revoked.',
    whenToUse: 'Most modern JSON APIs — SPAs, mobile apps, and service-to-service calls that received a token from an auth server.',
    pros: ['The real password is never sent again after the initial exchange.', 'Tokens can carry an expiry and be scoped/short-lived, limiting blast radius if leaked.'],
    cons: ['Anyone who steals the token can use it until it expires — "bearer" means possession is enough, no proof of identity beyond that.', 'Revoking a single token before its expiry usually needs extra infrastructure (a blocklist or short TTLs).'],
    failureCodes: [
      ...STANDARD_FAILURES,
      { code: 401, reason: 'Unauthorized (expired)', meaning: 'A frequent special case: the token was valid once but its expiry has passed — the client should refresh it and retry.' },
    ],
  },
  {
    id: 'api-key',
    name: 'API key',
    headerExample: 'X-API-Key: sk_live_51Hh2xJ2...',
    summary: 'A long opaque string issued to a specific client/application, sent in a custom header (or occasionally a query parameter).',
    howItWorks: 'The server looks up the key and identifies which account/application it belongs to. There is usually no user identity attached — just an application identity.',
    whenToUse: 'Identifying and rate-limiting a calling application (not a specific end user) — analytics SDKs, server-to-server integrations, public data APIs with usage tiers.',
    pros: ['Simple to issue, rotate, and revoke per application.', 'Easy to rate-limit or bill per key.'],
    cons: ['Putting the key in a query string leaks it into server logs, browser history, and Referer headers — prefer a header.', 'Identifies an application, not a user — do not use it alone to authorize per-user data access.'],
    failureCodes: STANDARD_FAILURES,
  },
  {
    id: 'oauth2',
    name: 'OAuth 2.0 (delegated access)',
    headerExample: 'Authorization: Bearer ya29.a0AfH6SMC...',
    summary: 'Not a wire format itself — a protocol for one service to obtain a scoped Bearer token on behalf of a user, from an authorization server, without ever seeing the user\'s password.',
    howItWorks: 'The user authenticates with the authorization server (e.g. via a redirect + consent screen); the calling app receives a short-lived access token (and often a refresh token) scoped to specific permissions, then sends that token as a normal Bearer header.',
    whenToUse: '"Log in with X" flows, and any case where a third-party app needs limited access to a user\'s data without ever holding their password.',
    pros: ['The app never touches the user\'s actual password.', 'Access can be scoped narrowly ("read orders" but not "delete orders") and revoked independently of the user\'s login credentials.'],
    cons: ['Significantly more moving parts than a static key — authorization server, redirect flow, token refresh.', 'Easy to misconfigure scopes/redirect URIs in a way that leaks tokens.'],
    failureCodes: [
      ...STANDARD_FAILURES,
      { code: 403, reason: 'Forbidden (insufficient scope)', meaning: 'The token is valid and identifies a real user, but was never granted the scope this endpoint requires (e.g. token has "read" but the call needs "write").' },
    ],
  },
];

const authSchemeById = new Map(authSchemes.map((a) => [a.id, a]));

export function getAuthScheme(id: string): AuthSchemeInfo {
  const info = authSchemeById.get(id);
  if (!info) throw new Error(`Unknown auth scheme: ${id}`);
  return info;
}
