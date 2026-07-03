"use strict";

const { STRATEGY_VERSION } = require("./scheduler.constants");

function buildReasonJson({ topic, score, constraints, type, allocatedHours, feasibility, date }) {
    const isOverdue = topic.daysUntilDeadline < 0;

    return {
        type,
        strategy: STRATEGY_VERSION,
        score,
        constraints: {
            dailyCapacityHours: constraints.dailyCapacityHours,
            minSessionHours: constraints.minSessionHours,
            maxSessionHours: constraints.maxSessionHours,
            maxDifficultTopicsPerDay: constraints.maxDifficultTopicsPerDay
        },
        context: {
            topicId: topic.id,
            topicName: topic.name,
            scheduledDate: date,
            allocatedHours,
            remainingHoursBeforeAllocation: Number(topic.remainingHours.toFixed(2)),
            daysUntilDeadline: topic.daysUntilDeadline,
            difficulty: topic.difficulty,
            progress: topic.progress
        },
        decision: {
            reason: isOverdue
                ? "Topic is overdue and incomplete, so it was prioritized for recovery."
                : type === "revision"
                    ? "Light revision added because the completed topic is difficult and near its deadline."
                    : "Scheduled by deterministic priority using urgency, workload pressure, difficulty, progress gap, and feedback.",
            tieBreakers: ["priority_desc", "deadline_asc", "remaining_hours_desc", "difficulty_desc", "topic_id_asc"]
        },
        risk: {
            feasibilityStatus: feasibility.status,
            loadRatio: feasibility.loadRatio,
            warnings: [
                ...feasibility.warnings,
                ...(isOverdue ? ["deadline_missed"] : [])
            ]
        }
    };
}

module.exports = {
    buildReasonJson
};
