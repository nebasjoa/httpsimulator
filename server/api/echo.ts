import { BODYLESS_STATUS_CODES, getStatusInfo } from '../../engine/statusCatalog';

// GET/POST /api/echo?status=302
// Returns the requested status, echoes what the server actually received,
// and attaches scenario-appropriate headers pulled from the status catalog.
export default defineEventHandler(async (event) => {
  const status = Number(getQuery(event).status ?? 200);
  const method = getMethod(event);

  const received = {
    method,
    path: event.path,
    headers: getRequestHeaders(event),
    body: ['POST', 'PUT', 'PATCH'].includes(method)
      ? await readRawBody(event)
      : undefined,
  };

  setResponseStatus(event, status);

  let info;
  try {
    info = getStatusInfo(status);
  } catch {
    info = undefined;
  }

  if (info) {
    for (const header of info.responseHeaders) {
      setResponseHeader(event, header.name, header.value);
    }
  }

  if (BODYLESS_STATUS_CODES.has(status) || method === 'HEAD') {
    return null;
  }

  return { status, received };
});
