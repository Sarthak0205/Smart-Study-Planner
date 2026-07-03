"use strict";

const { PlanTopic } = require("../../../db/models");

async function createTopic(payload, options = {}) {
    return PlanTopic.create(payload, options);
}

async function findTopicById(id, options = {}) {
    return PlanTopic.findByPk(id, options);
}

async function findTopicsByPlan(planId, { status, transaction } = {}) {
    const where = { planId };
    if (status) where.status = status;

    return PlanTopic.findAll({
        where,
        order: [["position", "ASC"], ["id", "ASC"]],
        transaction
    });
}

async function countTopicsByPlan(planId, options = {}) {
    return PlanTopic.count({
        where: { planId },
        ...options
    });
}

async function updateTopic(topic, patch, options = {}) {
    return topic.update(patch, options);
}

async function deleteTopic(topic, options = {}) {
    return topic.destroy(options);
}

module.exports = {
    createTopic,
    findTopicById,
    findTopicsByPlan,
    countTopicsByPlan,
    updateTopic,
    deleteTopic
};
