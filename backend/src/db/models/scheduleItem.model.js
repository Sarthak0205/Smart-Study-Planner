"use strict";

const { Model, DataTypes } = require("sequelize");
const { SCHEDULE_ITEM_STATUS } = require("../../constants/enums");

class ScheduleItem extends Model {}

function initScheduleItem(sequelize) {
    ScheduleItem.init({
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        scheduleDayId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: "schedule_day_id"
        },
        topicId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: "topic_id"
        },
        allocatedHours: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            field: "allocated_hours",
            validate: {
                min: 0.01,
                max: 24
            }
        },
        priorityScore: {
            type: DataTypes.DECIMAL(8, 5),
            allowNull: false,
            field: "priority_score",
            validate: {
                min: 0
            }
        },
        reasonJson: {
            type: DataTypes.JSONB,
            allowNull: false,
            field: "reason_json"
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: SCHEDULE_ITEM_STATUS.PLANNED,
            validate: {
                isIn: [Object.values(SCHEDULE_ITEM_STATUS)]
            }
        }
    }, {
        sequelize,
        tableName: "schedule_items",
        modelName: "ScheduleItem",
        indexes: [
            { name: "schedule_items_day_idx", fields: ["schedule_day_id"] },
            { name: "schedule_items_topic_idx", fields: ["topic_id"] },
            { name: "schedule_items_day_priority_idx", fields: ["schedule_day_id", "priority_score"] },
            { name: "schedule_items_status_idx", fields: ["status"] }
        ]
    });

    return ScheduleItem;
}

module.exports = {
    ScheduleItem,
    initScheduleItem
};
