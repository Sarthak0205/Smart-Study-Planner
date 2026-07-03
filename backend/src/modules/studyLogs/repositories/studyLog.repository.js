"use strict";

const { QueryTypes, Op } = require("sequelize");
const {
    sequelize,
    Plan,
    PlanTopic,
    ScheduleRun,
    ScheduleDay,
    ScheduleItem,
    StudyLog
} = require("../../../db/models");
const {
    SCHEDULE_ITEM_STATUS,
    SCHEDULE_RUN_STATUS,
    TOPIC_STATUS
} = require("../../../constants/enums");
const { formatDateOnly } = require("../../scheduler/engine/date.util");

async function findExecutionContextForItem(scheduleItemId, transaction) {
    const item = await ScheduleItem.findByPk(scheduleItemId, {
        transaction,
        lock: transaction.LOCK.UPDATE
    });

    if (!item) return null;

    const day = await ScheduleDay.findByPk(item.scheduleDayId, {
        transaction,
        lock: transaction.LOCK.UPDATE
    });
    const run = day ? await ScheduleRun.findByPk(day.scheduleRunId, {
        transaction,
        lock: transaction.LOCK.UPDATE
    }) : null;
    const topic = await PlanTopic.findByPk(item.topicId, {
        transaction,
        lock: transaction.LOCK.UPDATE
    });

    return { item, day, run, topic };
}

async function createStudyLog(payload, options = {}) {
    return StudyLog.create(payload, options);
}

async function findStudyLogForItem(userId, scheduleItemId, options = {}) {
    return StudyLog.findOne({
        where: { userId, scheduleItemId },
        ...options
    });
}

async function sumStudiedHoursForTopic(userId, topicId, options = {}) {
    const value = await StudyLog.sum("hoursStudied", {
        where: { userId, topicId },
        ...options
    });

    return Number(value || 0);
}

async function updateTopic(topic, payload, options = {}) {
    return topic.update(payload, options);
}

async function updateScheduleItem(item, payload, options = {}) {
    return item.update(payload, options);
}

async function countOpenItemsForRun(runId, options = {}) {
    const days = await ScheduleDay.findAll({
        where: { scheduleRunId: runId },
        attributes: ["id"],
        ...options
    });
    const dayIds = days.map(day => day.id);

    if (!dayIds.length) return 0;

    return ScheduleItem.count({
        where: {
            scheduleDayId: dayIds,
            status: {
                [Op.in]: [
                    SCHEDULE_ITEM_STATUS.PLANNED,
                    SCHEDULE_ITEM_STATUS.ACTIVE,
                    SCHEDULE_ITEM_STATUS.MISSED
                ]
            }
        },
        ...options
    });
}

async function updateRun(run, payload, options = {}) {
    return run.update(payload, options);
}

async function findOwnedTopicWithProgress(userId, topicId) {
    const topic = await PlanTopic.findByPk(topicId, {
        include: [{
            model: Plan,
            as: "plan",
            attributes: ["id", "ownerId"]
        }]
    });

    if (!topic || !topic.plan || topic.plan.ownerId !== userId) return null;

    const studiedHours = await sumStudiedHoursForTopic(userId, topic.id);
    return { topic, studiedHours };
}

async function findOwnedPlan(userId, planId) {
    return Plan.findOne({
        where: {
            id: planId,
            ownerId: userId
        },
        attributes: ["id", "ownerId", "title", "status"]
    });
}

