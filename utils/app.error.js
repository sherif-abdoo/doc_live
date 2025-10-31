class AppError extends Error {
  constructor(message, statusCode, statusMessage) {
    super(message); // ✅ pass the message to the Error class
    this.statusCode = statusCode;
    this.statusMessage = statusMessage || (statusCode >= 500 ? 'error' : 'fail');
    Error.captureStackTrace(this, this.constructor);
  }

  // Optional: static factory
  static create(message, statusCode, statusMessage) {
    return new AppError(message, statusCode, statusMessage);
  }
}

module.exports = AppError;
