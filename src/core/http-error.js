'use strict';
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
const httpError = (status, message, details) => new HttpError(status, message, details);
module.exports = { HttpError, httpError };
