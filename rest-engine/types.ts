export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type BodyPolicy = 'never' | 'optional' | 'typical';

// A worked example for one method against one resource, shown as a before/after
// state change plus the actual request/response bytes a client would send/receive.
export interface MethodExample {
  title: string;                 // "Create a new order"
  request: {
    line: string;                // "POST /orders HTTP/1.1"
    headers: string[];
    body?: string;
  };
  response: {
    line: string;                // "HTTP/1.1 201 Created"
    headers: string[];
    body?: string;
  };
  resourceBefore: string | null; // JSON-ish snapshot of server state before, null if collection didn't exist / n-a
  resourceAfter: string | null;  // JSON-ish snapshot of server state after
  narrative: string;             // plain-English account of what happened, in order
}

export interface MethodInfo {
  method: HttpMethod;
  crud: 'Create' | 'Read' | 'Update' | 'Partial update' | 'Delete' | 'Metadata only' | 'Discovery' | 'None';
  safe: boolean;                 // does not modify server state
  idempotent: boolean;           // repeating the same call has the same effect as calling it once
  cacheable: boolean;
  requestBody: BodyPolicy;
  responseBody: BodyPolicy;
  summary: string;
  whenToUse: string;
  commonMistakes: string[];
  example: MethodExample;
}

export interface AuthFailureCode {
  code: number;
  reason: string;
  meaning: string;
}

export interface AuthSchemeInfo {
  id: string;
  name: string;
  headerExample: string;
  summary: string;
  howItWorks: string;
  whenToUse: string;
  pros: string[];
  cons: string[];
  failureCodes: AuthFailureCode[];
}

export interface QueryParamExample {
  id: string;
  url: string;
  paramName: string;
  paramValue: string;
  purpose: string;                // "Filtering" | "Pagination" | ...
  explanation: string;
}

export interface BestPractice {
  title: string;
  description: string;
  good: string;
  bad: string;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  seeAlso?: string[];
}
