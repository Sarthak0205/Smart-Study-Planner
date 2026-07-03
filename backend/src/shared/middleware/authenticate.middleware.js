"use strict";

const jwt = require("jsonwebtoken");
const AppError = require("../errors/AppError");
const { ERROR_CODES } = require("../errors/errorCodes");
const { verifyAccessToken } = require("../../modules/auth/utils/token.util");

function getBearerToken(req) {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
        return null;
    }

    return token;
}

function authenticate(req, res, next) {
    const token = getBearerToken(req);

    if (!token) {
        return next(new AppError({
            message: "Access token is required",
            code: ERROR_CODES.UNAUTHORIZED,
            statusCode: 401
        }));
    }

    try {
        const payload = verifyAccessToken(token);

        if (payload.typ !== "access" || !payload.sub || !payload.role) {
            throw new Error("Invalid access token payload");
        }

        req.user = {
            id: payload.sub,
            role: payload.role
        };
        req.context = {
            ...(req.context || {}),
            userId: payload.sub,
            role: payload.role
        };

        return next();
    } catch (error) {
        const isExpired = error instanceof jwt.TokenExpiredError;

        return next(new AppError({
            message: isExpired ? "Access token has expired" : "Invalid access token",
            code: isExpired ? ERROR_CODES.EXPIRED_TOKEN : ERROR_CODES.INVALID_TOKEN,
            statusCode: 401
        }));
    }
}

module.exports = authenticate;
