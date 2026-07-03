const AppError = require("../errors/AppError");
const { ERROR_CODES } = require("../errors/errorCodes");

function formatZodIssues(error) {
    return error.issues.map(issue => ({
        path: issue.path.join("."),
        message: issue.message
    }));
}

function validateRequest(schema) {
    return function validationMiddleware(req, res, next) {
        const result = schema.safeParse({
            body: req.body,
            query: req.query,
            params: req.params
        });

        if (!result.success) {
            return next(new AppError({
                message: "Request validation failed",
                code: ERROR_CODES.VALIDATION_ERROR,
                statusCode: 400,
                details: formatZodIssues(result.error)
            }));
        }

        req.validated = result.data;
        return next();
    };
}

module.exports = validateRequest;
