"use strict";

const { FEASIBILITY_STATUS } = require("../../../constants/enums");

function calculateFeasibility(topics, constraints, today) {
    const incompleteTopics = topics.filter(topic => !topic.isArchived && !topic.isCompleted && topic.remainingHours > 0);
    const requiredHours = incompleteTopics.reduce((sum, topic) => sum + topic.remainingHours, 0);
    const latestDeadlineOffset = incompleteTopics.length
        ? Math.max(...incompleteTopics.map(topic => Math.max(0, topic.daysUntilDeadline)))
        : 0;
    const studyDays = Math.max(1, latestDeadlineOffset + 1);
    const availableHours = studyDays * constraints.dailyCapacityHours;
    const loadRatio = requiredHours / Math.max(availableHours, 1);
    const deficitHours = Math.max(0, requiredHours - availableHours);

    let status = FEASIBILITY_STATUS.FEASIBLE;
    if (loadRatio > 1.3) status = FEASIBILITY_STATUS.IMPOSSIBLE;
    else if (loadRatio > 1) status = FEASIBILITY_STATUS.AT_RISK;
    else if (loadRatio > 0.8) status = FEASIBILITY_STATUS.TIGHT;

    const overdueTopics = incompleteTopics.filter(topic => topic.daysUntilDeadline < 0);
    if (overdueTopics.length && status === FEASIBILITY_STATUS.FEASIBLE) {
        status = FEASIBILITY_STATUS.TIGHT;
    }

    return {
        status,
        requiredHours: Number(requiredHours.toFixed(2)),
        availableHours: Number(availableHours.toFixed(2)),
        deficitHours: Number(deficitHours.toFixed(2)),
        loadRatio: Number(loadRatio.toFixed(4)),
        studyDays,
        latestDeadlineOffset,
        warnings: [
            ...(deficitHours > 0 ? ["insufficient_capacity"] : []),
            ...(overdueTopics.length ? ["overdue_topics_present"] : [])
        ]
    };
}

module.exports = {
    calculateFeasibility
};
