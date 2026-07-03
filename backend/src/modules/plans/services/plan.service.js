"use strict";

const { UniqueConstraintError } = require("sequelize");
const AppError = require("../../../shared/errors/AppError");
const { ERROR_CODES } = require("../../../shared/errors/errorCodes");
const { withTransaction } = require("../../../config/database");
const { paginationMeta } = require("../../../shared/responses/apiResponse");
const { normalizeName } = require("../../../db/utils/normalize");
const { PLAN_STATUS, PLAN_VISIBILITY } = require("../../../constants/enums");
const { presentPlan, presentPlans } = require("../dto/plan.presenter");
const { presentTopics } = require("../../topics/dto/topic.presenter");
const planRepository = require("../repositories/plan.repository");
const planPolicy = require("../policies/plan.policy");

function pagination(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    return {
        page,
        limit,
        offset: (page - 1) * limit
    };
}

function duplicateFollowError() {
    return new AppError({
        message: "You already follow this plan",
        code: ERROR_CODES.DUPLICATE_RESOURCE,
        statusCode: 409
    });
}

async function createPlan(user, payload) {
    if (payload.visibility === PLAN_VISIBILITY.PUBLIC) {
        planPolicy.assertCanCreatePublicPlan(user);
    }

    const plan = await planRepository.createPlan({
        ownerId: user.id,
        title: payload.title,
        description: payload.description || null,
        visibility: payload.visibility || PLAN_VISIBILITY.PRIVATE,
        status: PLAN_STATUS.DRAFT
    });

    return presentPlan(plan);
}

async function listOwnedPlans(user, query) {
    const { page, limit, offset } = pagination(query);
    const result = await planRepository.findOwnedPlans({
        ownerId: user.id,
        status: query.status,
        visibility: query.visibility,
        limit,
        offset
    });

    const topicStats = await planRepository.countTopicsByPlanIds(
        result.rows.map(plan => Number(plan.id))
    );

    return {
        plans: result.rows.map(plan => presentPlan(plan, topicStats.get(Number(plan.id)) || {
            topicCount: 0,
            estimatedHours: 0,
            averageDifficulty: 0
        })),
        meta: paginationMeta({ page, limit, total: result.count })
    };
}

async function getPlan(user, planId) {
    const plan = await planRepository.findPlanById(planId);
    planPolicy.assertOwnerOrAdmin(user, plan);

    const topics = await planRepository.findTopicsForPlan(plan.id);

    return {
        plan: presentPlan(plan),
        topics: presentTopics(topics)
    };
}

async function updatePlan(user, planId, payload) {
    const plan = await planRepository.findPlanById(planId);
    planPolicy.assertOwnerOrAdmin(user, plan);
    planPolicy.assertMutablePlan(plan);

    if (payload.visibility === PLAN_VISIBILITY.PUBLIC) {
        planPolicy.assertCanCreatePublicPlan(user);
    }

    await plan.update(payload);
    return presentPlan(plan);
}

async function publishPlan(user, planId) {
    const plan = await planRepository.findPlanById(planId);
    planPolicy.assertCanPublish(user, plan);

    const topics = await planRepository.findTopicsForPlan(plan.id);
    if (!topics.length) {
        throw new AppError({
            message: "A plan must have at least one topic before publishing",
            code: ERROR_CODES.VALIDATION_ERROR,
            statusCode: 400
        });
    }

    await plan.update({
        visibility: PLAN_VISIBILITY.PUBLIC,
        status: PLAN_STATUS.PUBLISHED
    });

    return presentPlan(plan);
}

async function archivePlan(user, planId) {
    const plan = await planRepository.findPlanById(planId);
    planPolicy.assertCanArchive(user, plan);

    await plan.update({ status: PLAN_STATUS.ARCHIVED });
    return presentPlan(plan);
}

async function deletePlan(user, planId) {
    const plan = await planRepository.findPlanById(planId);
    planPolicy.assertCanDelete(user, plan);

    await plan.destroy();
    return { deleted: true };
}

async function listPublicPlans(user, query) {
    const { page, limit, offset } = pagination(query);
    const result = await planRepository.findPublicPlans({
        ...query,
        limit,
        offset
    });

    const plans = result.rows.map(row => ({
        id: Number(row.id),
        ownerId: row.owner_id,
        title: row.title,
        description: row.description,
        visibility: row.visibility,
        status: row.status,
        sourcePlanId: row.source_plan_id ? Number(row.source_plan_id) : null,
        version: row.version,
        topicCount: Number(row.topicCount || 0),
        estimatedHours: Number(row.estimatedHours || 0),
        averageDifficulty: Number(row.averageDifficulty || 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));

    return {
        plans,
        meta: paginationMeta({ page, limit, total: result.count })
    };
}

async function followPlan(user, sourcePlanId) {
    return withTransaction(async transaction => {
        const sourcePlan = await planRepository.findPlanById(sourcePlanId, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        planPolicy.assertCanFollow(user, sourcePlan);

        const existingFollow = await planRepository.findExistingFollow(user.id, sourcePlan.id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (existingFollow) {
            throw duplicateFollowError();
        }

        const sourceTopics = await planRepository.findTopicsForPlan(sourcePlan.id, {
            transaction,
            lock: transaction.LOCK.SHARE
        });

        if (!sourceTopics.length) {
            throw new AppError({
                message: "Cannot follow a plan without topics",
                code: ERROR_CODES.VALIDATION_ERROR,
                statusCode: 400
            });
        }

        const clonedPlan = await planRepository.createPlan({
            ownerId: user.id,
            title: `${sourcePlan.title} - Personal Copy`,
            description: sourcePlan.description,
            visibility: PLAN_VISIBILITY.PRIVATE,
            status: PLAN_STATUS.DRAFT,
            sourcePlanId: sourcePlan.id,
            version: sourcePlan.version
        }, { transaction });

        await planRepository.bulkCreateTopics(sourceTopics.map(topic => ({
            planId: clonedPlan.id,
            name: topic.name,
            normalizedName: normalizeName(topic.name),
            difficulty: topic.difficulty,
            estimatedHours: topic.estimatedHours,
            deadline: topic.deadline,
            progress: 0,
            status: "pending",
            position: topic.position
        })), { transaction });

        try {
            await planRepository.createFollow({
                userId: user.id,
                sourcePlanId: sourcePlan.id,
                clonedPlanId: clonedPlan.id
            }, { transaction });
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                throw duplicateFollowError();
            }
            throw error;
        }

        const clonedTopics = await planRepository.findTopicsForPlan(clonedPlan.id, { transaction });

        return {
            plan: presentPlan(clonedPlan),
            topics: presentTopics(clonedTopics)
        };
    });
}

module.exports = {
    createPlan,
    listOwnedPlans,
    getPlan,
    updatePlan,
    publishPlan,
    archivePlan,
    deletePlan,
    listPublicPlans,
    followPlan
};
