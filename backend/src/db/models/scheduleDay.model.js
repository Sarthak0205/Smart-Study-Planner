"use strict";

const { Model, DataTypes } = require("sequelize");

class ScheduleDay extends Model {}

function initScheduleDay(sequelize) {
    ScheduleDay.init({
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        scheduleRunId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: "schedule_run_id"
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        totalPlannedHours: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 0,
            field: "total_planned_hours",
            validate: {
                min: 0,
                max: 24
            }
        }
    }, {
        sequelize,
        tableName: "schedule_days",
        modelName: "ScheduleDay",
        indexes: [
            {
                name: "schedule_days_run_date_unique",
                unique: true,
                fields: ["schedule_run_id", "date"]
            },
            { name: "schedule_days_run_date_idx", fields: ["schedule_run_id", "date"] }
        ]
    });

    return ScheduleDay;
}

module.exports = {
    ScheduleDay,
    initScheduleDay
};
