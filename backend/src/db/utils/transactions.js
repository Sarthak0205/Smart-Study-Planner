"use strict";

const { Transaction } = require("sequelize");
const { sequelize, withTransaction } = require("../../config/database");

const LOCK = Object.freeze({
    UPDATE: Transaction.LOCK.UPDATE,
    SHARE: Transaction.LOCK.SHARE
});

async function withSerializableTransaction(workflow) {
    return withTransaction(workflow, {
        isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE
    });
}

async function acquireWorkflowLock(transaction, key) {
    await sequelize.query(
        "SELECT pg_advisory_xact_lock(hashtext(:lockKey));",
        {
            replacements: {
                lockKey: key
            },
            transaction
        }
    );
}

function scheduleGenerationLockKey(userId, planId) {
    return `schedule-generation:${userId}:${planId}`;
}

function followPlanLockKey(userId, sourcePlanId) {
    return `follow-plan:${userId}:${sourcePlanId}`;
}

module.exports = {
    LOCK,
    withSerializableTransaction,
    acquireWorkflowLock,
    scheduleGenerationLockKey,
    followPlanLockKey
};
