"use strict";

const { z } = require("zod");
const {
    DIFFICULTY_FEEDBACK,
    SESSION_EFFECTIVENESS,
    PERCEIVED_WORKLOAD
} = require("../../../constants/enums");

const scheduleItemParams = z.object({
    id: z.coerce.number().int().positive()
});

const topicParams = z.object({
    id: z.coerce.number().int().positive()
});

const planQuery = z.object({
    planId: z.coerce.number().int().positive()
});

const submitStudyLogSchema = z.object({
    params: scheduleItemParams,
    body: z.object({
        hoursStudied: z.coerce.number().positive().max(24),
        difficultyFeedback: z.enum(Object.values(DIFFICULTY_FEEDBACK)).optional(),
        sessionEffectiveness: z.enum(Object.values(SESSION_EFFECTIVENESS)).optional(),
        perceivedWorkload: z.enum(Object.values(PERCEIVED_WORKLOAD)).optional(),
        completedAt: z.coerce.date().optional()
    }),
    query: z.object({}).optional()
});

const planExecutionQuerySchema = z.object({
    params: z.object({}).optional(),
    body: z.object({}).optional(),
    query: planQuery
});

const topicProgressSchema = z.object({
    params: topicParams,
    body: z.object({}).optional(),
    query: z.object({}).optional()
});

module.exports = {
    submitStudyLogSchema,
    planExecutionQuerySchema,
    topicProgressSchema
};
