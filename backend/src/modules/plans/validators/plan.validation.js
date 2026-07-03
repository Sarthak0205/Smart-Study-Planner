"use strict";

const { z } = require("zod");
const { PLAN_VISIBILITY } = require("../../../constants/enums");
const { paginationQuerySchema } = require("../../../shared/validation/common.schemas");

const planIdParams = z.object({
    id: z.coerce.number().int().positive()
});

const createPlanSchema = z.object({
    body: z.object({
        title: z.string().trim().min(1).max(180),
        description: z.string().trim().max(2000).optional(),
        visibility: z.enum([PLAN_VISIBILITY.PRIVATE, PLAN_VISIBILITY.PUBLIC]).optional()
    }),
    params: z.object({}).optional(),
    query: z.object({}).optional()
});

const updatePlanSchema = z.object({
    params: planIdParams,
    body: z.object({
        title: z.string().trim().min(1).max(180).optional(),
        description: z.string().trim().max(2000).nullable().optional(),
        visibility: z.enum([PLAN_VISIBILITY.PRIVATE, PLAN_VISIBILITY.PUBLIC]).optional()
    }).refine(body => Object.keys(body).length > 0, {
        message: "At least one field is required"
    }),
    query: z.object({}).optional()
});

const planIdSchema = z.object({
    params: planIdParams,
    body: z.object({}).optional(),
    query: z.object({}).optional()
});

const listPlansSchema = z.object({
    params: z.object({}).optional(),
    body: z.object({}).optional(),
    query: paginationQuerySchema.extend({
        status: z.enum(["draft", "published", "archived"]).optional(),
        visibility: z.enum([PLAN_VISIBILITY.PRIVATE, PLAN_VISIBILITY.PUBLIC]).optional()
    })
});

const publicPlansSchema = z.object({
    params: z.object({}).optional(),
    body: z.object({}).optional(),
    query: paginationQuerySchema.extend({
        search: z.string().trim().max(120).optional(),
        minDifficulty: z.coerce.number().min(1).max(5).optional(),
        maxDifficulty: z.coerce.number().min(1).max(5).optional(),
        minHours: z.coerce.number().positive().optional(),
        maxHours: z.coerce.number().positive().optional()
    })
});

module.exports = {
    createPlanSchema,
    updatePlanSchema,
    planIdSchema,
    listPlansSchema,
    publicPlansSchema
};
