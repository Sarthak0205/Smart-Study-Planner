"use strict";

const AppError = require("../../../shared/errors/AppError");
const { ERROR_CODES } = require("../../../shared/errors/errorCodes");
const { withTransaction } = require("../../../config/database");
const { formatDateOnly } = require("../../scheduler/engine/date.util");
const repository = require("../repositories/studyLog.repository");
const {
    presentStudyLog,
    presentTopicProgress,
    presentExecutionStatus,
    presentAdherence
} = require("../dto/execution.presenter");

const {
    SCHEDULE_ITEM_STATUS,
    SCHEDULE_RUN_STATUS,
    TOPIC_STATUS
} = repository;

function isDuplicateLogError(error) {
    return error && (
        error.name === "SequelizeUniqueConstraintError"
        || error.original?.constraint === "study_logs_user_schedule_item_unique"
    );
}

function assertExecutionContext(user, context) {
    if (!context || !context.item || !context.day || !context.run || !context.topic) {
        throw new AppError({
            message: "Schedule item not found or access denied",
            code: ERROR_CODES.OWNERSHIP_REQUIRED,
            statusCode: 403
        });
    }

    if (context.run.userId !== user.id) {
        throw new AppError({
            message: "Schedule item not found or access denied",
            code: ERROR_CODES.OWNERSHIP_REQUIRED,
            statusCode: 403
        });
    }

    if (context.item.topicId !== context.topic.id) {
        throw new AppError({
            message: "Schedule item and topic relationship is inconsistent",
            code: ERROR_CODES.DATABASE_ERROR,
            statusCode: 500
        });
    }
}

function assertLoggableExecutionContext(context) {
    if (!context.run.isActive || context.run.status !== SCHEDULE_RUN_STATUS.ACTIVE) {
        throw new AppError({
            message: "Study logs can only be submitted against the active schedule run",
            code: ERROR_CODES.FORBIDDEN,
            statusCode: 403
        });
    }

    if (context.item.status === SCHEDULE_ITEM_STATUS.SUPERSEDED) {
        throw new AppError({
            message: "Cannot log study time against a superseded schedule item",
            code: ERROR_CODES.FORBIDDEN,
            statusCode: 403
        });
    }
}

function computeTopicState(topic, studiedHours, today = new Date()) {
    const estimatedHours = Number(topic.estimatedHours);
    const progress = Math.min(1, Number((studiedHours / estimatedHours).toFixed(4)));
    let status = TOPIC_STATUS.PENDING;

    if (progress >= 1) {
        status = TOPIC_STATUS.COMPLETED;
    } else if (progress > 0) {
        status = TOPIC_STATUS.IN_PROGRESS;
    }

    if (progress < 1 && topic.deadline < formatDateOnly(today)) {
        status = TOPIC_STATUS.OVERDUE;
    }

    return { progress, status };
}

function computeItemStatus({ item, day, hoursStudied, topicCompleted }) {
    const allocatedHours = Number(item.allocatedHours);
    const wasPastDue = day.date < formatDateOnly(new Date());

    if (topicCompleted || hoursStudied >= allocatedHours) {
        return wasPastDue ? SCHEDULE_ITEM_STATUS.RECOVERED : SCHEDULE_ITEM_STATUS.COMPLETED;
    }

    if (hoursStudied > 0) {
        return wasPastDue ? SCHEDULE_ITEM_STATUS.RECOVERED : SCHEDULE_ITEM_STATUS.ACTIVE;
    }

    return wasPastDue ? SCHEDULE_ITEM_STATUS.MISSED : SCHEDULE_ITEM_STATUS.PLANNED;
}

function buildFeedbackJson(payload, context) {
    return {
        source: "study_log_submission",
        deterministicVersion: "adaptive_feedback_v1",
        scheduleRunId: Number(context.run.id),
        scheduleDayId: Number(context.day.id),
        plannedHours: Number(context.item.allocatedHours),
        loggedHours: Number(payload.hoursStudied),
        signals: {
            difficultyFeedback: payload.difficultyFeedback || null,
            sessionEffectiveness: payload.sessionEffectiveness || null,
            perceivedWorkload: payload.perceivedWorkload || null
        }
    };
}

