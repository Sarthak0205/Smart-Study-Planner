"use strict";

const { z } = require("zod");
const { USER_ROLES } = require("../../../constants/enums");

const registerSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1).max(120),
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(128),
        role: z.enum([USER_ROLES.STUDENT, USER_ROLES.TEACHER]).optional()
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional()
});

const loginSchema = z.object({
    body: z.object({
        email: z.string().trim().email().max(255),
        password: z.string().min(1).max(128)
    }),
    query: z.object({}).optional(),
    params: z.object({}).optional()
});

const refreshSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(20).optional()
    }).optional(),
    query: z.object({}).optional(),
    params: z.object({}).optional()
});

const logoutSchema = refreshSchema;

module.exports = {
    registerSchema,
    loginSchema,
    refreshSchema,
    logoutSchema
};
