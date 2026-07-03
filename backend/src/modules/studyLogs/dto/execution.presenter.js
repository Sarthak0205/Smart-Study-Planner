"use strict";

function numberOrZero(value) {
    return Number(value || 0);
}

function presentStudyLog(log) {
    return {
        id: Number(log.id),
        userId: log.userId,
        scheduleItemId: Number(log.scheduleItemId),
        topicId: Number(log.topicId),
        hoursStudied: Number(log.hoursStudied),
        difficultyFeedback: log.difficultyFeedback,
        sessionEffectiveness: log.sessionEffectiveness,
        perceivedWorkload: log.perceivedWorkload,
        feedback: log.feedbackJson || {},
        completedAt: log.completedAt,
        createdAt: log.createdAt
    };
}

function presentTopicProgress(topic, studiedHours = 0) {
    return {
        topicId: Number(topic.id),
        planId: Number(topic.planId),
        name: topic.name,
        estimatedHours: Number(topic.estimatedHours),
        studiedHours: numberOrZero(studiedHours),
        progress: Number(topic.progress),
        status: topic.status,
        deadline: topic.deadline,
        updatedAt: topic.updatedAt
    };
}

function presentExecutionStatus(status) {
    return {
        planId: Number(status.planId),
        activeRunId: status.activeRunId ? Number(status.activeRunId) : null,
        items: {
            total: numberOrZero(status.totalItems),
            planned: numberOrZero(status.plannedItems),
            active: numberOrZero(status.activeItems),
            completed: numberOrZero(status.completedItems),
            missed: numberOrZero(status.missedItems),
            skipped: numberOrZero(status.skippedItems),
            recovered: numberOrZero(status.recoveredItems)
        },
        hours: {
            planned: numberOrZero(status.plannedHours),
            studied: numberOrZero(status.studiedHours),
            missed: numberOrZero(status.missedHours)
        },
        topics: {
            total: numberOrZero(status.totalTopics),
            completed: numberOrZero(status.completedTopics),
            overdue: numberOrZero(status.overdueTopics)
        }
    };
}

function presentAdherence(summary) {
    return {
        planId: Number(summary.planId),
        activeRunId: summary.activeRunId ? Number(summary.activeRunId) : null,
        plannedHours: numberOrZero(summary.plannedHours),
        studiedHours: numberOrZero(summary.studiedHours),
        missedHours: numberOrZero(summary.missedHours),
        completionAdherence: Number(summary.completionAdherence || 0),
        hourAdherence: Number(summary.hourAdherence || 0),
        completedItems: numberOrZero(summary.completedItems),
        totalItems: numberOrZero(summary.totalItems)
    };
}

module.exports = {
    presentStudyLog,
    presentTopicProgress,
    presentExecutionStatus,
    presentAdherence
};
