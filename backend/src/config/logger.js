const pino = require("pino");
const config = require("./env");
const { BRANDING } = require("./branding");

const logger = pino({
    level: config.logLevel,
    base: {
        service: BRANDING.API_NAME,
        environment: config.nodeEnv
    },
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "password",
            "password_hash",
            "token",
            "accessToken",
            "refreshToken"
        ],
        censor: "[REDACTED]"
    },
    timestamp: pino.stdTimeFunctions.isoTime
});

module.exports = logger;
