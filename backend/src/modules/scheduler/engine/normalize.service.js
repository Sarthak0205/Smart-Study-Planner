"use strict";

const { TOPIC_STATUS } = require("../../../constants/enums");
const { parseDateOnly, daysBetween } = require("./date.util");

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function normalizeTopic(topic, today) {
    const estimatedHours = Number(topic.estimatedHours);
    const progress = clamp(Number(topic.progress || 0), 0, 1);
    const remainingHours = Math.max(0, estimatedHours * (1 - progress));
    const deadlineDate = parseDateOnly(topic.deadline);

    return {
        id: Number(topic.id),
        name: topic.name,
        difficulty: clamp(Number(topic.difficulty), 1, 5),
        estimatedHours,
        deadline: topic.deadline,
        deadlineDate,
        daysUntilDeadline: daysBetween(today, deadlineDate),
        progress,
        status: topic.status,
        position: topic.position || 0,
        remainingHours: Number(remainingHours.toFixed(2)),
        allocatedHours: 0,
        feedbackScore: Number(topic.feedbackScore || 0),
        isCompleted: progress >= 1 || topic.status === TOPIC_STATUS.COMPLETED,
        isArchived: topic.status === TOPIC_STATUS.ARCHIVED
    };
}

function normalizeTopics(topics, today) {
    return topics.map(topic => normalizeTopic(topic, today));
}

module.exports = {
    normalizeTopics,
    clamp
};
