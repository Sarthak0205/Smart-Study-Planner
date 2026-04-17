const Sequelize = require("sequelize");
const sequelize = require("../config/db");

// 🔹 Models
const Topic = require("./Topic");
const Schedule = require("./Schedule");
const ScheduleItem = require("./ScheduleItem");
const StudyLog = require("./StudyLog");

const User = require("./User")(sequelize, Sequelize.DataTypes);

// ❌ REMOVED UserSchedule (COPY MODEL → no need)

// 🔹 ================= RELATIONS =================

// ================= USER ↔ TOPIC =================
User.hasMany(Topic, {
    foreignKey: "userId",
    onDelete: "CASCADE"
});

Topic.belongsTo(User, {
    foreignKey: "userId"
});

// ================= PLAN (Schedule) ↔ TOPIC =================
Schedule.hasMany(Topic, {
    foreignKey: "planId",
    onDelete: "CASCADE"
});

Topic.belongsTo(Schedule, {
    foreignKey: "planId"
});

// ================= USER ↔ SCHEDULE (OWNER) =================
User.hasMany(Schedule, {
    foreignKey: "ownerId",
    as: "ownedSchedules",
    onDelete: "CASCADE"
});

Schedule.belongsTo(User, {
    foreignKey: "ownerId",
    as: "owner"
});

// ================= SCHEDULE ↔ SCHEDULE ITEM =================
Schedule.hasMany(ScheduleItem, {
    foreignKey: "ScheduleId",
    onDelete: "CASCADE"
});

ScheduleItem.belongsTo(Schedule, {
    foreignKey: "ScheduleId"
});

// ================= SCHEDULE ITEM ↔ STUDY LOG =================
ScheduleItem.hasMany(StudyLog, {
    foreignKey: "ScheduleItemId",
    onDelete: "CASCADE"
});

StudyLog.belongsTo(ScheduleItem, {
    foreignKey: "ScheduleItemId"
});

// ================= USER ↔ STUDY LOG =================
User.hasMany(StudyLog, {
    foreignKey: "userId",
    onDelete: "CASCADE"
});

StudyLog.belongsTo(User, {
    foreignKey: "userId"
});

// 🔹 ================= SYNC =================

// ⚠️ SAFE FOR DEV ONLY
sequelize.sync({ alter: true })
    .then(() => console.log("Tables synced"))
    .catch(err => console.error(err));

// 🔹 ================= EXPORT =================

module.exports = {
    sequelize,
    Sequelize,
    Topic,
    Schedule,
    ScheduleItem,
    StudyLog,
    User
};