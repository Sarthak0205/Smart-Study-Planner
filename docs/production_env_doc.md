# Production Environment Variables Documentation

This document describes all environment variables used by the backend and frontend components of StudyFlow.

---

## 🖥️ Backend Environment Variables (Render)

These variables must be configured in the Render Web Service dashboard under the **Environment** tab.

### Required Production Variables

| Variable Name | Description | Example / Recommended Value |
|---|---|---|
| `NODE_ENV` | Must be set to `production` in production environments. Enables production database security behaviors (like SSL enforcement) and stricter JWT verification rules. | `production` |
| `DATABASE_URL` | The Neon PostgreSQL connection string. Must start with `postgres://` or `postgresql://` and should append `?sslmode=require`. | `postgresql://alex:passwd@ep-cold-star-12345.us-east-2.aws.neon.tech/studyflow?sslmode=require` |
| `JWT_ACCESS_SECRET` | A strong, random key used to sign JWT Access Tokens. Generate using: `openssl rand -hex 64` | `6ae480a47...` (do not reuse across envs) |
| `JWT_REFRESH_SECRET` | A strong, random key used to sign JWT Refresh Tokens. Generate using: `openssl rand -hex 64` | `f3b890c2a...` (do not reuse across envs) |
| `CORS_ORIGIN` | A comma-separated list of allowed origins. In production, this must match the URL of your Vercel deployment. | `https://studyflow.vercel.app` |

### Optional / Configurable Variables

| Variable Name | Default Value | Description |
|---|---|---|
| `PORT` | `8000` | The port the Express app listens on. Render binds this automatically to `10000` or assigns dynamically, which works out-of-the-box. |
| `LOG_LEVEL` | `info` | Logging verbosity (`fatal`, `error`, `warn`, `info`, `debug`, `trace`). |
| `SLOW_QUERY_MS` | `150` | Database queries taking longer than this limit will trigger a warning log. |
| `SLOW_REQUEST_MS` | `1000` | HTTP requests taking longer than this limit will trigger a warning log. |
| `REQUEST_BODY_LIMIT` | `1mb` | Maximum allowed payload size for Express JSON requests. |
| `RATE_LIMIT_WINDOW_MS`| `900000` (15 mins) | The window size for the rate limiter. |
| `RATE_LIMIT_MAX` | `300` | Maximum requests per IP address allowed in the window. |
| `JWT_ACCESS_EXPIRES_IN`| `15m` | Lifetime of a JWT Access Token (recommended 15 minutes). |
| `REFRESH_TOKEN_DAYS` | `30` | Lifetime of a refresh token cookie in days (30 days). |
| `REFRESH_COOKIE_NAME` | `acadence_refresh_token` | The name of the HttpOnly cookie containing the refresh token. |

---

## 🎨 Frontend Environment Variables (Vercel)

These variables must be configured in the Vercel project dashboard under **Environment Variables**.

*Critical:* Frontend environment variables are evaluated at build time (by Vite) and embedded into the static JavaScript files. If you change these variables in Vercel, you must trigger a new deployment build.

| Variable Name | Description | Example / Recommended Value |
|---|---|---|
| `VITE_API_BASE_URL` | The complete URL to the API backend, including the `/api/v1` prefix. | `https://studyflow-backend.onrender.com/api/v1` |
