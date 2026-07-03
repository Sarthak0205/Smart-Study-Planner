const AppError = require("./AppError");
const { ERROR_CODES } = require("./errorCodes");

function badRequest(message, details = null) {
    return new AppError({
        message,
        code: ERROR_CODES.VALIDATION_ERROR,
        statusCode: 400,
        details
    });
}

function unauthorized(message = "Authentication required") {
    return new AppError({
        message,
        code: ERROR_CODES.UNAUTHORIZED,
        statusCode: 401
    });
}

function forbidden(message = "You do not have permission to perform this action") {
    return new AppError({
        message,
        code: ERROR_CODES.FORBIDDEN,
        statusCode: 403
    });
}

function notFound(message = "Resource not found") {
    return new AppError({
        message,
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404
    });
}

module.exports = {
    badRequest,
    unauthorized,
    forbidden,
    notFound
};
