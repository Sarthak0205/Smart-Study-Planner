const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const config = require("../../config/env");
const AppError = require("../errors/AppError");
const { ERROR_CODES } = require("../errors/errorCodes");

function buildCorsOptions() {
    return {
        origin(origin, callback) {
            if (!origin || config.corsOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new AppError({
                message: "Origin is not allowed by CORS policy",
                code: ERROR_CODES.FORBIDDEN,
                statusCode: 403
            }));
        },
        credentials: true
    };
}

const apiRateLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler(req, res, next) {
        next(new AppError({
            message: "Too many requests. Please try again later.",
            code: ERROR_CODES.RATE_LIMITED,
            statusCode: 429
        }));
    }
});

function applySecurityMiddleware(app) {
    app.disable("x-powered-by");
    app.set("trust proxy", 1);
    app.use(helmet());
    app.use(cors(buildCorsOptions()));
    app.use(apiRateLimiter);
}

module.exports = {
    applySecurityMiddleware
};
