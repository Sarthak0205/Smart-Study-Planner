const { z } = require("zod");

const idParamSchema = z.object({
    params: z.object({
        id: z.coerce.number().int().positive()
    })
});

const paginationQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sort: z.string().optional()
});

module.exports = {
    idParamSchema,
    paginationQuerySchema
};
