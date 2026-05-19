/** Debug session logging (NDJSON ingest). Do not log secrets or PII. */
export function agentLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = "pre-fix"
) {
  // #region agent log
  fetch("http://127.0.0.1:7538/ingest/bbf4341e-7504-4c02-ad58-731bb7baf8c4", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c17155" },
    body: JSON.stringify({
      sessionId: "c17155",
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion
}
