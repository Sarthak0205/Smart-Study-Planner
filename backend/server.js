const { startServer } = require("./src/server");
const logger = require("./src/config/logger");
const { BRANDING } = require("./src/config/branding");

startServer().catch(error => {
    logger.error({ err: error }, `Failed to start ${BRANDING.APP_NAME} API`);
    process.exit(1);
});
