// RETIRED - this old endpoint is permanently switched off.
// It used to pass any request through to the Anthropic API with no
// model or size limits, which was a cost and security risk.
// Everything now goes through the protected edge function at /api/claude
// (see netlify/edge-functions/claude.js).
exports.handler = async () => {
  return {
    statusCode: 410,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: { message: 'This endpoint has been retired.' } })
  };
};
