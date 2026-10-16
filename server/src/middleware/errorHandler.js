/**
 * Central Error Handler Middleware
 */

function errorHandler(err, req, res, next) {
  console.error('[Global Error Handler]:', err.stack || err.message);

  // PostgreSQL Connection Errors
  if (err.code === 'ECONNREFUSED' || err.code === '28P01' || err.code === '3D000') {
    return res.status(503).json({
      success: false,
      error: 'PostgreSQL Database Connection Failure',
      details: 'The backend cannot establish a connection to the PostgreSQL database. Please ensure PostgreSQL server is active.',
      code: err.code,
    });
  }

  // PostgreSQL Constraint Violations
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'A duplicate record already exists in the database.',
    });
  }

  // Syntax or payload errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Malformed JSON payload in request body.',
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'An internal server error occurred. Please contact the administrator.' 
    : err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    success: false,
    error: message,
  });
}

function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
