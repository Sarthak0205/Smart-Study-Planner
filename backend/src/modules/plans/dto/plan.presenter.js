"use strict";

function presentPlan(plan, extras = {}) {
    if (!plan) return null;

    return {
        id: Number(plan.id),
        ownerId: plan.ownerId,
        title: plan.title,
        description: plan.description,
        visibility: plan.visibility,
        status: plan.status,
        sourcePlanId: plan.sourcePlanId ? Number(plan.sourcePlanId) : null,
        version: plan.version,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        ...extras
    };
}

function presentPlans(plans) {
    return plans.map(plan => presentPlan(plan));
}

module.exports = {
    presentPlan,
    presentPlans
};
