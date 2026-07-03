"use strict";

const { z } = require("zod");
const { paginationQuerySchema } = require("../../../shared/validation/common.schemas");

const planIdParams = z.object({
    id: z.coerce.number().int().positive()
});

const runIdParams = z.object({
    id: z.coerce.number().int().positive()
});

const generateScheduleSchema = z.object({
    params: planIdParams,
    body: z.object({
        dailyCapacityHours: z.coerce.number().positive().max(24).optional(),
        allowImpossible: z.boolean().optional(),
        forceRegenerate: z.boolean().optional(),
        today: z.string().date().optional()
    }).optional(),
    query: z.object({}).optional()
});

const activeScheduleSchema = z.object({
    params: z.object({}).optional(),
    body: z.object({}).optional(),
    query: z.object({
        planId: z.coerce.number().int().positive()
    })
});

const historySchema = z.object({
    params: z.object({}).optional(),
    body: z.object({}).optional(),
    query: paginationQuerySchema.extend({
        planId: z.coerce.number().int().positive().optional()
    })
});

const runDetailsSchema = z.object({
    params: runIdParams,
    body: z.object({}).optional(),
    query: z.object({}).optional()
});

module.exports = {
    generateScheduleSchema,
    activeScheduleSchema,
    historySchema,
    runDetailsSchema
};
