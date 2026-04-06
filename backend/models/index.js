const sequelize = require("../config/db");

const Topic = require("./Topic");
const Schedule = require("./Schedule");
const ScheduleItem = require("./ScheduleItem");
const StudyLog = require("./StudyLog");

// relations
Topic.hasMany(StudyLog, { as: "StudyLogs" });
StudyLog.belongsTo(Topic);


// Relationships
Schedule.hasMany(ScheduleItem);
ScheduleItem.belongsTo(Schedule);

sequelize.sync({ alter: true })
    .then(() => console.log("Tables synced"))
    .catch(err => console.error(err));

module.exports = {
    Topic,
    Schedule,
    ScheduleItem,
    StudyLog,
};