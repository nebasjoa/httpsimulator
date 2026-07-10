// Pure, illustrative model of HTTP/1.1 vs HTTP/2 framing - not tied to the playback
// engine or any scenario. Shows why HTTP/1.1 needs multiple TCP connections to avoid
// head-of-line blocking, while HTTP/2 multiplexes many requests as interleaved frames
// on a single connection.

export interface FrameBlock {
  requestIndex: number;
  startMs: number;
  durationMs: number;
}

export interface ConnectionLane {
  label: string;
  blocks: FrameBlock[];
}

export interface ProtocolComparison {
  requestCount: number;
  http1: ConnectionLane[];
  http2: ConnectionLane[];
  totalMs: { http1: number; http2: number };
}

// Browsers cap parallel connections per host at (historically) 6.
const MAX_HTTP1_CONNECTIONS = 6;
// How many frames each request is sliced into on the HTTP/2 connection, so the
// timeline shows genuine interleaving rather than requests just starting together.
const HTTP2_SLICES_PER_REQUEST = 5;

export function compareProtocols(requestCount: number, requestDurationMs = 400): ProtocolComparison {
  const n = Math.max(1, Math.floor(requestCount));

  // HTTP/1.1: requests round-robin across up to 6 connections; within a connection
  // requests are strictly serial (no pipelining), so extra requests queue.
  const laneCount = Math.min(MAX_HTTP1_CONNECTIONS, n);
  const http1Lanes: ConnectionLane[] = Array.from({ length: laneCount }, (_, i) => ({
    label: `Connection ${i + 1}`,
    blocks: [],
  }));
  for (let i = 0; i < n; i++) {
    const lane = http1Lanes[i % laneCount]!;
    const positionInLane = lane.blocks.length;
    lane.blocks.push({
      requestIndex: i,
      startMs: positionInLane * requestDurationMs,
      durationMs: requestDurationMs,
    });
  }
  const http1TotalMs = Math.max(...http1Lanes.map((lane) => lane.blocks.length * requestDurationMs));

  // HTTP/2: a single connection; every request is sliced into frames and the frames
  // are interleaved round-robin across all requests in flight.
  const sliceDuration = requestDurationMs / HTTP2_SLICES_PER_REQUEST;
  const totalSlots = n * HTTP2_SLICES_PER_REQUEST;
  const http2Lane: ConnectionLane = { label: 'Single connection (multiplexed)', blocks: [] };
  for (let slot = 0; slot < totalSlots; slot++) {
    http2Lane.blocks.push({
      requestIndex: slot % n,
      startMs: slot * sliceDuration,
      durationMs: sliceDuration,
    });
  }
  const http2TotalMs = totalSlots * sliceDuration;

  return {
    requestCount: n,
    http1: http1Lanes,
    http2: [http2Lane],
    totalMs: { http1: http1TotalMs, http2: http2TotalMs },
  };
}
