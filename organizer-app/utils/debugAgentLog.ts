/**
 * Dev-only agent debug logging: writes NDJSON via Nitro (see server/api/debug/agent-log.post.ts).
 * Avoids cross-origin browser calls to the Cursor ingest server.
 */
export function debugAgentLog(entry: {
  hypothesisId: string
  location: string
  message: string
  data?: Record<string, unknown>
  runId?: string
}) {
  if (!import.meta.client) return
  void $fetch('/api/debug/agent-log', {
    method: 'POST',
    body: {
      sessionId: 'c78056',
      runId: entry.runId ?? 'pre-fix',
      hypothesisId: entry.hypothesisId,
      location: entry.location,
      message: entry.message,
      data: entry.data,
      timestamp: Date.now(),
    },
  }).catch(() => {})
}
