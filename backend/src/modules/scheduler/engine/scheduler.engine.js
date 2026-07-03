"use strict";

const AppError = require("../../../shared/errors/AppError");
const { ERROR_CODES } = require("../../../shared/errors/errorCodes");
const { FEASIBILITY_STATUS } = require("../../../constants/enums");
const { DEFAULT_CONSTRAINTS, STRATEGY_VERSION } = require("./scheduler.constants");
const { toDateOnly } = require("./date.util");
const { normalizeTopics } = require("./normalize.service");
const { calculateFeasibility } = require("./feasibility.service");
const { allocatePrimarySessions, injectRevisionSessions } = require("./allocation.service");

function buildConstraints(input = {}) {
    return {
        ...DEFAULT_CONSTRAINTS,
        ...input,
        dailyCapacityHours: Number(input.dailyCapacityHours || DEFAULT_CONSTRAINTS.dailyCapacityHours)
    };
}

function generateScheduleDraft({ topics, constraints: inputConstraints = {}, today = new Date(), allowImpossible = false }) {
    const constraints = buildConstraints(inputConstraints);
    const normalizedToday = toDateOnly(today);
    const normalizedTopics = normalizeTopics(topics, normalizedToday);
    const activeTopics = normalizedTopics.filter(topic => !topic.isArchived);

    if (!activeTopics.length) {
        throw new AppError({
            message: "Plan has no schedulable topics",
            code: ERROR_CODES.VALIDATION_ERROR,
            statusCode: 400
        });
    }

    const feasibility = calculateFeasibility(normalizedTopics, constraints, normalizedToday);

    if (feasibility.requiredHours === 0) {
        let revisionDays = injectRevisionSessions({
            days: [],
            topics: normalizedTopics,
            constraints,
            feasibility,
            today: normalizedToday
        });

        return {
            strategy: STRATEGY_VERSION,
            constraints,
            feasibility,
            days: revisionDays
        };
    }

    if (feasibility.status === FEASIBILITY_STATUS.IMPOSSIBLE && !allowImpossible) {
        throw new AppError({
            message: "Schedule is impossible with the current daily capacity and deadlines",
            code: ERROR_CODES.VALIDATION_ERROR,
            statusCode: 422,
            details: feasibility
        });
    }

    const allocation = allocatePrimarySessions({
        topics: normalizedTopics,
        constraints,
        feasibility,
        today: normalizedToday
    });

    const days = injectRevisionSessions({
        days: allocation.days,
        topics: normalizedTopics,
        constraints,
        feasibility,
        today: normalizedToday
    });

    return {
        strategy: STRATEGY_VERSION,
        constraints,
        feasibility: {
            ...feasibility,
            warnings: [
                ...feasibility.warnings,
                ...(allocation.unallocatedTopics.length ? ["unallocated_work_remaining"] : [])
            ]
        },
        days
    };
}

module.exports = {
    generateScheduleDraft,
    buildConstraints
};
