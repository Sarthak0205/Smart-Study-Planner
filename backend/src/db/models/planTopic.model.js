"use strict";

const { Model, DataTypes } = require("sequelize");
const { TOPIC_STATUS } = require("../../constants/enums");

class PlanTopic extends Model {}

function initPlanTopic(sequelize) {
    PlanTopic.init({
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        planId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: "plan_id"
        },
        name: {
            type: DataTypes.STRING(180),
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        normalizedName: {
            type: DataTypes.STRING(180),
            allowNull: false,
            field: "normalized_name",
            validate: {
                notEmpty: true
            }
        },
        difficulty: {
            type: DataTypes.DECIMAL(3, 2),
            allowNull: false,
            validate: {
                min: 1,
                max: 5
            }
        },
        estimatedHours: {
            type: DataTypes.DECIMAL(6, 2),
            allowNull: false,
            field: "estimated_hours",
            validate: {
                min: 0.01,
                max: 1000
            }
        },
        deadline: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        progress: {
            type: DataTypes.DECIMAL(5, 4),
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0,
                max: 1
            }
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: TOPIC_STATUS.PENDING,
            validate: {
                isIn: [Object.values(TOPIC_STATUS)]
            }
        },
        position: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0
            }
        }
    }, {
        sequelize,
        tableName: "plan_topics",
        modelName: "PlanTopic",
        indexes: [
            {
                name: "plan_topics_plan_normalized_name_unique",
                unique: true,
                fields: ["plan_id", "normalized_name"]
            },
            { name: "plan_topics_plan_id_idx", fields: ["plan_id"] },
            { name: "plan_topics_plan_deadline_idx", fields: ["plan_id", "deadline"] },
            { name: "plan_topics_plan_status_idx", fields: ["plan_id", "status"] },
            { name: "plan_topics_plan_position_idx", fields: ["plan_id", "position"] },
            { name: "plan_topics_schedule_input_idx", fields: ["plan_id", "status", "deadline", "progress"] }
        ]
    });

    return PlanTopic;
}

module.exports = {
    PlanTopic,
    initPlanTopic
};
