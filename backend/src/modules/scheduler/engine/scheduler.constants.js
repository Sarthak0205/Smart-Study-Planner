"use strict";

const STRATEGY_VERSION = "priority_balanced_v1";

const DEFAULT_CONSTRAINTS = Object.freeze({
    dailyCapacityHours: 4,
    planningHorizonDays: 30,
    minSessionHours: 0.5,
    maxSessionHours: 2,
    maxDifficultTopicsPerDay: 2,
    difficultTopicThreshold: 4,
    revisionSessionHours: 0.5,
    maxRecoveryHoursPerDayRatio: 0.6,
    maxGeneratedDays: 180
});

const SCORE_WEIGHTS = Object.freeze({
    urgency: 0.30,
    workloadPressure: 0.25,
    difficulty: 0.15,
    progressGap: 0.15,
    feedback: 0.10,
    revision: 0.05
});

module.exports = {
    STRATEGY_VERSION,
    DEFAULT_CONSTRAINTS,
    SCORE_WEIGHTS
};
