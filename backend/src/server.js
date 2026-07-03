const createApp = require("./app");
const config = require("./config/env");
const logger = require("./config/logger");
const { connectDatabase, closeDatabase } = require("./config/database");
const { BRANDING } = require("./config/branding");

async function startServer() {
    await connectDatabase();

    const app = createApp();
    const server = app.listen(config.port, () => {
        logger.info({
            port: config.port,
            environment: config.nodeEnv
        }, `${BRANDING.APP_NAME} API listening`);
    });

    async function shutdown(signal) {
        logger.info({ signal }, "Shutdown signal received");

        server.close(async error => {
            if (error) {
                logger.error({ err: error }, "HTTP server shutdown failed");
                process.exit(1);
            }

            try {
                await closeDatabase();
                process.exit(0);
            } catch (dbError) {
                logger.error({ err: dbError }, "Database shutdown failed");
                process.exit(1);
            }
        });
    }

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

    return server;
}

if (require.main === module) {
    startServer().catch(error => {
        logger.error({ err: error }, `Failed to start ${BRANDING.APP_NAME} API`);
        process.exit(1);
    });
}

module.exports = {
    startServer
};
