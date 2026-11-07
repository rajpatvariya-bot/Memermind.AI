export function notFound(_request, response) {
  response.status(404).json({ error: 'That endpoint does not exist.' });
}

export function errorHandler(error, _request, response, _next) {
  // body-parser reports malformed JSON with `type`/`status`, not `statusCode`.
  // Treat it as a bad request and return a stable message instead of a 500.
  const malformedJson = error?.type === 'entity.parse.failed';
  const statusCode = Number.isInteger(error.statusCode)
    ? error.statusCode
    : malformedJson ? 400 : 500;
  if (statusCode >= 500) console.error('[api error]', error.name || 'InternalError');
  response.status(statusCode).json({
    error: malformedJson
      ? 'The request body must contain valid JSON.'
      : statusCode >= 500 && !error.safeToExpose
        ? 'The server could not complete that request. Please try again.'
        : error.message,
  });
}

