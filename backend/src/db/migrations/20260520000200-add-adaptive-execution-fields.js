"use strict";

const { DataTypes } = require("sequelize");

async function replaceCheck(queryInterface, tableName, constraintName, expression) {
    await queryInterface.sequelize.query(
        `ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${constraintName};`
    );
    await queryInterface.sequelize.query(
        `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} CHECK (${expression});`
    );
}

module.exports = {
    async up(queryInterface) {
        await replaceCheck(
            queryInterface,
            "plan_topics",
            "plan_topics_status_check",
            "status IN ('pending', 'not_started', 'in_progress', 'completed', 'overdue', 'archived')"
        );

        await replaceCheck(
            queryInterface,
            "schedule_runs",
            "schedule_runs_status_check",
            "status IN ('generating', 'active', 'superseded', 'failed', 'completed')"
        );

        await replaceCheck(
            queryInterface,
            "schedule_items",
            "schedule_items_status_check",
            "status IN ('planned', 'active', 'completed', 'missed', 'skipped', 'recovered', 'superseded')"
        );

        await queryInterface.addColumn("study_logs", "session_effectiveness", {
            type: DataTypes.STRING(20),
            allowNull: true
        });

        await queryInterface.addColumn("study_logs", "perceived_workload", {
            type: DataTypes.STRING(20),
            allowNull: true
        });

        await queryInterface.addColumn("study_logs", "feedback_json", {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {}
        });

        await replaceCheck(
            queryInterface,
            "study_logs",
            "study_logs_session_effectiveness_check",
            "session_effectiveness IS NULL OR session_effectiveness IN ('low', 'medium', 'high')"
        );

        await replaceCheck(
            queryInterface,
            "study_logs",
            "study_logs_perceived_workload_check",
            "perceived_workload IS NULL OR perceived_workload IN ('light', 'expected', 'heavy')"
        );

        await queryInterface.addIndex("study_logs", ["user_id", "topic_id", "completed_at"], {
            name: "study_logs_user_topic_completed_idx"
        });
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            UPDATE schedule_items
            SET status = CASE
                WHEN status = 'active' THEN 'planned'
                WHEN status = 'missed' THEN 'planned'
                WHEN status = 'recovered' THEN 'completed'
                ELSE status
            END
            WHERE status IN ('active', 'missed', 'recovered');
        `);

        await queryInterface.sequelize.query(`
            UPDATE schedule_runs
            SET status = 'superseded',
                is_active = false
            WHERE status = 'completed';
        `);

        await queryInterface.sequelize.query(`
            UPDATE plan_topics
            SET status = CASE
                WHEN status = 'not_started' THEN 'pending'
                WHEN status = 'overdue' THEN 'in_progress'
                ELSE status
            END
            WHERE status IN ('not_started', 'overdue');
        `);

        await queryInterface.removeIndex("study_logs", "study_logs_user_topic_completed_idx");
        await queryInterface.sequelize.query(
            "ALTER TABLE study_logs DROP CONSTRAINT IF EXISTS study_logs_perceived_workload_check;"
        );
        await queryInterface.sequelize.query(
            "ALTER TABLE study_logs DROP CONSTRAINT IF EXISTS study_logs_session_effectiveness_check;"
        );
        await queryInterface.removeColumn("study_logs", "feedback_json");
        await queryInterface.removeColumn("study_logs", "perceived_workload");
        await queryInterface.removeColumn("study_logs", "session_effectiveness");

        await replaceCheck(
            queryInterface,
            "schedule_items",
            "schedule_items_status_check",
            "status IN ('planned', 'completed', 'skipped', 'superseded')"
        );

        await replaceCheck(
            queryInterface,
            "schedule_runs",
            "schedule_runs_status_check",
            "status IN ('generating', 'active', 'superseded', 'failed')"
        );

        await replaceCheck(
            queryInterface,
            "plan_topics",
            "plan_topics_status_check",
            "status IN ('pending', 'in_progress', 'completed', 'archived')"
        );
    }
};
