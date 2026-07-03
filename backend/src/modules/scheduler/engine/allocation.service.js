"use strict";

const { TOPIC_STATUS } = require("../../../constants/enums");
const { addDays, formatDateOnly } = require("./date.util");
const { scoreTopic, compareScoredTopics } = require("./scoring.service");
const { buildReasonJson } = require("./explanation.service");

function roundHours(value) {
    return Number((Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2));
}

function allocatePrimarySessions({ topics, constraints, feasibility, today }) {
    const workingTopics = topics
        .filter(topic => !topic.isArchived && !topic.isCompleted && topic.remainingHours > 0)
        .map(topic => ({ ...topic }));
    const days = [];
    let dayIndex = 0;

    while (workingTopics.some(topic => topic.remainingHours > 0) && dayIndex < constraints.maxGeneratedDays) {
        const date = formatDateOnly(addDays(today, dayIndex));
        let remainingCapacity = constraints.dailyCapacityHours;
        let difficultTopicsScheduled = 0;
        const topicHoursToday = new Map();
        const items = [];

        while (remainingCapacity >= constraints.minSessionHours && workingTopics.some(topic => topic.remainingHours > 0)) {
            const scored = workingTopics
                .filter(topic => topic.remainingHours > 0)
                .map(topic => ({
                    ...topic,
                    score: scoreTopic(topic, constraints)
                }))
                .sort(compareScoredTopics);

            const selected = scored.find(candidate => {
                const alreadyAllocated = topicHoursToday.get(candidate.id) || 0;
                const difficultLimitReached = candidate.difficulty >= constraints.difficultTopicThreshold &&
                    difficultTopicsScheduled >= constraints.maxDifficultTopicsPerDay &&
                    alreadyAllocated === 0;

                return alreadyAllocated < constraints.maxSessionHours && !difficultLimitReached;
            });

            if (!selected) break;

            const targetTopic = workingTopics.find(topic => topic.id === selected.id);
            const alreadyAllocated = topicHoursToday.get(selected.id) || 0;
            const remainingTopicDailyLimit = constraints.maxSessionHours - alreadyAllocated;
            const allocatedHours = roundHours(Math.min(
                targetTopic.remainingHours,
                remainingCapacity,
                remainingTopicDailyLimit
            ));

            if (allocatedHours <= 0) break;
            if (allocatedHours < constraints.minSessionHours && targetTopic.remainingHours > allocatedHours) break;

            const type = selected.daysUntilDeadline < 0 ? "overdue_recovery" : "primary_study";
            items.push({
                topicId: selected.id,
                allocatedHours,
                priorityScore: selected.score.total,
                reasonJson: buildReasonJson({
                    topic: selected,
                    score: selected.score,
                    constraints,
                    type,
                    allocatedHours,
                    feasibility,
                    date
                })
            });

            targetTopic.remainingHours = roundHours(targetTopic.remainingHours - allocatedHours);
            remainingCapacity = roundHours(remainingCapacity - allocatedHours);
            topicHoursToday.set(selected.id, roundHours(alreadyAllocated + allocatedHours));

            if (selected.difficulty >= constraints.difficultTopicThreshold && alreadyAllocated === 0) {
                difficultTopicsScheduled += 1;
            }
        }

        if (items.length) {
            days.push({
                date,
                totalPlannedHours: roundHours(items.reduce((sum, item) => sum + item.allocatedHours, 0)),
                items
            });
        }

        dayIndex += 1;
    }

    return {
        days,
        unallocatedTopics: workingTopics.filter(topic => topic.remainingHours > 0)
    };
}

function injectRevisionSessions({ days, topics, constraints, feasibility, today }) {
    const completedCandidates = topics
        .filter(topic => !topic.isArchived && (topic.isCompleted || topic.status === TOPIC_STATUS.COMPLETED))
        .filter(topic => topic.daysUntilDeadline >= 0 && topic.daysUntilDeadline <= 7)
        .filter(topic => topic.difficulty >= constraints.difficultTopicThreshold)
        .map(topic => ({
            ...topic,
            remainingHours: constraints.revisionSessionHours,
            score: scoreTopic({ ...topic, remainingHours: constraints.revisionSessionHours }, constraints, { revision: true })
        }))
        .sort(compareScoredTopics)
        .slice(0, 3);

    if (!completedCandidates.length) return days;

    const mutableDays = days.length ? [...days] : [{
        date: formatDateOnly(today),
        totalPlannedHours: 0,
        items: []
    }];

    for (const candidate of completedCandidates) {
        const day = mutableDays.find(item => item.totalPlannedHours + constraints.revisionSessionHours <= constraints.dailyCapacityHours);
        if (!day) continue;

        day.items.push({
            topicId: candidate.id,
            allocatedHours: constraints.revisionSessionHours,
            priorityScore: candidate.score.total,
            reasonJson: buildReasonJson({
                topic: candidate,
                score: candidate.score,
                constraints,
                type: "revision",
                allocatedHours: constraints.revisionSessionHours,
                feasibility,
                date: day.date
            })
        });
        day.totalPlannedHours = roundHours(day.totalPlannedHours + constraints.revisionSessionHours);
    }

    return mutableDays.filter(day => day.items.length);
}

module.exports = {
    allocatePrimarySessions,
    injectRevisionSessions
};
