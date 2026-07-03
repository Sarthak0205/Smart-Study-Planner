"use strict";

const { sequelize } = require("../../config/database");
const { initUser } = require("./user.model");
const { initPlan } = require("./plan.model");
const { initPlanTopic } = require("./planTopic.model");
const { initUserPlanFollow } = require("./userPlanFollow.model");
const { initScheduleRun } = require("./scheduleRun.model");
const { initScheduleDay } = require("./scheduleDay.model");
const { initScheduleItem } = require("./scheduleItem.model");
const { initStudyLog } = require("./studyLog.model");
const { initRefreshToken } = require("./refreshToken.model");
const registerAssociations = require("../associations/registerAssociations");

const models = {
    User: initUser(sequelize),
    Plan: initPlan(sequelize),
    PlanTopic: initPlanTopic(sequelize),
    UserPlanFollow: initUserPlanFollow(sequelize),
    ScheduleRun: initScheduleRun(sequelize),
    ScheduleDay: initScheduleDay(sequelize),
    ScheduleItem: initScheduleItem(sequelize),
    StudyLog: initStudyLog(sequelize),
    RefreshToken: initRefreshToken(sequelize)
};

registerAssociations(models);

module.exports = {
    sequelize,
    ...models
};
