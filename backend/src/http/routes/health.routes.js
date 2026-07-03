const express = require("express");
const { QueryTypes } = require("sequelize");
const { sequelize } = require("../../config/database");
const config = require("../../config/env");
const asyncHandler = require("../../shared/utils/asyncHandler");
const { successResponse } = require("../../shared/responses/apiResponse");

const { BRANDING } = require("../../config/branding");

const router = express.Router();
const startedAt = Date.now();

router.get("/health", (req, res) => {
    return successResponse(res, {
        status: "ok",
        service: BRANDING.API_NAME,
        environment: config.nodeEnv,
        uptimeSeconds: Math.floor(process.uptime()),
        startedAt: new Date(startedAt).toISOString(),
        timestamp: new Date().toISOString()
    });
});

router.get("/ready", asyncHandler(async (req, res) => {
    await sequelize.query("SELECT 1", { type: QueryTypes.SELECT });

    return successResponse(res, {
        status: "ready",
        checks: {
            database: "ok"
        },
        timestamp: new Date().toISOString()
    });
}));

module.exports = router;
