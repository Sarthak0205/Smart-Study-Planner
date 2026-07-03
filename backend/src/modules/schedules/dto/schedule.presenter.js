"use strict";

function presentScheduleItem(item) {
    return {
        id: Number(item.id),
        scheduleDayId: Number(item.scheduleDayId),
        topicId: Number(item.topicId),
        allocatedHours: Number(item.allocatedHours),
        priorityScore: Number(item.priorityScore),
        status: item.status,
        reason: item.reasonJson,
        topic: item.topic ? {
            id: Number(item.topic.id),
            name: item.topic.name,
            deadline: item.topic.deadline,
            difficulty: Number(item.topic.difficulty),
            progress: Number(item.topic.progress)
        } : undefined
    };
}

function presentScheduleDay(day) {
    return {
        id: Number(day.id),
        scheduleRunId: Number(day.scheduleRunId),
        date: day.date,
        totalPlannedHours: Number(day.totalPlannedHours),
        items: (day.items || []).map(presentScheduleItem)
    };
}

function presentScheduleRun(run, includeDays = false) {
    return {
        id: Number(run.id),
        userId: run.userId,
        planId: Number(run.planId),
        dailyCapacityHours: Number(run.dailyCapacityHours),
        strategy: run.strategy,
        status: run.status,
        isActive: run.isActive,
        feasibilityStatus: run.feasibilityStatus,
        requiredHours: Number(run.requiredHours),
        availableHours: Number(run.availableHours),
        deficitHours: Number(run.deficitHours),
        generatedAt: run.generatedAt,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        ...(includeDays ? { days: (run.days || []).map(presentScheduleDay) } : {})
    };
}

module.exports = {
    presentScheduleRun,
    presentScheduleDay,
    presentScheduleItem
};
