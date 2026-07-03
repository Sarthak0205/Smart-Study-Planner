"use strict";

function registerAssociations(models) {
    const {
        User,
        Plan,
        PlanTopic,
        UserPlanFollow,
        ScheduleRun,
        ScheduleDay,
        ScheduleItem,
        StudyLog,
        RefreshToken
    } = models;

    User.hasMany(Plan, {
        foreignKey: "ownerId",
        as: "ownedPlans",
        onDelete: "CASCADE"
    });
    Plan.belongsTo(User, {
        foreignKey: "ownerId",
        as: "owner"
    });

    Plan.belongsTo(Plan, {
        foreignKey: "sourcePlanId",
        as: "sourcePlan"
    });
    Plan.hasMany(Plan, {
        foreignKey: "sourcePlanId",
        as: "clonedPlans"
    });

    Plan.hasMany(PlanTopic, {
        foreignKey: "planId",
        as: "topics",
        onDelete: "CASCADE"
    });
    PlanTopic.belongsTo(Plan, {
        foreignKey: "planId",
        as: "plan"
    });

    User.hasMany(UserPlanFollow, {
        foreignKey: "userId",
        as: "followedPlans",
        onDelete: "CASCADE"
    });
    UserPlanFollow.belongsTo(User, {
        foreignKey: "userId",
        as: "user"
    });

    Plan.hasMany(UserPlanFollow, {
        foreignKey: "sourcePlanId",
        as: "followers"
    });
    UserPlanFollow.belongsTo(Plan, {
        foreignKey: "sourcePlanId",
        as: "sourcePlan"
    });
    UserPlanFollow.belongsTo(Plan, {
        foreignKey: "clonedPlanId",
        as: "clonedPlan"
    });

    User.hasMany(ScheduleRun, {
        foreignKey: "userId",
        as: "scheduleRuns",
        onDelete: "CASCADE"
    });
    ScheduleRun.belongsTo(User, {
        foreignKey: "userId",
        as: "user"
    });

    Plan.hasMany(ScheduleRun, {
        foreignKey: "planId",
        as: "scheduleRuns",
        onDelete: "CASCADE"
    });
    ScheduleRun.belongsTo(Plan, {
        foreignKey: "planId",
        as: "plan"
    });

    ScheduleRun.hasMany(ScheduleDay, {
        foreignKey: "scheduleRunId",
        as: "days",
        onDelete: "CASCADE"
    });
    ScheduleDay.belongsTo(ScheduleRun, {
        foreignKey: "scheduleRunId",
        as: "scheduleRun"
    });

    ScheduleDay.hasMany(ScheduleItem, {
        foreignKey: "scheduleDayId",
        as: "items",
        onDelete: "CASCADE"
    });
    ScheduleItem.belongsTo(ScheduleDay, {
        foreignKey: "scheduleDayId",
        as: "scheduleDay"
    });

    PlanTopic.hasMany(ScheduleItem, {
        foreignKey: "topicId",
        as: "scheduleItems"
    });
    ScheduleItem.belongsTo(PlanTopic, {
        foreignKey: "topicId",
        as: "topic"
    });

    User.hasMany(StudyLog, {
        foreignKey: "userId",
        as: "studyLogs",
        onDelete: "CASCADE"
    });
    StudyLog.belongsTo(User, {
        foreignKey: "userId",
        as: "user"
    });

    ScheduleItem.hasMany(StudyLog, {
        foreignKey: "scheduleItemId",
        as: "studyLogs"
    });
    StudyLog.belongsTo(ScheduleItem, {
        foreignKey: "scheduleItemId",
        as: "scheduleItem"
    });

    PlanTopic.hasMany(StudyLog, {
        foreignKey: "topicId",
        as: "studyLogs"
    });
    StudyLog.belongsTo(PlanTopic, {
        foreignKey: "topicId",
        as: "topic"
    });

    User.hasMany(RefreshToken, {
        foreignKey: "userId",
        as: "refreshTokens",
        onDelete: "CASCADE"
    });
    RefreshToken.belongsTo(User, {
        foreignKey: "userId",
        as: "user"
    });
    RefreshToken.belongsTo(RefreshToken, {
        foreignKey: "replacedByTokenId",
        as: "replacement"
    });
}

module.exports = registerAssociations;
