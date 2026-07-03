const USER_ROLES = Object.freeze({
    STUDENT: "student",
    TEACHER: "teacher",
    ADMIN: "admin"
});

const PLAN_VISIBILITY = Object.freeze({
    PRIVATE: "private",
    PUBLIC: "public"
});

const PLAN_STATUS = Object.freeze({
    DRAFT: "draft",
    PUBLISHED: "published",
    ARCHIVED: "archived"
});

const SCHEDULE_RUN_STATUS = Object.freeze({
    GENERATING: "generating",
    ACTIVE: "active",
    SUPERSEDED: "superseded",
    FAILED: "failed",
    COMPLETED: "completed"
});

const FEASIBILITY_STATUS = Object.freeze({
    FEASIBLE: "feasible",
    TIGHT: "tight",
    AT_RISK: "at_risk",
    IMPOSSIBLE: "impossible"
});

const SCHEDULE_ITEM_STATUS = Object.freeze({
    PLANNED: "planned",
    ACTIVE: "active",
    COMPLETED: "completed",
    MISSED: "missed",
    SKIPPED: "skipped",
    RECOVERED: "recovered",
    SUPERSEDED: "superseded"
});

const TOPIC_STATUS = Object.freeze({
    PENDING: "pending",
    NOT_STARTED: "not_started",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed",
    OVERDUE: "overdue",
    ARCHIVED: "archived"
});

const DIFFICULTY_FEEDBACK = Object.freeze({
    EASY: "easy",
    MEDIUM: "medium",
    HARD: "hard"
});

const SESSION_EFFECTIVENESS = Object.freeze({
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high"
});

const PERCEIVED_WORKLOAD = Object.freeze({
    LIGHT: "light",
    EXPECTED: "expected",
    HEAVY: "heavy"
});

module.exports = {
    USER_ROLES,
    PLAN_VISIBILITY,
    PLAN_STATUS,
    SCHEDULE_RUN_STATUS,
    FEASIBILITY_STATUS,
    SCHEDULE_ITEM_STATUS,
    TOPIC_STATUS,
    DIFFICULTY_FEEDBACK,
    SESSION_EFFECTIVENESS,
    PERCEIVED_WORKLOAD
};
