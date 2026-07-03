"use strict";

const { Model, DataTypes } = require("sequelize");
const { FEASIBILITY_STATUS, SCHEDULE_RUN_STATUS } = require("../../constants/enums");

class ScheduleRun extends Model {}

function initScheduleRun(sequelize) {
    ScheduleRun.init({
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
        planId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: "plan_id"
        },
        dailyCapacityHours: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            field: "daily_capacity_hours",
            validate: {
                min: 0.01,
                max: 24
            }
        },
        strategy: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: "priority_balanced_v1"
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: SCHEDULE_RUN_STATUS.GENERATING,
            validate: {
                isIn: [Object.values(SCHEDULE_RUN_STATUS)]
            }
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: "is_active"
        },
        feasibilityStatus: {
            type: DataTypes.STRING(20),
            allowNull: false,
            field: "feasibility_status",
            validate: {
                isIn: [Object.values(FEASIBILITY_STATUS)]
            }
        },
        requiredHours: {
            type: DataTypes.DECIMAL(8, 2),
            allowNull: false,
            defaultValue: 0,
            field: "required_hours",
            validate: {
                min: 0
            }
        },
        availableHours: {
            type: DataTypes.DECIMAL(8, 2),
            allowNull: false,
            defaultValue: 0,
            field: "available_hours",
            validate: {
                min: 0
            }
        },
        deficitHours: {
            type: DataTypes.DECIMAL(8, 2),
            allowNull: false,
            defaultValue: 0,
            field: "deficit_hours",
            validate: {
                min: 0
            }
        },
        generatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: "generated_at",
            defaultValue: DataTypes.NOW
        }
    }, {
        sequelize,
        tableName: "schedule_runs",
        modelName: "ScheduleRun",
        indexes: [
            { name: "schedule_runs_user_plan_idx", fields: ["user_id", "plan_id"] },
            { name: "schedule_runs_plan_created_idx", fields: ["plan_id", "created_at"] },
            {
                name: "schedule_runs_one_active_per_user_plan_idx",
                unique: true,
                fields: ["user_id", "plan_id"],
                where: { is_active: true }
            },
            {
                name: "schedule_runs_active_lookup_idx",
                fields: ["user_id", "plan_id", "is_active"],
                where: { is_active: true }
            }
        ]
    });

    return ScheduleRun;
}

module.exports = {
    ScheduleRun,
    initScheduleRun
};
