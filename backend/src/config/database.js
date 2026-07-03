const { Sequelize } = require("sequelize");
const config = require("./env");
const logger = require("./logger");

function createSequelize() {
    function logQuery(sql, timingMs) {
        const payload = {
            sql,
            durationMs: typeof timingMs === "number" ? Number(timingMs.toFixed(2)) : null
        };

        if (payload.durationMs !== null && payload.durationMs >= config.slowQueryMs) {
            logger.warn(payload, "slow sequelize query");
            return;
        }

        logger.debug(payload, "sequelize query");
    }

    const commonOptions = {
        dialect: "postgres",
        benchmark: true,
        logging: logQuery,
        pool: config.database.pool,
        define: {
            underscored: true,
            timestamps: true
        }
    };

    if (config.database.url) {
        return new Sequelize(config.database.url, {
            ...commonOptions,
            dialectOptions: config.isProduction
                ? {
                    ssl: {
                        require: true,
                        rejectUnauthorized: false
                    }
                }
                : {}
        });
    }

    return new Sequelize(
        config.database.name,
        config.database.user,
        config.database.password,
        {
            ...commonOptions,
            host: config.database.host,
            port: config.database.port
        }
    );
}

const sequelize = createSequelize();

async function connectDatabase({ retries = 5, delayMs = 1000 } = {}) {
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            await sequelize.authenticate();
            logger.info("PostgreSQL connection established");
            return;
        } catch (error) {
            logger.error({ err: error, attempt, retries }, "PostgreSQL connection failed");

            if (attempt === retries) {
                throw error;
            }

            await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
    }
}

async function closeDatabase() {
    await sequelize.close();
    logger.info("PostgreSQL connection closed");
}

async function withTransaction(workflow, options = {}) {
    return sequelize.transaction(options, workflow);
}

module.exports = {
    sequelize,
    connectDatabase,
    closeDatabase,
    withTransaction
};
