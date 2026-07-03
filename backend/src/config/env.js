const path = require("path");
const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config({
    path: path.resolve(process.cwd(), ".env"),
    quiet: true
});

const { BRANDING } = require("./branding");

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(8000),
    DATABASE_URL: z.string().optional(),
    DB_HOST: z.string().default("localhost"),
    DB_PORT: z.coerce.number().int().positive().default(5432),
    DB_NAME: z.string().default("studyplanner"),
    DB_USER: z.string().default("sdc"),
    DB_PASSWORD: z.string().optional(),
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    DB_POOL_MIN: z.coerce.number().int().min(0).default(0),
    DB_POOL_IDLE_MS: z.coerce.number().int().positive().default(10000),
    DB_POOL_ACQUIRE_MS: z.coerce.number().int().positive().default(30000),
    LOG_LEVEL: z.string().default("info"),
    CORS_ORIGIN: z.string().default("http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:5500"),
    REQUEST_BODY_LIMIT: z.string().default("1mb"),
    SLOW_QUERY_MS: z.coerce.number().int().positive().default(150),
    SLOW_REQUEST_MS: z.coerce.number().int().positive().default(1000),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
    JWT_ACCESS_SECRET: z.string().optional(),
    JWT_REFRESH_SECRET: z.string().optional(),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),
    REFRESH_COOKIE_NAME: z.string().default(BRANDING.REFRESH_COOKIE_NAME)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    const formattedErrors = parsed.error.issues.map(issue => ({
        path: issue.path.join("."),
        message: issue.message
    }));

    throw new Error(`Invalid environment configuration: ${JSON.stringify(formattedErrors)}`);
}

const env = parsed.data;
const isProduction = env.NODE_ENV === "production";

if (isProduction && (!env.JWT_ACCESS_SECRET || !env.JWT_REFRESH_SECRET)) {
    throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required in production");
}

function parseCorsOrigins(value) {
    return value
        .split(",")
        .map(origin => origin.trim())
        .filter(Boolean);
}

module.exports = Object.freeze({
    nodeEnv: env.NODE_ENV,
    isProduction,
    isTest: env.NODE_ENV === "test",
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    corsOrigins: parseCorsOrigins(env.CORS_ORIGIN),
    requestBodyLimit: env.REQUEST_BODY_LIMIT,
    slowQueryMs: env.SLOW_QUERY_MS,
    slowRequestMs: env.SLOW_REQUEST_MS,
    rateLimit: {
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        max: env.RATE_LIMIT_MAX,
        authWindowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
        authMax: env.AUTH_RATE_LIMIT_MAX
    },
    database: {
        url: env.DATABASE_URL,
        host: env.DB_HOST,
        port: env.DB_PORT,
        name: env.DB_NAME,
        user: env.DB_USER,
        password: env.DB_PASSWORD || null,
        pool: {
            max: env.DB_POOL_MAX,
            min: env.DB_POOL_MIN,
            idle: env.DB_POOL_IDLE_MS,
            acquire: env.DB_POOL_ACQUIRE_MS
        }
    },
    jwt: {
        accessSecret: env.JWT_ACCESS_SECRET || "dev-only-access-secret-change-me",
        refreshSecret: env.JWT_REFRESH_SECRET || "dev-only-refresh-secret-change-me",
        accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
        refreshTokenDays: env.REFRESH_TOKEN_DAYS,
        refreshCookieName: env.REFRESH_COOKIE_NAME
    }
});
