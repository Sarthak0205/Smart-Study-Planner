"use strict";

const { Model, DataTypes } = require("sequelize");

class UserPlanFollow extends Model {}

function initUserPlanFollow(sequelize) {
    UserPlanFollow.init({
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
        sourcePlanId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: "source_plan_id"
        },
        clonedPlanId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: "cloned_plan_id"
        }
    }, {
        sequelize,
        tableName: "user_plan_follows",
        modelName: "UserPlanFollow",
        indexes: [
            {
                name: "user_plan_follows_user_source_unique",
                unique: true,
                fields: ["user_id", "source_plan_id"]
            },
            {
                name: "user_plan_follows_cloned_plan_unique",
                unique: true,
                fields: ["cloned_plan_id"]
            },
            { name: "user_plan_follows_user_idx", fields: ["user_id"] },
            { name: "user_plan_follows_source_idx", fields: ["source_plan_id"] }
        ]
    });

    return UserPlanFollow;
}

module.exports = {
    UserPlanFollow,
    initUserPlanFollow
};
