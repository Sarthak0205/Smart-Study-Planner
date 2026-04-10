const Sequelize = require("sequelize");
const sequelize = require("../config/db");

// 🔹 Existing models
const Topic = require("./Topic");
const Schedule = require("./Schedule");
const ScheduleItem = require("./ScheduleItem");
const StudyLog = require("./StudyLog");

// 🔹 New models
const User = require("./User")(sequelize, Sequelize.DataTypes);
const UserSchedule = require("./UserSchedule")(sequelize, Sequelize.DataTypes);

// 🔹 ================= RELATIONS =================

// Topic ↔ StudyLog
Topic.hasMany(StudyLog, { as: "StudyLogs" });
StudyLog.belongsTo(Topic);

// Schedule ↔ ScheduleItem
Schedule.hasMany(ScheduleItem);
ScheduleItem.belongsTo(Schedule);

// 🔥 User → Schedule (OWNER)
User.hasMany(Schedule, {
    foreignKey: "ownerId",
    as: "ownedSchedules"
});

Schedule.belongsTo(User, {
    foreignKey: "ownerId",
    as: "owner"
});

// 🔥 User ↔ Schedule (FOLLOW SYSTEM)
User.belongsToMany(Schedule, {
    through: UserSchedule,
    foreignKey: "userId",
    as: "followedPlans"
});

Schedule.belongsToMany(User, {
    through: UserSchedule,
    foreignKey: "scheduleId",
    as: "followers"
});

// 🔹 ================= SYNC =================

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
    User,
    UserSchedule
};