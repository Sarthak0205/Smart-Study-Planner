const { notFound } = require("../errors/httpErrors");

function notFoundMiddleware(req, res, next) {
    next(notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = notFoundMiddleware;
