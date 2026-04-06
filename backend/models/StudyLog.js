const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const StudyLog = sequelize.define("StudyLog", {
    hours_studied: DataTypes.FLOAT,
    difficulty_feedback: DataTypes.INTEGER,
});

module.exports = StudyLog;