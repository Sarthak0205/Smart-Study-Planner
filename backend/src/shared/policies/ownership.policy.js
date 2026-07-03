"use strict";

const AppError = require("../errors/AppError");
const { ERROR_CODES } = require("../errors/errorCodes");
const {
    Plan,
    ScheduleRun,
    ScheduleDay,
    ScheduleItem,
    StudyLog
} = require("../../db/models");
const { USER_ROLES } = require("../../constants/enums");

function assertAuthenticated(req) {
    if (!req.user) {
        throw new AppError({
            message: "Authentication required",
            code: ERROR_CODES.UNAUTHORIZED,
            statusCode: 401
        });
    }
}

function canReadAsAdmin(user) {
    return user.role === USER_ROLES.ADMIN;
}

async function assertPlanOwner(req, planId, options = {}) {
    assertAuthenticated(req);

    const plan = await Plan.findByPk(planId, options);
    if (!plan || (!canReadAsAdmin(req.user) && plan.ownerId !== req.user.id)) {
        throw new AppError({
            message: "Plan not found or access denied",
            code: ERROR_CODES.OWNERSHIP_REQUIRED,
            statusCode: 403
        });
    }

    return plan;
}

async function assertScheduleRunOwner(req, scheduleRunId, options = {}) {
    assertAuthenticated(req);

    const scheduleRun = await ScheduleRun.findByPk(scheduleRunId, options);
    if (!scheduleRun || (!canReadAsAdmin(req.user) && scheduleRun.userId !== req.user.id)) {
        throw new AppError({
            message: "Schedule run not found or access denied",
            code: ERROR_CODES.OWNERSHIP_REQUIRED,
            statusCode: 403
        });
    }

    return scheduleRun;
}

async function assertScheduleItemOwner(req, scheduleItemId, options = {}) {
    assertAuthenticated(req);

    const scheduleItem = await ScheduleItem.findByPk(scheduleItemId, {
        ...options,
        include: [{
            model: ScheduleDay,
            as: "scheduleDay",
            include: [{
                model: ScheduleRun,
                as: "scheduleRun"
            }]
        }]
    });

    const ownerId = scheduleItem?.scheduleDay?.scheduleRun?.userId;
    if (!scheduleItem || (!canReadAsAdmin(req.user) && ownerId !== req.user.id)) {
        throw new AppError({
            message: "Schedule item not found or access denied",
            code: ERROR_CODES.OWNERSHIP_REQUIRED,
            statusCode: 403
        });
    }

    return scheduleItem;
}

async function assertStudyLogOwner(req, studyLogId, options = {}) {
    assertAuthenticated(req);

    const studyLog = await StudyLog.findByPk(studyLogId, options);
    if (!studyLog || (!canReadAsAdmin(req.user) && studyLog.userId !== req.user.id)) {
        throw new AppError({
            message: "Study log not found or access denied",
            code: ERROR_CODES.OWNERSHIP_REQUIRED,
            statusCode: 403
        });
    }

    return studyLog;
}

module.exports = {
    assertAuthenticated,
    assertPlanOwner,
    assertScheduleRunOwner,
    assertScheduleItemOwner,
    assertStudyLogOwner
};
