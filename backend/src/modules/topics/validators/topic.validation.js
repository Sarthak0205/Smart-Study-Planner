"use strict";

const { z } = require("zod");
const { TOPIC_STATUS } = require("../../../constants/enums");

const planIdParams = z.object({
    id: z.coerce.number().int().positive()
});

const topicParams = z.object({
    id: z.coerce.number().int().positive(),
    topicId: z.coerce.number().int().positive()
});

const topicPayload = z.object({
    name: z.string().trim().min(1).max(180),
    difficulty: z.coerce.number().min(1).max(5),
    estimatedHours: z.coerce.number().positive().max(1000),
    deadline: z.coerce.string().date(),
    position: z.coerce.number().int().min(0).optional()
});

const createTopicSchema = z.object({
    params: planIdParams,
    body: topicPayload,
    query: z.object({}).optional()
});

const updateTopicSchema = z.object({
    params: topicParams,
    body: topicPayload.partial().extend({
        status: z.enum(Object.values(TOPIC_STATUS)).optional()
    }).refine(body => Object.keys(body).length > 0, {
        message: "At least one field is required"
    }),
    query: z.object({}).optional()
});

const deleteTopicSchema = z.object({
    params: topicParams,
    body: z.object({}).optional(),
    query: z.object({}).optional()
});

const listTopicsSchema = z.object({
    params: planIdParams,
    body: z.object({}).optional(),
    query: z.object({
        status: z.enum(Object.values(TOPIC_STATUS)).optional()
    }).optional()
});

const reorderTopicsSchema = z.object({
    params: planIdParams,
    body: z.object({
        topicOrder: z.array(z.coerce.number().int().positive()).min(1)
    }),
    query: z.object({}).optional()
});

module.exports = {
    createTopicSchema,
    updateTopicSchema,
    deleteTopicSchema,
    listTopicsSchema,
    reorderTopicsSchema
};
