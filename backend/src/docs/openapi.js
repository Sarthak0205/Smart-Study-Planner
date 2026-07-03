"use strict";

const { BRANDING } = require("../config/branding");

const openApiDocument = {
    openapi: "3.0.3",
    info: {
        title: BRANDING.APP_NAME + " API",
        version: "1.0.0",
        description: `Backend API for ${BRANDING.APP_NAME}, an adaptive study planning platform with explainable deterministic scheduling.`
    },
    servers: [
        { url: "http://localhost:8000/api/v1", description: "Local development" }
    ],
    tags: [
        { name: "Auth" },
        { name: "Plans" },
        { name: "Topics" },
        { name: "Schedules" },
        { name: "Execution" },
        { name: "Health" }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT"
            }
        },
        schemas: {
            ErrorResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: false },
                    error: {
                        type: "object",
                        properties: {
                            code: { type: "string", example: "VALIDATION_ERROR" },
                            message: { type: "string" },
                            details: { nullable: true }
                        }
                    }
                }
            },
            SuccessResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    data: { type: "object" },
                    meta: { nullable: true }
                }
            },
            PaginationMeta: {
                type: "object",
                properties: {
                    page: { type: "integer" },
                    limit: { type: "integer" },
                    total: { type: "integer" },
                    totalPages: { type: "integer" }
                }
            },
            RegisterRequest: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                    name: { type: "string", example: "Sarthak" },
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                    role: { type: "string", enum: ["student", "teacher"], default: "student" }
                }
            },
            LoginRequest: {
                type: "object",
                required: ["email", "password"],
                properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" }
                }
            },
            PlanRequest: {
                type: "object",
                required: ["title"],
                properties: {
                    title: { type: "string", maxLength: 180 },
                    description: { type: "string", nullable: true },
                    visibility: { type: "string", enum: ["private", "public"], default: "private" }
                }
            },
            TopicRequest: {
                type: "object",
                required: ["name", "difficulty", "estimatedHours", "deadline"],
                properties: {
                    name: { type: "string" },
                    difficulty: { type: "number", minimum: 1, maximum: 5 },
                    estimatedHours: { type: "number", minimum: 0.01 },
                    deadline: { type: "string", format: "date" },
                    position: { type: "integer", minimum: 0 }
                }
            },
            GenerateScheduleRequest: {
                type: "object",
                properties: {
                    dailyCapacityHours: { type: "number", minimum: 0.01, maximum: 24 },
                    forceRegenerate: { type: "boolean" },
                    allowImpossible: { type: "boolean" },
                    today: { type: "string", format: "date" }
                }
            },
            StudyLogRequest: {
                type: "object",
                required: ["hoursStudied"],
                properties: {
                    hoursStudied: { type: "number", minimum: 0.01, maximum: 24 },
                    difficultyFeedback: { type: "string", enum: ["easy", "medium", "hard"] },
                    sessionEffectiveness: { type: "string", enum: ["low", "medium", "high"] },
                    perceivedWorkload: { type: "string", enum: ["light", "expected", "heavy"] },
                    completedAt: { type: "string", format: "date-time" }
                }
            }
        },
        responses: {
            Unauthorized: {
                description: "Missing, invalid, or expired token",
                content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
            },
            Forbidden: {
                description: "Authenticated user lacks role or ownership permissions",
                content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
            },
            ValidationError: {
                description: "Request validation failed",
                content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
            }
        }
    },
    paths: {
        "/health": {
            get: {
                tags: ["Health"],
                summary: "Liveness check",
                responses: { 200: { description: "API is alive" } }
            }
        },
        "/health/ready": {
            get: {
                tags: ["Health"],
                summary: "Readiness check including database connectivity",
                responses: { 200: { description: "API and database are ready" }, 503: { description: "Database unavailable" } }
            }
        },
        "/auth/register": {
            post: {
                tags: ["Auth"],
                summary: "Register a student or teacher account",
                requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } } } },
                responses: { 201: { description: "Registered" }, 400: { $ref: "#/components/responses/ValidationError" } }
            }
        },
        "/auth/login": {
            post: {
                tags: ["Auth"],
                summary: "Login and receive an access token",
                requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } } },
                responses: { 200: { description: "Authenticated" }, 401: { $ref: "#/components/responses/Unauthorized" } }
            }
        },
        "/auth/refresh": {
            post: {
                tags: ["Auth"],
                summary: "Rotate refresh token and issue a new access token",
                responses: { 200: { description: "Token refreshed" }, 401: { $ref: "#/components/responses/Unauthorized" } }
            }
        },
        "/auth/logout": {
            post: {
                tags: ["Auth"],
                summary: "Revoke refresh token or current user tokens",
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: "Logged out" } }
            }
        },
        "/auth/me": {
            get: {
                tags: ["Auth"],
                summary: "Get current authenticated user",
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: "Current user" }, 401: { $ref: "#/components/responses/Unauthorized" } }
            }
        },
        "/plans": {
            get: {
                tags: ["Plans"],
                summary: "List owned plans",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "page", in: "query", schema: { type: "integer", default: 1 } },
                    { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
                    { name: "status", in: "query", schema: { type: "string", enum: ["draft", "published", "archived"] } }
                ],
                responses: { 200: { description: "Owned plans" }, 401: { $ref: "#/components/responses/Unauthorized" } }
            },
            post: {
                tags: ["Plans"],
                summary: "Create a plan template",
                security: [{ bearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PlanRequest" } } } },
                responses: { 201: { description: "Plan created" }, 400: { $ref: "#/components/responses/ValidationError" } }
            }
        },
        "/plans/public": {
            get: {
                tags: ["Plans"],
                summary: "Discover public published teacher templates",
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: "search", in: "query", schema: { type: "string" } },
                    { name: "minDifficulty", in: "query", schema: { type: "number" } },
                    { name: "maxDifficulty", in: "query", schema: { type: "number" } }
                ],
                responses: { 200: { description: "Public plans" } }
            }
        },
        "/plans/{id}/follow": {
            post: {
                tags: ["Plans"],
                summary: "Follow and clone a public template transactionally",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 201: { description: "Followed and cloned" }, 409: { description: "Duplicate follow" } }
            }
        },
        "/plans/{id}/topics": {
            get: {
                tags: ["Topics"],
                summary: "List topics for an owned/readable plan",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "Topics" }, 403: { $ref: "#/components/responses/Forbidden" } }
            },
            post: {
                tags: ["Topics"],
                summary: "Create a topic on an owned mutable plan",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TopicRequest" } } } },
                responses: { 201: { description: "Topic created" }, 403: { $ref: "#/components/responses/Forbidden" } }
            }
        },
        "/plans/{id}/schedule-runs": {
            post: {
                tags: ["Schedules"],
                summary: "Generate or regenerate an explainable schedule run",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/GenerateScheduleRequest" } } } },
                responses: { 201: { description: "Schedule generated" }, 422: { description: "Impossible schedule" } }
            }
        },
        "/schedule-runs/active": {
            get: {
                tags: ["Schedules"],
                summary: "Get active schedule run for a plan",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "planId", in: "query", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "Active schedule" }, 404: { description: "No active schedule" } }
            }
        },
        "/schedule-runs/today": {
            get: {
                tags: ["Schedules"],
                summary: "Get today's schedule day for a plan",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "planId", in: "query", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "Today's schedule" } }
            }
        },
        "/execution/schedule-items/{id}/logs": {
            post: {
                tags: ["Execution"],
                summary: "Submit a study log and propagate progress transactionally",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/StudyLogRequest" } } } },
                responses: { 201: { description: "Log accepted" }, 409: { description: "Duplicate log" }, 403: { $ref: "#/components/responses/Forbidden" } }
            }
        },
        "/execution/status": {
            get: {
                tags: ["Execution"],
                summary: "Get execution status for a plan",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "planId", in: "query", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "Execution status" } }
            }
        },
        "/execution/adherence": {
            get: {
                tags: ["Execution"],
                summary: "Get adherence summary for a plan",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "planId", in: "query", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "Adherence summary" } }
            }
        },
        "/execution/recovery": {
            get: {
                tags: ["Execution"],
                summary: "Get recovery debt and regeneration recommendation",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "planId", in: "query", required: true, schema: { type: "integer" } }],
                responses: { 200: { description: "Recovery state" } }
            }
        }
    }
};

module.exports = openApiDocument;
