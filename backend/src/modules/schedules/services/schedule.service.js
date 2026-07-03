"use strict";

const AppError = require("../../../shared/errors/AppError");
const { ERROR_CODES } = require("../../../shared/errors/errorCodes");
const { withTransaction } = require("../../../config/database");
const { acquireWorkflowLock, scheduleGenerationLockKey } = require("../../../db/utils/transactions");
const { PLAN_STATUS, PLAN_VISIBILITY, SCHEDULE_RUN_STATUS } = require("../../../constants/enums");
const { paginationMeta } = require("../../../shared/responses/apiResponse");
const { formatDateOnly, parseDateOnly } = require("../../scheduler/engine/date.util");
const { generateScheduleDraft } = require("../../scheduler/engine/scheduler.engine");
const scheduleRepository = require("../repositories/schedule.repository");
const { presentScheduleRun, presentScheduleDay } = require("../dto/schedule.presenter");
const studyLogService = require("../../studyLogs/services/studyLog.service");

function assertSchedulablePlan(user, plan) {
    if (!plan || plan.ownerId !== user.id) {
        throw new AppError({
            message: "Plan not found or access denied",
            code: ERROR_CODES.OWNERSHIP_REQUIRED,
            statusCode: 403
        });
    }

    if (plan.status === PLAN_STATUS.ARCHIVED) {
        throw new AppError({
            message: "Archived plans cannot generate schedules",
            code: ERROR_CODES.FORBIDDEN,
            statusCode: 403
        });
    }

    if (plan.visibility === PLAN_VISIBILITY.PUBLIC && plan.status === PLAN_STATUS.PUBLISHED) {
        throw new AppError({
            message: "Public templates cannot be scheduled directly. Follow the plan to create a personal copy.",
            code: ERROR_CODES.FORBIDDEN,
            statusCode: 403
        });
    }
}

function pagination(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    return {
        page,
        limit,
        offset: (page - 1) * limit
    };
}

async function generateSchedule(user, planId, payload = {}) {
    return withTransaction(async transaction => {
        await acquireWorkflowLock(transaction, scheduleGenerationLockKey(user.id, planId));

        const plan = await scheduleRepository.findPlanWithTopics(planId, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        assertSchedulablePlan(user, plan);

        const existingActiveRun = await scheduleRepository.findActiveRun(user.id, plan.id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (existingActiveRun && !payload.forceRegenerate) {
            const generatedAt = new Date(existingActiveRun.generatedAt).getTime();
            const isNearDuplicate = Date.now() - generatedAt < 5000;

            if (isNearDuplicate) {
                const existingDetails = await scheduleRepository.findRunDetails(existingActiveRun.id, { transaction });
                return {
                    scheduleRun: presentScheduleRun(existingDetails, true),
                    feasibility: {
                        status: existingActiveRun.feasibilityStatus,
                        requiredHours: Number(existingActiveRun.requiredHours),
                        availableHours: Number(existingActiveRun.availableHours),
                        deficitHours: Number(existingActiveRun.deficitHours),
                        warnings: ["duplicate_generation_suppressed"]
                    }
                };
            }
        }

        const feedbackScores = await studyLogService.getFeedbackScoresForTopics(
            user.id,
            (plan.topics || []).map(topic => topic.id),
            { transaction }
        );
        const topics = (plan.topics || []).map(topic => ({
            ...topic.toJSON(),
            feedbackScore: feedbackScores.get(Number(topic.id)) || 0
        }));

        const draft = generateScheduleDraft({
            topics,
            constraints: {
                dailyCapacityHours: payload.dailyCapacityHours
            },
            today: payload.today ? parseDateOnly(payload.today) : new Date(),
            allowImpossible: Boolean(payload.allowImpossible)
        });

        if (!draft.days.length) {
            throw new AppError({
                message: "All topics are complete and no revision sessions are currently needed",
                code: ERROR_CODES.VALIDATION_ERROR,
                statusCode: 400,
                details: draft.feasibility
            });
        }

        const scheduleRun = await scheduleRepository.createScheduleRun({
            userId: user.id,
            planId: plan.id,
            dailyCapacityHours: draft.constraints.dailyCapacityHours,
            strategy: draft.strategy,
            status: SCHEDULE_RUN_STATUS.GENERATING,
            isActive: false,
            feasibilityStatus: draft.feasibility.status,
            requiredHours: draft.feasibility.requiredHours,
            availableHours: draft.feasibility.availableHours,
            deficitHours: draft.feasibility.deficitHours,
            generatedAt: new Date()
        }, { transaction });

        for (const dayDraft of draft.days) {
            const day = await scheduleRepository.createScheduleDay({
                scheduleRunId: scheduleRun.id,
                date: dayDraft.date,
                totalPlannedHours: dayDraft.totalPlannedHours
            }, { transaction });

            await scheduleRepository.bulkCreateScheduleItems(dayDraft.items.map(item => ({
                scheduleDayId: day.id,
                topicId: item.topicId,
                allocatedHours: item.allocatedHours,
                priorityScore: item.priorityScore,
                reasonJson: item.reasonJson,
                status: "planned"
            })), { transaction });
        }

        await scheduleRepository.supersedeExistingActiveRuns(user.id, plan.id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        await scheduleRun.update({
            status: SCHEDULE_RUN_STATUS.ACTIVE,
            isActive: true
        }, { transaction });

        const details = await scheduleRepository.findRunDetails(scheduleRun.id, { transaction });

        return {
            scheduleRun: presentScheduleRun(details, true),
            feasibility: draft.feasibility
        };
    });
}

async function getActiveSchedule(user, planId) {
    const run = await scheduleRepository.findActiveRunWithDays(user.id, planId);

    if (!run) {
        throw new AppError({
            message: "No active schedule found for this plan",
            code: ERROR_CODES.NOT_FOUND,
            statusCode: 404
        });
    }

    return presentScheduleRun(run, true);
}

async function getScheduleHistory(user, query) {
    const { page, limit, offset } = pagination(query);
    const result = await scheduleRepository.findRunHistory({
        userId: user.id,
        planId: query.planId,
        limit,
        offset
    });

    return {
        scheduleRuns: result.rows.map(run => presentScheduleRun(run)),
        meta: paginationMeta({ page, limit, total: result.count })
    };
}

async function getScheduleDetails(user, runId) {
    const run = await scheduleRepository.findRunDetails(runId);

    if (!run || run.userId !== user.id) {
        throw new AppError({
            message: "Schedule run not found or access denied",
            code: ERROR_CODES.OWNERSHIP_REQUIRED,
            statusCode: 403
        });
    }

    return presentScheduleRun(run, true);
}

async function getTodaySchedule(user, planId, today = new Date()) {
    const run = await scheduleRepository.findActiveRun(user.id, planId);

    if (!run) {
        throw new AppError({
            message: "No active schedule found for this plan",
            code: ERROR_CODES.NOT_FOUND,
            statusCode: 404
        });
    }

    const date = formatDateOnly(today);
    const day = await scheduleRepository.findTodayForRun(run.id, date);

    return {
        scheduleRun: presentScheduleRun(run),
        day: day ? presentScheduleDay(day) : null
    };
}

module.exports = {
    generateSchedule,
    getActiveSchedule,
    getScheduleHistory,
    getScheduleDetails,
    getTodaySchedule
};
