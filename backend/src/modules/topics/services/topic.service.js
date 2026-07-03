"use strict";

const { UniqueConstraintError } = require("sequelize");
const AppError = require("../../../shared/errors/AppError");
const { ERROR_CODES } = require("../../../shared/errors/errorCodes");
const { withTransaction } = require("../../../config/database");
const { normalizeName } = require("../../../db/utils/normalize");
const { TOPIC_STATUS } = require("../../../constants/enums");
const { Plan } = require("../../../db/models");
const planPolicy = require("../../plans/policies/plan.policy");
const topicRepository = require("../repositories/topic.repository");
const { presentTopic, presentTopics } = require("../dto/topic.presenter");

function duplicateTopicError() {
    return new AppError({
        message: "Topic already exists in this plan",
        code: ERROR_CODES.DUPLICATE_RESOURCE,
        statusCode: 409
    });
}

async function loadOwnedMutablePlan(user, planId, transaction) {
    const plan = await Plan.findByPk(planId, {
        transaction,
        lock: transaction?.LOCK?.UPDATE
    });

    planPolicy.assertOwnerOrAdmin(user, plan);
    planPolicy.assertMutablePlan(plan);
    return plan;
}

async function listTopics(user, planId, query = {}) {
    const plan = await Plan.findByPk(planId);
    planPolicy.assertOwnerOrAdmin(user, plan);

    const topics = await topicRepository.findTopicsByPlan(plan.id, {
        status: query.status
    });

    return presentTopics(topics);
}

async function createTopic(user, planId, payload) {
    return withTransaction(async transaction => {
        const plan = await loadOwnedMutablePlan(user, planId, transaction);
        const topicCount = await topicRepository.countTopicsByPlan(plan.id, { transaction });

        try {
            const topic = await topicRepository.createTopic({
                planId: plan.id,
                name: payload.name,
                normalizedName: normalizeName(payload.name),
                difficulty: payload.difficulty,
                estimatedHours: payload.estimatedHours,
                deadline: payload.deadline,
                progress: 0,
                status: TOPIC_STATUS.PENDING,
                position: payload.position ?? topicCount
            }, { transaction });

            return presentTopic(topic);
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                throw duplicateTopicError();
            }
            throw error;
        }
    });
}

async function updateTopic(user, planId, topicId, payload) {
    return withTransaction(async transaction => {
        const plan = await loadOwnedMutablePlan(user, planId, transaction);
        const topic = await topicRepository.findTopicById(topicId, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!topic || Number(topic.planId) !== Number(plan.id)) {
            throw new AppError({
                message: "Topic not found or access denied",
                code: ERROR_CODES.OWNERSHIP_REQUIRED,
                statusCode: 403
            });
        }

        const patch = { ...payload };
        if (payload.name) {
            patch.normalizedName = normalizeName(payload.name);
        }

        try {
            await topicRepository.updateTopic(topic, patch, { transaction });
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                throw duplicateTopicError();
            }
            throw error;
        }

        return presentTopic(topic);
    });
}

async function deleteTopic(user, planId, topicId) {
    return withTransaction(async transaction => {
        const plan = await loadOwnedMutablePlan(user, planId, transaction);
        const topic = await topicRepository.findTopicById(topicId, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!topic || Number(topic.planId) !== Number(plan.id)) {
            throw new AppError({
                message: "Topic not found or access denied",
                code: ERROR_CODES.OWNERSHIP_REQUIRED,
                statusCode: 403
            });
        }

        await topicRepository.deleteTopic(topic, { transaction });
        return { deleted: true };
    });
}

async function reorderTopics(user, planId, topicOrder) {
    return withTransaction(async transaction => {
        const plan = await loadOwnedMutablePlan(user, planId, transaction);
        const topics = await topicRepository.findTopicsByPlan(plan.id, { transaction });
        const existingIds = new Set(topics.map(topic => Number(topic.id)));
        const requestedIds = topicOrder.map(Number);

        if (requestedIds.length !== existingIds.size || requestedIds.some(id => !existingIds.has(id))) {
            throw new AppError({
                message: "topicOrder must include every topic in the plan exactly once",
                code: ERROR_CODES.VALIDATION_ERROR,
                statusCode: 400
            });
        }

        for (let index = 0; index < requestedIds.length; index += 1) {
            const topic = topics.find(item => Number(item.id) === requestedIds[index]);
            topic.position = index;
            await topic.save({ transaction });
        }

        const reordered = await topicRepository.findTopicsByPlan(plan.id, { transaction });
        return presentTopics(reordered);
    });
}

module.exports = {
    listTopics,
    createTopic,
    updateTopic,
    deleteTopic,
    reorderTopics
};
