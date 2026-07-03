"use strict";

const { SCORE_WEIGHTS } = require("./scheduler.constants");
const { clamp } = require("./normalize.service");

function scoreTopic(topic, constraints, { revision = false } = {}) {
    const daysLeft = topic.daysUntilDeadline;
    const urgency = daysLeft < 0
        ? 1
        : clamp(1 - (daysLeft / constraints.planningHorizonDays), 0, 1);
    const capacityWindow = Math.max(1, Math.max(0, daysLeft) + 1) * constraints.dailyCapacityHours;
    const workloadPressure = clamp(topic.remainingHours / capacityWindow, 0, 1);
    const difficulty = clamp(topic.difficulty / 5, 0, 1);
    const progressGap = clamp(1 - topic.progress, 0, 1);
    const feedback = clamp(topic.feedbackScore, 0, 1);
    const revisionNeed = revision
        ? clamp((difficulty + urgency) / 2, 0, 1)
        : 0;

    const total =
        (SCORE_WEIGHTS.urgency * urgency) +
        (SCORE_WEIGHTS.workloadPressure * workloadPressure) +
        (SCORE_WEIGHTS.difficulty * difficulty) +
        (SCORE_WEIGHTS.progressGap * progressGap) +
        (SCORE_WEIGHTS.feedback * feedback) +
        (SCORE_WEIGHTS.revision * revisionNeed);

    return {
        total: Number(total.toFixed(5)),
        urgency: Number(urgency.toFixed(5)),
        workloadPressure: Number(workloadPressure.toFixed(5)),
        difficulty: Number(difficulty.toFixed(5)),
        progressGap: Number(progressGap.toFixed(5)),
        feedback: Number(feedback.toFixed(5)),
        revision: Number(revisionNeed.toFixed(5)),
        weights: SCORE_WEIGHTS
    };
}

function compareScoredTopics(a, b) {
    if (b.score.total !== a.score.total) return b.score.total - a.score.total;
    if (a.daysUntilDeadline !== b.daysUntilDeadline) return a.daysUntilDeadline - b.daysUntilDeadline;
    if (b.remainingHours !== a.remainingHours) return b.remainingHours - a.remainingHours;
    if (b.difficulty !== a.difficulty) return b.difficulty - a.difficulty;
    return a.id - b.id;
}

module.exports = {
    scoreTopic,
    compareScoredTopics
};
