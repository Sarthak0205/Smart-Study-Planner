const { randomUUID } = require("crypto");

function requestContext(req, res, next) {
    const incomingRequestId = req.headers["x-request-id"];
    const requestId = Array.isArray(incomingRequestId)
        ? incomingRequestId[0]
        : incomingRequestId || randomUUID();

    req.id = requestId;
    req.context = {
        requestId,
        userId: null,
        role: null
    };
    res.setHeader("X-Request-Id", requestId);
    next();
}

module.exports = requestContext;
