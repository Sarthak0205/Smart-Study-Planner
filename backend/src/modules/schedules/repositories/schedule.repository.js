"use strict";

const { Op } = require("sequelize");
const {
    Plan,
    PlanTopic,
    ScheduleRun,
    ScheduleDay,
    ScheduleItem
} = require("../../../db/models");
const { SCHEDULE_ITEM_STATUS, SCHEDULE_RUN_STATUS } = require("../../../constants/enums");

async function findPlanWithTopics(planId, options = {}) {
    return Plan.findByPk(planId, {
        ...options,
        include: [{
            model: PlanTopic,
            as: "topics",
            separate: true,
            order: [["position", "ASC"], ["id", "ASC"]]
        }]
    });
}

async function findActiveRun(userId, planId, options = {}) {
    return ScheduleRun.findOne({
        where: {
            userId,
            planId,
            isActive: true
        },
        ...options
    });
}

async function findActiveRunWithDays(userId, planId, options = {}) {
    return ScheduleRun.findOne({
        where: {
            userId,
            planId,
            isActive: true
        },
        include: [{
            model: ScheduleDay,
            as: "days",
            include: [{
                model: ScheduleItem,
                as: "items",
                include: [{
                    model: PlanTopic,
                    as: "topic"
                }]
            }]
        }],
        order: [
            [{ model: ScheduleDay, as: "days" }, "date", "ASC"],
            [{ model: ScheduleDay, as: "days" }, { model: ScheduleItem, as: "items" }, "priorityScore", "DESC"]
        ],
        ...options
    });
}

async function createScheduleRun(payload, options = {}) {
    return ScheduleRun.create(payload, options);
}

async function createScheduleDay(payload, options = {}) {
    return ScheduleDay.create(payload, options);
}

async function bulkCreateScheduleItems(items, options = {}) {
    return ScheduleItem.bulkCreate(items, options);
}

async function supersedeExistingActiveRuns(userId, planId, options = {}) {
    const activeRuns = await ScheduleRun.findAll({
        where: { userId, planId, isActive: true },
        ...options
    });
    const activeRunIds = activeRuns.map(run => run.id);

    if (!activeRunIds.length) return 0;

    const days = await ScheduleDay.findAll({
        where: { scheduleRunId: activeRunIds },
        attributes: ["id"],
        ...options
    });
    const dayIds = days.map(day => day.id);

    if (dayIds.length) {
        await ScheduleItem.update({
            status: SCHEDULE_ITEM_STATUS.SUPERSEDED
        }, {
            where: {
                scheduleDayId: dayIds,
                status: SCHEDULE_ITEM_STATUS.PLANNED
            },
            ...options
        });
    }

    await ScheduleRun.update({
        isActive: false,
        status: SCHEDULE_RUN_STATUS.SUPERSEDED
    }, {
        where: { id: activeRunIds },
        ...options
    });

    return activeRunIds.length;
}

async function findRunById(id, options = {}) {
    return ScheduleRun.findByPk(id, options);
}

async function findRunDetails(id, options = {}) {
    return ScheduleRun.findByPk(id, {
        include: [{
            model: ScheduleDay,
            as: "days",
            include: [{
                model: ScheduleItem,
                as: "items",
                include: [{
                    model: PlanTopic,
                    as: "topic"
                }]
            }]
        }],
        order: [
            [{ model: ScheduleDay, as: "days" }, "date", "ASC"],
            [{ model: ScheduleDay, as: "days" }, { model: ScheduleItem, as: "items" }, "priorityScore", "DESC"]
        ],
        ...options
    });
}

async function findRunHistory({ userId, planId, limit, offset }) {
    const where = { userId };
    if (planId) where.planId = planId;

    return ScheduleRun.findAndCountAll({
        where,
        order: [["generatedAt", "DESC"]],
        limit,
        offset
    });
}

async function findTodayForRun(runId, date, options = {}) {
    return ScheduleDay.findOne({
        where: {
            scheduleRunId: runId,
            date
        },
        include: [{
            model: ScheduleItem,
            as: "items",
            include: [{
                model: PlanTopic,
                as: "topic"
            }]
        }],
        order: [[{ model: ScheduleItem, as: "items" }, "priorityScore", "DESC"]],
        ...options
    });
}

module.exports = {
    findPlanWithTopics,
    findActiveRun,
    findActiveRunWithDays,
    createScheduleRun,
    createScheduleDay,
    bulkCreateScheduleItems,
    supersedeExistingActiveRuns,
    findRunById,
    findRunDetails,
    findRunHistory,
    findTodayForRun,
    Op
};
