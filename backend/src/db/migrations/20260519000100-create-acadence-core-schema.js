"use strict";

const { DataTypes, Sequelize } = require("sequelize");

async function addCheck(queryInterface, tableName, constraintName, expression) {
    await queryInterface.sequelize.query(
        `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} CHECK (${expression});`
    );
}

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");

        await queryInterface.createTable("users", {
            id: {
                type: DataTypes.UUID,
                allowNull: false,
                primaryKey: true,
                defaultValue: Sequelize.literal("gen_random_uuid()")
            },
            name: {
                type: DataTypes.STRING(120),
                allowNull: false
            },
            email: {
                type: DataTypes.STRING(255),
                allowNull: false
            },
            password_hash: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            role: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "student"
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            }
        });

        await queryInterface.sequelize.query(
            "CREATE UNIQUE INDEX users_email_lower_unique_idx ON users (lower(email));"
        );
        await addCheck(queryInterface, "users", "users_role_check", "role IN ('student', 'teacher', 'admin')");
        await addCheck(queryInterface, "users", "users_name_not_blank_check", "char_length(trim(name)) > 0");
        await addCheck(queryInterface, "users", "users_email_not_blank_check", "char_length(trim(email)) > 0");

        await queryInterface.createTable("plans", {
            id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },
            owner_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: "users",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            title: {
                type: DataTypes.STRING(180),
                allowNull: false
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            visibility: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "private"
            },
            status: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "draft"
            },
            source_plan_id: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: {
                    model: "plans",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "RESTRICT"
            },
            version: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            }
        });

        await addCheck(queryInterface, "plans", "plans_visibility_check", "visibility IN ('private', 'public')");
        await addCheck(queryInterface, "plans", "plans_status_check", "status IN ('draft', 'published', 'archived')");
        await addCheck(queryInterface, "plans", "plans_version_positive_check", "version >= 1");
        await addCheck(queryInterface, "plans", "plans_title_not_blank_check", "char_length(trim(title)) > 0");
        await queryInterface.addIndex("plans", ["owner_id"], { name: "plans_owner_id_idx" });
        await queryInterface.addIndex("plans", ["source_plan_id"], { name: "plans_source_plan_id_idx" });
        await queryInterface.addIndex("plans", ["visibility", "status", "created_at"], {
            name: "plans_public_discovery_idx",
            where: {
                visibility: "public",
                status: "published"
            }
        });

        await queryInterface.createTable("plan_topics", {
            id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },
            plan_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: {
                    model: "plans",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            name: {
                type: DataTypes.STRING(180),
                allowNull: false
            },
            normalized_name: {
                type: DataTypes.STRING(180),
                allowNull: false
            },
            difficulty: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: false
            },
            estimated_hours: {
                type: DataTypes.DECIMAL(6, 2),
                allowNull: false
            },
            deadline: {
                type: DataTypes.DATEONLY,
                allowNull: false
            },
            progress: {
                type: DataTypes.DECIMAL(5, 4),
                allowNull: false,
                defaultValue: 0
            },
            status: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "pending"
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            }
        });

        await queryInterface.addConstraint("plan_topics", {
            fields: ["plan_id", "normalized_name"],
            type: "unique",
            name: "plan_topics_plan_normalized_name_unique"
        });
        await addCheck(queryInterface, "plan_topics", "plan_topics_difficulty_range_check", "difficulty >= 1 AND difficulty <= 5");
        await addCheck(queryInterface, "plan_topics", "plan_topics_estimated_hours_check", "estimated_hours > 0 AND estimated_hours <= 1000");
        await addCheck(queryInterface, "plan_topics", "plan_topics_progress_range_check", "progress >= 0 AND progress <= 1");
        await addCheck(queryInterface, "plan_topics", "plan_topics_status_check", "status IN ('pending', 'in_progress', 'completed', 'archived')");
        await addCheck(queryInterface, "plan_topics", "plan_topics_name_not_blank_check", "char_length(trim(name)) > 0");
        await queryInterface.addIndex("plan_topics", ["plan_id"], { name: "plan_topics_plan_id_idx" });
        await queryInterface.addIndex("plan_topics", ["plan_id", "deadline"], { name: "plan_topics_plan_deadline_idx" });
        await queryInterface.addIndex("plan_topics", ["plan_id", "status"], { name: "plan_topics_plan_status_idx" });
        await queryInterface.addIndex("plan_topics", ["plan_id", "status", "deadline", "progress"], {
            name: "plan_topics_schedule_input_idx"
        });

        await queryInterface.createTable("user_plan_follows", {
            id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },
            user_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: "users",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            source_plan_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: {
                    model: "plans",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "RESTRICT"
            },
            cloned_plan_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: {
                    model: "plans",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            }
        });

        await queryInterface.addConstraint("user_plan_follows", {
            fields: ["user_id", "source_plan_id"],
            type: "unique",
            name: "user_plan_follows_user_source_unique"
        });
        await queryInterface.addConstraint("user_plan_follows", {
            fields: ["cloned_plan_id"],
            type: "unique",
            name: "user_plan_follows_cloned_plan_unique"
        });
        await addCheck(queryInterface, "user_plan_follows", "user_plan_follows_source_clone_different_check", "source_plan_id <> cloned_plan_id");
        await queryInterface.addIndex("user_plan_follows", ["user_id"], { name: "user_plan_follows_user_idx" });
        await queryInterface.addIndex("user_plan_follows", ["source_plan_id"], { name: "user_plan_follows_source_idx" });

        await queryInterface.createTable("schedule_runs", {
            id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },
            user_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: "users",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            plan_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: {
                    model: "plans",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            daily_capacity_hours: {
                type: DataTypes.DECIMAL(5, 2),
                allowNull: false
            },
            strategy: {
                type: DataTypes.STRING(50),
                allowNull: false,
                defaultValue: "priority_balanced_v1"
            },
            status: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "generating"
            },
            is_active: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            feasibility_status: {
                type: DataTypes.STRING(20),
                allowNull: false
            },
            required_hours: {
                type: DataTypes.DECIMAL(8, 2),
                allowNull: false,
                defaultValue: 0
            },
            available_hours: {
                type: DataTypes.DECIMAL(8, 2),
                allowNull: false,
                defaultValue: 0
            },
            deficit_hours: {
                type: DataTypes.DECIMAL(8, 2),
                allowNull: false,
                defaultValue: 0
            },
            generated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            }
        });

        await addCheck(queryInterface, "schedule_runs", "schedule_runs_daily_capacity_check", "daily_capacity_hours > 0 AND daily_capacity_hours <= 24");
        await addCheck(queryInterface, "schedule_runs", "schedule_runs_status_check", "status IN ('generating', 'active', 'superseded', 'failed')");
        await addCheck(queryInterface, "schedule_runs", "schedule_runs_feasibility_status_check", "feasibility_status IN ('feasible', 'tight', 'at_risk', 'impossible')");
        await addCheck(queryInterface, "schedule_runs", "schedule_runs_required_hours_check", "required_hours >= 0");
        await addCheck(queryInterface, "schedule_runs", "schedule_runs_available_hours_check", "available_hours >= 0");
        await addCheck(queryInterface, "schedule_runs", "schedule_runs_deficit_hours_check", "deficit_hours >= 0");
        await queryInterface.addIndex("schedule_runs", ["user_id", "plan_id"], { name: "schedule_runs_user_plan_idx" });
        await queryInterface.addIndex("schedule_runs", ["plan_id", "created_at"], { name: "schedule_runs_plan_created_idx" });
        await queryInterface.addIndex("schedule_runs", ["user_id", "plan_id"], {
            name: "schedule_runs_one_active_per_user_plan_idx",
            unique: true,
            where: {
                is_active: true
            }
        });
        await queryInterface.addIndex("schedule_runs", ["user_id", "plan_id", "is_active"], {
            name: "schedule_runs_active_lookup_idx",
            where: {
                is_active: true
            }
        });

        await queryInterface.createTable("schedule_days", {
            id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },
            schedule_run_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: {
                    model: "schedule_runs",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            date: {
                type: DataTypes.DATEONLY,
                allowNull: false
            },
            total_planned_hours: {
                type: DataTypes.DECIMAL(5, 2),
                allowNull: false,
                defaultValue: 0
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            }
        });

        await queryInterface.addConstraint("schedule_days", {
            fields: ["schedule_run_id", "date"],
            type: "unique",
            name: "schedule_days_run_date_unique"
        });
        await addCheck(queryInterface, "schedule_days", "schedule_days_total_planned_hours_check", "total_planned_hours >= 0 AND total_planned_hours <= 24");
        await queryInterface.addIndex("schedule_days", ["schedule_run_id", "date"], { name: "schedule_days_run_date_idx" });

        await queryInterface.createTable("schedule_items", {
            id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },
            schedule_day_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: {
                    model: "schedule_days",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            topic_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: {
                    model: "plan_topics",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "RESTRICT"
            },
            allocated_hours: {
                type: DataTypes.DECIMAL(5, 2),
                allowNull: false
            },
            priority_score: {
                type: DataTypes.DECIMAL(8, 5),
                allowNull: false
            },
            reason_json: {
                type: DataTypes.JSONB,
                allowNull: false
            },
            status: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "planned"
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            }
        });

        await addCheck(queryInterface, "schedule_items", "schedule_items_allocated_hours_check", "allocated_hours > 0 AND allocated_hours <= 24");
        await addCheck(queryInterface, "schedule_items", "schedule_items_priority_score_check", "priority_score >= 0");
        await addCheck(queryInterface, "schedule_items", "schedule_items_status_check", "status IN ('planned', 'completed', 'skipped', 'superseded')");
        await queryInterface.addIndex("schedule_items", ["schedule_day_id"], { name: "schedule_items_day_idx" });
        await queryInterface.addIndex("schedule_items", ["topic_id"], { name: "schedule_items_topic_idx" });
        await queryInterface.addIndex("schedule_items", ["schedule_day_id", "priority_score"], { name: "schedule_items_day_priority_idx" });
        await queryInterface.addIndex("schedule_items", ["status"], { name: "schedule_items_status_idx" });

        await queryInterface.createTable("study_logs", {
            id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },
            user_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: "users",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE"
            },
            schedule_item_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: {
                    model: "schedule_items",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "RESTRICT"
            },
            topic_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: {
                    model: "plan_topics",
                    key: "id"
                },
                onUpdate: "CASCADE",
                onDelete: "RESTRICT"
            },
            hours_studied: {
                type: DataTypes.DECIMAL(5, 2),
                allowNull: false
            },
            difficulty_feedback: {
                type: DataTypes.STRING(20),
                allowNull: true
            },
            completed_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("now()")
            }
        });

        await queryInterface.addConstraint("study_logs", {
            fields: ["user_id", "schedule_item_id"],
            type: "unique",
            name: "study_logs_user_schedule_item_unique"
        });
        await addCheck(queryInterface, "study_logs", "study_logs_hours_studied_check", "hours_studied > 0 AND hours_studied <= 24");
        await addCheck(queryInterface, "study_logs", "study_logs_difficulty_feedback_check", "difficulty_feedback IS NULL OR difficulty_feedback IN ('easy', 'medium', 'hard')");
        await queryInterface.addIndex("study_logs", ["user_id", "completed_at"], { name: "study_logs_user_completed_idx" });
        await queryInterface.addIndex("study_logs", ["topic_id"], { name: "study_logs_topic_idx" });
        await queryInterface.addIndex("study_logs", ["schedule_item_id"], { name: "study_logs_schedule_item_idx" });
        await queryInterface.addIndex("study_logs", ["topic_id", "completed_at"], { name: "study_logs_topic_completed_idx" });

        // These FKs must prevent orphaned historical records, but they also sit on
        // multi-path cascades such as user -> plans/topics and user -> schedule_runs.
        // DEFERRABLE NO ACTION lets PostgreSQL validate the final transaction state
        // instead of rejecting a valid cascading delete too early.
        await queryInterface.sequelize.query(`
            ALTER TABLE schedule_items
            DROP CONSTRAINT schedule_items_topic_id_fkey,
            ADD CONSTRAINT schedule_items_topic_id_fkey
                FOREIGN KEY (topic_id)
                REFERENCES plan_topics(id)
                ON UPDATE CASCADE
                ON DELETE NO ACTION
                DEFERRABLE INITIALLY DEFERRED;
        `);

        await queryInterface.sequelize.query(`
            ALTER TABLE study_logs
            DROP CONSTRAINT study_logs_schedule_item_id_fkey,
            ADD CONSTRAINT study_logs_schedule_item_id_fkey
                FOREIGN KEY (schedule_item_id)
                REFERENCES schedule_items(id)
                ON UPDATE CASCADE
                ON DELETE NO ACTION
                DEFERRABLE INITIALLY DEFERRED;
        `);

        await queryInterface.sequelize.query(`
            ALTER TABLE study_logs
            DROP CONSTRAINT study_logs_topic_id_fkey,
            ADD CONSTRAINT study_logs_topic_id_fkey
                FOREIGN KEY (topic_id)
                REFERENCES plan_topics(id)
                ON UPDATE CASCADE
                ON DELETE NO ACTION
                DEFERRABLE INITIALLY DEFERRED;
        `);
    },

    async down(queryInterface) {
        await queryInterface.dropTable("study_logs");
        await queryInterface.dropTable("schedule_items");
        await queryInterface.dropTable("schedule_days");
        await queryInterface.dropTable("schedule_runs");
        await queryInterface.dropTable("user_plan_follows");
        await queryInterface.dropTable("plan_topics");
        await queryInterface.dropTable("plans");
        await queryInterface.dropTable("users");
    }
};
