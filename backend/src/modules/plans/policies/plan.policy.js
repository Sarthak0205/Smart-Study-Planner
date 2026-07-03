"use strict";

const AppError = require("../../../shared/errors/AppError");
const { ERROR_CODES } = require("../../../shared/errors/errorCodes");
const { PLAN_STATUS, PLAN_VISIBILITY, USER_ROLES } = require("../../../constants/enums");

function isAdmin(user) {
    return user.role === USER_ROLES.ADMIN;
}

function assertOwnerOrAdmin(user, plan) {
    if (!plan || (!isAdmin(user) && plan.ownerId !== user.id)) {
        throw new AppError({
            message: "Plan not found or access denied",
            code: ERROR_CODES.OWNERSHIP_REQUIRED,
            statusCode: 403
        });
    }
}

function assertCanCreatePublicPlan(user) {
    if (![USER_ROLES.TEACHER, USER_ROLES.ADMIN].includes(user.role)) {
        throw new AppError({
            message: "Only teachers and admins can publish public plans",
            code: ERROR_CODES.FORBIDDEN,
            statusCode: 403
        });
    }
}

function assertMutablePlan(plan) {
    if (plan.status === PLAN_STATUS.ARCHIVED) {
        throw new AppError({
            message: "Archived plans cannot be mutated",
            code: ERROR_CODES.FORBIDDEN,
            statusCode: 403
        });
    }

    if (plan.visibility === PLAN_VISIBILITY.PUBLIC && plan.status === PLAN_STATUS.PUBLISHED) {
        throw new AppError({
            message: "Published public plans are immutable templates",
            code: ERROR_CODES.FORBIDDEN,
            statusCode: 403
        });
    }
}

function assertCanPublish(user, plan) {
    assertOwnerOrAdmin(user, plan);
    assertCanCreatePublicPlan(user);

    if (plan.status === PLAN_STATUS.ARCHIVED) {
        throw new AppError({
            message: "Archived plans cannot be published",
            code: ERROR_CODES.FORBIDDEN,
            statusCode: 403
        });
    }
}

function assertCanArchive(user, plan) {
    assertOwnerOrAdmin(user, plan);

    if (plan.status === PLAN_STATUS.ARCHIVED) {
        throw new AppError({
            message: "Plan is already archived",
            code: ERROR_CODES.VALIDATION_ERROR,
            statusCode: 400
        });
    }
}

function assertCanDelete(user, plan) {
    assertOwnerOrAdmin(user, plan);

    if (plan.visibility === PLAN_VISIBILITY.PUBLIC && plan.status === PLAN_STATUS.PUBLISHED) {
        throw new AppError({
            message: "Published public plans must be archived instead of deleted",
            code: ERROR_CODES.FORBIDDEN,
            statusCode: 403
        });
    }
}

function assertCanFollow(user, plan) {
    if (!plan || plan.visibility !== PLAN_VISIBILITY.PUBLIC || plan.status !== PLAN_STATUS.PUBLISHED) {
        throw new AppError({
            message: "Public plan not found",
            code: ERROR_CODES.NOT_FOUND,
            statusCode: 404
        });
    }

    if (plan.ownerId === user.id) {
        throw new AppError({
            message: "You cannot follow your own plan",
            code: ERROR_CODES.VALIDATION_ERROR,
            statusCode: 400
        });
    }
}

module.exports = {
    assertOwnerOrAdmin,
    assertCanCreatePublicPlan,
    assertMutablePlan,
    assertCanPublish,
    assertCanArchive,
    assertCanDelete,
    assertCanFollow
};
