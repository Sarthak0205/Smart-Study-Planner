"use strict";

const { DataTypes } = require("sequelize");

module.exports = {
    async up(queryInterface) {
        await queryInterface.addColumn("plan_topics", "position", {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        });

        await queryInterface.sequelize.query(
            "ALTER TABLE plan_topics ADD CONSTRAINT plan_topics_position_non_negative_check CHECK (position >= 0);"
        );

        await queryInterface.addIndex("plan_topics", ["plan_id", "position"], {
            name: "plan_topics_plan_position_idx"
        });
    },

    async down(queryInterface) {
        await queryInterface.removeIndex("plan_topics", "plan_topics_plan_position_idx");
        await queryInterface.removeConstraint("plan_topics", "plan_topics_position_non_negative_check");
        await queryInterface.removeColumn("plan_topics", "position");
    }
};
