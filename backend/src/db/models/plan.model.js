"use strict";

const { Model, DataTypes } = require("sequelize");
const { PLAN_STATUS, PLAN_VISIBILITY } = require("../../constants/enums");

class Plan extends Model {}

function initPlan(sequelize) {
    Plan.init({
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        ownerId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: "owner_id"
        },
        title: {
            type: DataTypes.STRING(180),
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        visibility: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: PLAN_VISIBILITY.PRIVATE,
            validate: {
                isIn: [Object.values(PLAN_VISIBILITY)]
            }
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: PLAN_STATUS.DRAFT,
            validate: {
                isIn: [Object.values(PLAN_STATUS)]
            }
        },
        sourcePlanId: {
            type: DataTypes.BIGINT,
            allowNull: true,
            field: "source_plan_id"
        },
        version: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: {
                min: 1
            }
        }
    }, {
        sequelize,
        tableName: "plans",
        modelName: "Plan",
        indexes: [
            { name: "plans_owner_id_idx", fields: ["owner_id"] },
            { name: "plans_source_plan_id_idx", fields: ["source_plan_id"] }
        ]
    });

    return Plan;
}

module.exports = {
    Plan,
    initPlan
};
