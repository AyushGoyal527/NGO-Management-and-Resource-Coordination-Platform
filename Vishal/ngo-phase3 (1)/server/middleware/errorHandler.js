exports.notFound = (req, res) =>
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });

// Centralized error handling. Never leaks stack traces or internals in production.
exports.errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let status = err.statusCode || 500;
  let message = err.isOperational ? err.message : 'Something went wrong on our side';

  if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors)[0].message; }
  else if (err.name === 'CastError') { status = 400; message = `Invalid ${err.path}`; }
  else if (err.code === 11000) { status = 409; message = `${Object.keys(err.keyValue || {})[0] || 'Value'} already exists`; }
  else if (err.name === 'MulterError') { status = 400; message = err.message; }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Invalid JSON body'; }

  if (status >= 500) console.error(err);
  res.status(status).json({ success: false, message });
};
