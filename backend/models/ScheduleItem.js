const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ScheduleItem = sequelize.define("ScheduleItem", {
    topic_name: DataTypes.STRING,
    allocated_hours: DataTypes.FLOAT,
    priority_score: DataTypes.FLOAT,
});

module.exports = ScheduleItem;