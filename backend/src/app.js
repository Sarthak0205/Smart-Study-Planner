const express = require("express");
const config = require("./config/env");
const requestContext = require("./shared/middleware/requestContext.middleware");
const requestLogger = require("./shared/middleware/requestLogger.middleware");
const { applySecurityMiddleware } = require("./shared/middleware/security.middleware");
const healthRoutes = require("./http/routes/health.routes");
const docsRoutes = require("./http/routes/docs.routes");
const authRoutes = require("./modules/auth/routes/auth.routes");
const planRoutes = require("./modules/plans/routes/plan.routes");
const scheduleRoutes = require("./modules/schedules/routes/schedule.routes");
const studyLogRoutes = require("./modules/studyLogs/routes/studyLog.routes");
const userRoutes = require("./modules/users/routes/user.routes");
const notFoundMiddleware = require("./shared/middleware/notFound.middleware");
const errorMiddleware = require("./shared/middleware/error.middleware");

function createApp() {
    const app = express();

    app.use(requestContext);
    app.use(requestLogger);

    applySecurityMiddleware(app);

    app.use(express.json({ limit: config.requestBodyLimit }));
    app.use(express.urlencoded({
        extended: true,
        limit: config.requestBodyLimit
    }));

    app.use("/api/v1", healthRoutes);
    app.use("/api/v1", docsRoutes);
    app.use(healthRoutes);

    app.use("/api/v1/auth", authRoutes);
    app.use("/api/v1/plans", planRoutes);
    app.use("/api/v1/schedule-runs", scheduleRoutes);
    app.use("/api/v1/execution", studyLogRoutes);
    app.use("/api/v1/users", userRoutes);

    // Additional domain modules will be mounted here in later phases.

    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    return app;
}

module.exports = createApp;
