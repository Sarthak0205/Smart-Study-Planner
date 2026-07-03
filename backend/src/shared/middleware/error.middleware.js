const { UniqueConstraintError, ValidationError, DatabaseError } = require("sequelize");
const AppError = require("../errors/AppError");
const { ERROR_CODES } = require("../errors/errorCodes");
const { errorResponse } = require("../responses/apiResponse");
const config = require("../../config/env");
const logger = require("../../config/logger");

function normalizeError(error) {
    if (error instanceof AppError) {
        return error;
    }

    if (error instanceof UniqueConstraintError) {
        return new AppError({
            message: "A record with the same unique value already exists",
            code: ERROR_CODES.VALIDATION_ERROR,
            statusCode: 409,
            details: error.errors?.map(item => ({
                path: item.path,
                message: item.message
            })) || null
        });
    }

    if (error instanceof ValidationError) {
        return new AppError({
            message: "Database validation failed",
            code: ERROR_CODES.VALIDATION_ERROR,
            statusCode: 400,
            details: error.errors?.map(item => ({
                path: item.path,
                message: item.message
            })) || null
        });
    }

    if (error instanceof DatabaseError) {
        return new AppError({
            message: "Database operation failed",
            code: ERROR_CODES.DATABASE_ERROR,
            statusCode: 500,
            details: config.isProduction ? null : error.message
        });
    }

    return new AppError({
        message: config.isProduction ? "Internal server error" : error.message,
        code: ERROR_CODES.INTERNAL_ERROR,
        statusCode: 500,
        details: null,
        isOperational: false
    });
}

function errorMiddleware(error, req, res, next) {
    const normalizedError = normalizeError(error);

    logger[normalizedError.statusCode >= 500 ? "error" : "warn"]({
        err: error,
        requestId: req.id,
        code: normalizedError.code,
        statusCode: normalizedError.statusCode
    }, normalizedError.message);

    return errorResponse(res, normalizedError);
}

module.exports = errorMiddleware;
