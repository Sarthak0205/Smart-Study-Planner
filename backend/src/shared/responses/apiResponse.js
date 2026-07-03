function successResponse(res, data = null, meta = null, statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        data,
        meta
    });
}

function createdResponse(res, data = null, meta = null) {
    return successResponse(res, data, meta, 201);
}

function errorResponse(res, error) {
    return res.status(error.statusCode || 500).json({
        success: false,
        error: {
            code: error.code,
            message: error.message,
            details: error.details || null
        }
    });
}

function paginationMeta({ page, limit, total }) {
    const numericPage = Number(page);
    const numericLimit = Number(limit);
    const numericTotal = Number(total);

    return {
        page: numericPage,
        limit: numericLimit,
        total: numericTotal,
        totalPages: numericLimit > 0 ? Math.ceil(numericTotal / numericLimit) : 0
    };
}

module.exports = {
    successResponse,
    createdResponse,
    errorResponse,
    paginationMeta
};
