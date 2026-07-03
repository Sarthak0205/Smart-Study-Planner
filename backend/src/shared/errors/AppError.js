const { ERROR_CODES } = require("./errorCodes");

class AppError extends Error {
    constructor({
        message,
        code = ERROR_CODES.INTERNAL_ERROR,
        statusCode = 500,
        details = null,
        isOperational = true
    }) {
        super(message);
        this.name = "AppError";
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