async function submitStudyLog(user, scheduleItemId, payload) {
    return withTransaction(async transaction => {
        const context = await repository.findExecutionContextForItem(scheduleItemId, transaction);
        assertExecutionContext(user, context);

        const existingLog = await repository.findStudyLogForItem(user.id, context.item.id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });
        if (existingLog) {
            throw new AppError({
                message: "A study log already exists for this schedule item",
                code: ERROR_CODES.DUPLICATE_RESOURCE,
                statusCode: 409
            });
        }

        assertLoggableExecutionContext(context);

        let studyLog;
        try {
            studyLog = await repository.createStudyLog({
                userId: user.id,
                scheduleItemId: context.item.id,
                topicId: context.topic.id,
                hoursStudied: payload.hoursStudied,
                difficultyFeedback: payload.difficultyFeedback || null,
                sessionEffectiveness: payload.sessionEffectiveness || null,
                perceivedWorkload: payload.perceivedWorkload || null,
                feedbackJson: buildFeedbackJson(payload, context),
                completedAt: payload.completedAt || new Date()
            }, { transaction });
        } catch (error) {
            if (isDuplicateLogError(error)) {
                throw new AppError({
                    message: "A study log already exists for this schedule item",
                    code: ERROR_CODES.DUPLICATE_RESOURCE,
                    statusCode: 409
                });
            }
            throw error;
        }

        const studiedHours = await repository.sumStudiedHoursForTopic(user.id, context.topic.id, { transaction });
        const topicState = computeTopicState(context.topic, studiedHours);

        await repository.updateTopic(context.topic, topicState, { transaction });

        const itemStatus = computeItemStatus({
            item: context.item,
            day: context.day,
            hoursStudied: Number(payload.hoursStudied),
            topicCompleted: topicState.status === TOPIC_STATUS.COMPLETED
        });
        await repository.updateScheduleItem(context.item, { status: itemStatus }, { transaction });

        const openItems = await repository.countOpenItemsForRun(context.run.id, { transaction });
        if (openItems === 0) {
            await repository.updateRun(context.run, {
                status: SCHEDULE_RUN_STATUS.COMPLETED,
                isActive: false
            }, { transaction });
        }

        return {
            studyLog: presentStudyLog(studyLog),
            topicProgress: presentTopicProgress(context.topic, studiedHours),
            scheduleItem: {
                id: Number(context.item.id),
                status: itemStatus
            },
            scheduleRun: {
                id: Number(context.run.id),
                status: openItems === 0 ? SCHEDULE_RUN_STATUS.COMPLETED : context.run.status,
                isActive: openItems !== 0
            }
        };
    });
}

async function getTopicProgress(user, topicId) {
    const result = await repository.findOwnedTopicWithProgress(user.id, topicId);

    if (!result) {
        throw new AppError({
            message: "Topic not found or access denied",
            code: ERROR_CODES.OWNERSHIP_REQUIRED,
            statusCode: 403
        });
    }

    return presentTopicProgress(result.topic, result.studiedHours);
}

async function getExecutionStatus(user, planId) {
    await assertOwnedPlan(user, planId);
    return presentExecutionStatus(await repository.getExecutionStatus(user.id, planId));
}

async function getAdherenceSummary(user, planId) {
    await assertOwnedPlan(user, planId);
    const status = await repository.getExecutionStatus(user.id, planId);
    const plannedHours = Number(status.plannedHours || 0);
    const studiedHours = Number(status.studiedHours || 0);
    const totalItems = Number(status.totalItems || 0);
    const completedItems = Number(status.completedItems || 0) + Number(status.recoveredItems || 0);

    return presentAdherence({
        ...status,
        completionAdherence: totalItems ? Number((completedItems / totalItems).toFixed(4)) : 0,
        hourAdherence: plannedHours ? Number((Math.min(studiedHours, plannedHours) / plannedHours).toFixed(4)) : 0
    });
}

async function getMissedSessions(user, planId) {
    await assertOwnedPlan(user, planId);
    const missedSessions = await repository.getMissedSessions(user.id, planId);
    const missedHours = missedSessions.reduce((total, session) => total + Number(session.remainingHours || 0), 0);

    return {
        missedSessions: missedSessions.map(session => ({
            scheduleItemId: Number(session.scheduleItemId),
            scheduleDayId: Number(session.scheduleDayId),
            date: session.date,
            topicId: Number(session.topicId),
            topicName: session.topicName,
            allocatedHours: Number(session.allocatedHours),
            studiedHours: Number(session.studiedHours),
            remainingHours: Number(session.remainingHours),
            status: session.status
        })),
        summary: {
            count: missedSessions.length,
            missedHours: Number(missedHours.toFixed(2))
        }
    };
}

async function getRecoveryState(user, planId) {
    await assertOwnedPlan(user, planId);
    const missed = await getMissedSessions(user, planId);
    const status = await repository.getExecutionStatus(user.id, planId);

    return {
        recoveryDebtHours: missed.summary.missedHours,
        overdueTopics: Number(status.overdueTopics || 0),
        regenerationRecommended: missed.summary.missedHours > 0 || Number(status.overdueTopics || 0) > 0,
        recommendationReason: missed.summary.missedHours > 0
            ? "missed_workload_detected"
            : (Number(status.overdueTopics || 0) > 0 ? "overdue_topics_detected" : "schedule_on_track"),
        missedSessions: missed.missedSessions
    };
}

async function assertOwnedPlan(user, planId) {
    const plan = await repository.findOwnedPlan(user.id, planId);
    if (!plan) {
        throw new AppError({
            message: "Plan not found or access denied",
            code: ERROR_CODES.OWNERSHIP_REQUIRED,
            statusCode: 403
        });
    }
}

module.exports = {
    submitStudyLog,
    getExecutionStatus,
    getTopicProgress,
    getAdherenceSummary,
    getMissedSessions,
    getRecoveryState,
    getFeedbackScoresForTopics: repository.getFeedbackScoresForTopics
};
