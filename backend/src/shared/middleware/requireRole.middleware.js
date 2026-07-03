"use strict";

const AppError = require("../errors/AppError");
const { ERROR_CODES } = require("../errors/errorCodes");

function requireRole(...allowedRoles) {
    return function roleMiddleware(req, res, next) {
        if (!req.user) {
            return next(new AppError({
                message: "Authentication required",
                code: ERROR_CODES.UNAUTHORIZED,
                statusCode: 401
            }));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(new AppError({
                message: "Insufficient role permissions",
                code: ERROR_CODES.FORBIDDEN,
                statusCode: 403
            }));
        }

        return next();
    };
}

module.exports = requireRole;
