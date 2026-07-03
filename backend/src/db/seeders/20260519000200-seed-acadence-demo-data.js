"use strict";

const bcrypt = require("bcryptjs");

const now = new Date();
const teacherId = "11111111-1111-4111-8111-111111111111";
const studentId = "22222222-2222-4222-8222-222222222222";
const adminId = "33333333-3333-4333-8333-333333333333";

module.exports = {
    async up(queryInterface) {
        const passwordHash = bcrypt.hashSync("StudyFlow@123", 10);

        await queryInterface.bulkInsert("users", [
            {
                id: teacherId,
                name: "Demo Teacher",
                email: "teacher@studyflow.dev",
                password_hash: passwordHash,
                role: "teacher",
                created_at: now,
                updated_at: now
            },
            {
                id: studentId,
                name: "Demo Student",
                email: "student@studyflow.dev",
                password_hash: passwordHash,
                role: "student",
                created_at: now,
                updated_at: now
            },
            {
                id: adminId,
                name: "Demo Admin",
                email: "admin@studyflow.dev",
                password_hash: passwordHash,
                role: "admin",
                created_at: now,
                updated_at: now
            }
        ], {});

        await queryInterface.bulkInsert("plans", [
            {
                id: 1001,
                owner_id: teacherId,
                title: "Backend Placement Sprint",
                description: "Reusable backend preparation plan focused on DBMS, APIs, and system design.",
                visibility: "public",
                status: "published",
                source_plan_id: null,
                version: 1,
                created_at: now,
                updated_at: now
            },
            {
                id: 1002,
                owner_id: studentId,
                title: "Backend Placement Sprint - Personal Copy",
                description: "Student-owned clone of the backend placement sprint.",
                visibility: "private",
                status: "draft",
                source_plan_id: 1001,
                version: 1,
                created_at: now,
                updated_at: now
            }
        ], {});

        await queryInterface.bulkInsert("plan_topics", [
            {
                id: 2001,
                plan_id: 1001,
                name: "PostgreSQL Indexing",
                normalized_name: "postgresql indexing",
                difficulty: 4,
                estimated_hours: 6,
                deadline: "2026-06-05",
                progress: 0,
                status: "pending",
                created_at: now,
                updated_at: now
            },
            {
                id: 2002,
                plan_id: 1001,
                name: "Express API Design",
                normalized_name: "express api design",
                difficulty: 3,
                estimated_hours: 5,
                deadline: "2026-06-08",
                progress: 0,
                status: "pending",
                created_at: now,
                updated_at: now
            },
            {
                id: 2003,
                plan_id: 1002,
                name: "PostgreSQL Indexing",
                normalized_name: "postgresql indexing",
                difficulty: 4,
                estimated_hours: 6,
                deadline: "2026-06-05",
                progress: 0.2500,
                status: "in_progress",
                created_at: now,
                updated_at: now
            },
            {
                id: 2004,
                plan_id: 1002,
                name: "Express API Design",
                normalized_name: "express api design",
                difficulty: 3,
                estimated_hours: 5,
                deadline: "2026-06-08",
                progress: 0,
                status: "pending",
                created_at: now,
                updated_at: now
            }
        ], {});

        await queryInterface.bulkInsert("user_plan_follows", [
            {
                id: 3001,
                user_id: studentId,
                source_plan_id: 1001,
                cloned_plan_id: 1002,
                created_at: now,
                updated_at: now
            }
        ], {});

        await queryInterface.bulkInsert("schedule_runs", [
            {
                id: 4001,
                user_id: studentId,
                plan_id: 1002,
                daily_capacity_hours: 4,
                strategy: "priority_balanced_v1",
                status: "active",
                is_active: true,
                feasibility_status: "feasible",
                required_hours: 9.5,
                available_hours: 40,
                deficit_hours: 0,
                generated_at: now,
                created_at: now,
                updated_at: now
            }
        ], {});

        await queryInterface.bulkInsert("schedule_days", [
            {
                id: 5001,
                schedule_run_id: 4001,
                date: "2026-05-20",
                total_planned_hours: 3,
                created_at: now,
                updated_at: now
            }
        ], {});

        await queryInterface.bulkInsert("schedule_items", [
            {
                id: 6001,
                schedule_day_id: 5001,
                topic_id: 2003,
                allocated_hours: 2,
                priority_score: 0.78250,
                reason_json: JSON.stringify({
                    type: "primary_study",
                    strategy: "priority_balanced_v1",
                    decision: {
                        reason: "Demo item with high workload pressure and near deadline."
                    }
                }),
                status: "planned",
                created_at: now,
                updated_at: now
            },
            {
                id: 6002,
                schedule_day_id: 5001,
                topic_id: 2004,
                allocated_hours: 1,
                priority_score: 0.51250,
                reason_json: JSON.stringify({
                    type: "primary_study",
                    strategy: "priority_balanced_v1",
                    decision: {
                        reason: "Demo item scheduled after higher-priority database work."
                    }
                }),
                status: "planned",
                created_at: now,
                updated_at: now
            }
        ], {});
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete("schedule_items", { id: [6001, 6002] });
        await queryInterface.bulkDelete("schedule_days", { id: [5001] });
        await queryInterface.bulkDelete("schedule_runs", { id: [4001] });
        await queryInterface.bulkDelete("user_plan_follows", { id: [3001] });
        await queryInterface.bulkDelete("plan_topics", { id: [2001, 2002, 2003, 2004] });
        await queryInterface.bulkDelete("plans", { id: [1001, 1002] });
        await queryInterface.bulkDelete("users", {
            id: [teacherId, studentId, adminId]
        });
    }
};
