"use strict";

const rateLimit = require("express-rate-limit");
const config = require("../../../config/env");
const AppError = require("../../../shared/errors/AppError");
const { ERROR_CODES } = require("../../../shared/errors/errorCodes");

const authRateLimiter = rateLimit({
    windowMs: config.rateLimit.authWindowMs,
    max: config.rateLimit.authMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler(req, res, next) {
        next(new AppError({
            message: "Too many authentication attempts. Please try again later.",
            code: ERROR_CODES.RATE_LIMITED,
            statusCode: 429
        }));
    }
});

module.exports = authRateLimiter;
