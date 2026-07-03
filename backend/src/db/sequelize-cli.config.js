require("../config/env");

const config = require("../config/env");

const baseConfig = {
    dialect: "postgres",
    migrationStorage: "sequelize",
    seederStorage: "sequelize",
    define: {
        underscored: true,
        timestamps: true
    },
    pool: config.database.pool
};

function environmentConfig() {
    if (config.database.url) {
        const hasSslmodeRequire = config.database.url.includes("sslmode=require") || config.database.url.includes("neon.tech");
        return {
            ...baseConfig,
            url: config.database.url,
            dialectOptions: (config.isProduction || hasSslmodeRequire)
                ? {
                    ssl: {
                        require: true,
                        rejectUnauthorized: false
                    }
                }
                : {}
        };
    }

    return {
        ...baseConfig,
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        username: config.database.user,
        password: config.database.password
    };
}

const dbConfig = environmentConfig();

module.exports = {
    development: dbConfig,
    test: dbConfig,
    production: dbConfig
};
