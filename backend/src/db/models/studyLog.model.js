"use strict";

const { Model, DataTypes } = require("sequelize");
const {
    DIFFICULTY_FEEDBACK,
    SESSION_EFFECTIVENESS,
    PERCEIVED_WORKLOAD
} = require("../../constants/enums");

class StudyLog extends Model {}

function initStudyLog(sequelize) {
    StudyLog.init({
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: "user_id"
        },
        scheduleItemId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: "schedule_item_id"
        },
        topicId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: "topic_id"
        },
        hoursStudied: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            field: "hours_studied",
            validate: {
                min: 0.01,
                max: 24
            }
        },
        difficultyFeedback: {
            type: DataTypes.STRING(20),
            allowNull: true,
            field: "difficulty_feedback",
            validate: {
                isIn: [Object.values(DIFFICULTY_FEEDBACK)]
            }
        },
        sessionEffectiveness: {
            type: DataTypes.STRING(20),
            allowNull: true,
            field: "session_effectiveness",
            validate: {
                isIn: [Object.values(SESSION_EFFECTIVENESS)]
            }
        },
        perceivedWorkload: {
            type: DataTypes.STRING(20),
            allowNull: true,
            field: "perceived_workload",
            validate: {
                isIn: [Object.values(PERCEIVED_WORKLOAD)]
            }
        },
        feedbackJson: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
            field: "feedback_json"
        },
        completedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: "completed_at",
            defaultValue: DataTypes.NOW
        }
    }, {
        sequelize,
        tableName: "study_logs",
        modelName: "StudyLog",
        indexes: [
            {
                name: "study_logs_user_schedule_item_unique",
                unique: true,
                fields: ["user_id", "schedule_item_id"]
            },
            { name: "study_logs_user_completed_idx", fields: ["user_id", "completed_at"] },
            { name: "study_logs_topic_idx", fields: ["topic_id"] },
            { name: "study_logs_schedule_item_idx", fields: ["schedule_item_id"] },
            { name: "study_logs_topic_completed_idx", fields: ["topic_id", "completed_at"] },
            { name: "study_logs_user_topic_completed_idx", fields: ["user_id", "topic_id", "completed_at"] }
        ]
    });

    return StudyLog;
}

module.exports = {
    StudyLog,
    initStudyLog
};
