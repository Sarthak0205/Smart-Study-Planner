// models/StudyLog.js

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const StudyLog = sequelize.define("StudyLog", {
    // 🔥 ACTUAL STUDY TIME (KEEP — useful for analytics later)
    hours_studied: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
            min: 0
        }
    },

    // 🔥 CLEAN FEEDBACK (ENUM — NOT FLOAT)
    difficulty_feedback: {
        type: DataTypes.ENUM("easy", "medium", "hard"),
        allowNull: true
    },

    // 🔥 USER LINK
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },

    // 🔥 SCHEDULE ITEM LINK
    ScheduleItemId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }

}, {
    // 🔥 PREVENT DUPLICATE LOGGING
    indexes: [
        {
            unique: true,
            fields: ["userId", "ScheduleItemId"]
        }
    ]
});

module.exports = StudyLog;