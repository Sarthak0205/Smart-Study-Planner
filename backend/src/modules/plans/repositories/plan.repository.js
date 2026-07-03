"use strict";

const { Op, Sequelize } = require("sequelize");
const { Plan, PlanTopic, UserPlanFollow, sequelize } = require("../../../db/models");
const { PLAN_STATUS, PLAN_VISIBILITY } = require("../../../constants/enums");

async function createPlan(payload, options = {}) {
    return Plan.create(payload, options);
}

async function findPlanById(id, options = {}) {
    return Plan.findByPk(id, options);
}

async function findOwnedPlans({ ownerId, status, visibility, limit, offset }) {
    const where = { ownerId };
    if (status) where.status = status;
    if (visibility) where.visibility = visibility;

    return Plan.findAndCountAll({
        where,
        order: [["createdAt", "DESC"]],
        limit,
        offset
    });
}

async function countTopicsByPlanIds(planIds) {
    if (!planIds.length) return new Map();

    const rows = await PlanTopic.findAll({
        where: { planId: planIds },
        attributes: [
            "planId",
            [Sequelize.fn("COUNT", Sequelize.col("id")), "topicCount"],
            [Sequelize.fn("SUM", Sequelize.col("estimated_hours")), "estimatedHours"],
            [Sequelize.fn("AVG", Sequelize.col("difficulty")), "averageDifficulty"]
        ],
        group: ["planId"],
        raw: true
    });

    return new Map(rows.map(row => [
        Number(row.planId),
        {
            topicCount: Number(row.topicCount || 0),
            estimatedHours: Number(row.estimatedHours || 0),
            averageDifficulty: Number(row.averageDifficulty || 0)
        }
    ]));
}

async function findPublicPlans({ search, minDifficulty, maxDifficulty, minHours, maxHours, limit, offset }) {
    const topicHaving = [];
    const replacements = {
        limit,
        offset
    };

    let searchClause = "";
    if (search) {
        searchClause = "AND (p.title ILIKE :search OR p.description ILIKE :search)";
        replacements.search = `%${search}%`;
    }

    if (minDifficulty !== undefined) {
        topicHaving.push("AVG(pt.difficulty) >= :minDifficulty");
        replacements.minDifficulty = minDifficulty;
    }
    if (maxDifficulty !== undefined) {
        topicHaving.push("AVG(pt.difficulty) <= :maxDifficulty");
        replacements.maxDifficulty = maxDifficulty;
    }
    if (minHours !== undefined) {
        topicHaving.push("SUM(pt.estimated_hours) >= :minHours");
        replacements.minHours = minHours;
    }
    if (maxHours !== undefined) {
        topicHaving.push("SUM(pt.estimated_hours) <= :maxHours");
        replacements.maxHours = maxHours;
    }

    const havingClause = topicHaving.length ? `HAVING ${topicHaving.join(" AND ")}` : "";

    const rows = await sequelize.query(`
        SELECT
            p.*,
            COUNT(pt.id)::int AS "topicCount",
            COALESCE(SUM(pt.estimated_hours), 0)::float AS "estimatedHours",
            COALESCE(AVG(pt.difficulty), 0)::float AS "averageDifficulty",
            COUNT(*) OVER()::int AS "totalCount"
        FROM plans p
        LEFT JOIN plan_topics pt ON pt.plan_id = p.id
        WHERE p.visibility = 'public'
          AND p.status = 'published'
          ${searchClause}
        GROUP BY p.id
        ${havingClause}
        ORDER BY p.created_at DESC
        LIMIT :limit OFFSET :offset;
    `, {
        replacements,
        type: Sequelize.QueryTypes.SELECT
    });

    return {
        rows,
        count: rows[0]?.totalCount || 0
    };
}

async function findExistingFollow(userId, sourcePlanId, options = {}) {
    return UserPlanFollow.findOne({
        where: {
            userId,
            sourcePlanId
        },
        ...options
    });
}

async function createFollow(payload, options = {}) {
    return UserPlanFollow.create(payload, options);
}

async function bulkCreateTopics(topics, options = {}) {
    return PlanTopic.bulkCreate(topics, {
        returning: true,
        ...options
    });
}

async function findTopicsForPlan(planId, options = {}) {
    return PlanTopic.findAll({
        where: { planId },
        order: [["position", "ASC"], ["id", "ASC"]],
        ...options
    });
}

module.exports = {
    createPlan,
    findPlanById,
    findOwnedPlans,
    countTopicsByPlanIds,
    findPublicPlans,
    findExistingFollow,
    createFollow,
    bulkCreateTopics,
    findTopicsForPlan,
    PLAN_STATUS,
    PLAN_VISIBILITY,
    Op
};
