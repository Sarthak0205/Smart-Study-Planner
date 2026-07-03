const pinoHttp = require("pino-http");
const config = require("../../config/env");
const logger = require("../../config/logger");

const requestLogger = pinoHttp({
    logger,
    genReqId: req => req.id,
    customProps: req => ({
        requestId: req.id,
        userId: req.user?.id || null
    }),
    customSuccessMessage(req, res, responseTime) {
        const durationMs = Number(responseTime || 0);
        if (durationMs >= config.slowRequestMs) {
            return "slow request completed";
        }
        return "request completed";
    },
    customAttributeKeys: {
        responseTime: "durationMs"
    },
    customLogLevel(req, res, error) {
        if (error || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
    },
    serializers: {
        req(req) {
            return {
                id: req.id,
                method: req.method,
                url: req.url,
                remoteAddress: req.remoteAddress
            };
        },
        res(res) {
            return {
                statusCode: res.statusCode
            };
        }
    }
});

module.exports = requestLogger;