async function getExecutionStatus(userId, planId, today = new Date()) {
    const [row] = await sequelize.query(`
        WITH target_run AS (
            SELECT id, plan_id
            FROM schedule_runs
            WHERE user_id = :userId
              AND plan_id = :planId
            ORDER BY is_active DESC, generated_at DESC, id DESC
            LIMIT 1
        ),
        run_items AS (
            SELECT si.id, si.status, si.allocated_hours, sd.date
            FROM target_run ar
            JOIN schedule_days sd ON sd.schedule_run_id = ar.id
            JOIN schedule_items si ON si.schedule_day_id = sd.id
        ),
        log_totals AS (
            SELECT COALESCE(SUM(sl.hours_studied), 0) AS studied_hours
            FROM target_run ar
            JOIN study_logs sl ON sl.user_id = :userId
            JOIN plan_topics pt ON pt.id = sl.topic_id AND pt.plan_id = ar.plan_id
        ),
        topic_totals AS (
            SELECT
                COUNT(*) AS total_topics,
                COUNT(*) FILTER (WHERE status = 'completed') AS completed_topics,
                COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_topics
            FROM plan_topics
            WHERE plan_id = :planId
        )
        SELECT
            :planId::bigint AS "planId",
            (SELECT id FROM target_run) AS "activeRunId",
            COUNT(ri.id) AS "totalItems",
            COUNT(ri.id) FILTER (WHERE ri.status = 'planned') AS "plannedItems",
            COUNT(ri.id) FILTER (WHERE ri.status = 'active') AS "activeItems",
            COUNT(ri.id) FILTER (WHERE ri.status = 'completed') AS "completedItems",
            COUNT(ri.id) FILTER (WHERE ri.status = 'missed' OR (ri.status IN ('planned', 'active') AND ri.date < :today)) AS "missedItems",
            COUNT(ri.id) FILTER (WHERE ri.status = 'skipped') AS "skippedItems",
            COUNT(ri.id) FILTER (WHERE ri.status = 'recovered') AS "recoveredItems",
            COALESCE(SUM(ri.allocated_hours), 0) AS "plannedHours",
            COALESCE(MAX(lt.studied_hours), 0) AS "studiedHours",
            COALESCE(SUM(ri.allocated_hours) FILTER (WHERE ri.status = 'missed' OR (ri.status IN ('planned', 'active') AND ri.date < :today)), 0) AS "missedHours",
            COALESCE(MAX(tt.total_topics), 0) AS "totalTopics",
            COALESCE(MAX(tt.completed_topics), 0) AS "completedTopics",
            COALESCE(MAX(tt.overdue_topics), 0) AS "overdueTopics"
        FROM target_run ar
        LEFT JOIN run_items ri ON true
        CROSS JOIN log_totals lt
        CROSS JOIN topic_totals tt;
    `, {
        type: QueryTypes.SELECT,
        replacements: {
            userId,
            planId,
            today: formatDateOnly(today)
        }
    });

    return row;
}

async function getMissedSessions(userId, planId, today = new Date()) {
    return sequelize.query(`
        SELECT
            si.id AS "scheduleItemId",
            sd.id AS "scheduleDayId",
            sd.date,
            si.topic_id AS "topicId",
            pt.name AS "topicName",
            si.allocated_hours AS "allocatedHours",
            COALESCE(SUM(sl.hours_studied), 0) AS "studiedHours",
            GREATEST(si.allocated_hours - COALESCE(SUM(sl.hours_studied), 0), 0) AS "remainingHours",
            si.status
        FROM schedule_runs sr
        JOIN schedule_days sd ON sd.schedule_run_id = sr.id
        JOIN schedule_items si ON si.schedule_day_id = sd.id
        JOIN plan_topics pt ON pt.id = si.topic_id
        LEFT JOIN study_logs sl ON sl.schedule_item_id = si.id AND sl.user_id = sr.user_id
        WHERE sr.user_id = :userId
          AND sr.plan_id = :planId
          AND sr.is_active = true
          AND sd.date < :today
          AND si.status IN ('planned', 'active', 'missed')
        GROUP BY si.id, sd.id, pt.id
        ORDER BY sd.date ASC, si.priority_score DESC;
    `, {
        type: QueryTypes.SELECT,
        replacements: {
            userId,
            planId,
            today: formatDateOnly(today)
        }
    });
}

async function getFeedbackScoresForTopics(userId, topicIds, options = {}) {
    if (!topicIds.length) return new Map();

    const rows = await StudyLog.findAll({
        where: {
            userId,
            topicId: topicIds
        },
        attributes: ["topicId", "difficultyFeedback", "sessionEffectiveness", "perceivedWorkload"],
        ...options
    });

    const buckets = new Map();
    for (const row of rows) {
        const topicId = Number(row.topicId);
        const current = buckets.get(topicId) || { total: 0, count: 0 };
        let score = 0;

        if (row.difficultyFeedback === "hard") score += 0.35;
        if (row.difficultyFeedback === "medium") score += 0.15;
        if (row.difficultyFeedback === "easy") score -= 0.1;
        if (row.sessionEffectiveness === "low") score += 0.2;
        if (row.sessionEffectiveness === "high") score -= 0.1;
        if (row.perceivedWorkload === "heavy") score += 0.2;
        if (row.perceivedWorkload === "light") score -= 0.1;

        current.total += score;
        current.count += 1;
        buckets.set(topicId, current);
    }

    const scores = new Map();
    for (const [topicId, bucket] of buckets.entries()) {
        const average = bucket.count ? bucket.total / bucket.count : 0;
        scores.set(topicId, Math.max(-0.25, Math.min(0.75, Number(average.toFixed(4)))));
    }

    return scores;
}

module.exports = {
    findExecutionContextForItem,
    createStudyLog,
    findStudyLogForItem,
    sumStudiedHoursForTopic,
    updateTopic,
    updateScheduleItem,
    countOpenItemsForRun,
    updateRun,
    findOwnedTopicWithProgress,
    findOwnedPlan,
    getExecutionStatus,
    getMissedSessions,
    getFeedbackScoresForTopics,
    SCHEDULE_RUN_STATUS,
    SCHEDULE_ITEM_STATUS,
    TOPIC_STATUS
};
