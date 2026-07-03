require("dotenv").config();

const {
    sequelize,
    User,
    Plan,
    PlanTopic,
    ScheduleRun,
    ScheduleDay,
    ScheduleItem,
    StudyLog,
    UserPlanFollow
} = require("../src/db/models");
const { Op } = require("sequelize");
const { generateScheduleDraft } = require("../src/modules/scheduler/engine/scheduler.engine");

const SHOWCASE_TITLE = "Final Semester Placement Prep";

function addDays(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0]; // YYYY-MM-DD format
}

function buildTopics() {
    const topicNames = [
        "arrays and strings revision",
        "linked lists fundamentals",
        "stacks and queues practice",
        "binary trees revision",
        "binary search trees and traversal",
        "heap and priority queue problems",
        "graph bfs and dfs",
        "shortest path algorithms",
        "dynamic programming basics",
        "advanced dynamic programming",
        "greedy algorithms practice",
        "backtracking and recursion",
        "sql joins revision",
        "group by and aggregation",
        "indexing and query optimization",
        "normalization and schema design",
        "transaction isolation levels",
        "deadlock and concurrency control",
        "operating system scheduling",
        "processes vs threads",
        "memory management and paging",
        "deadlocks and synchronization",
        "computer networks osi model",
        "tcp ip and routing",
        "http https and dns",
        "javascript core concepts",
        "node and express revision",
        "react fundamentals",
        "system design basics",
        "aptitude and logical reasoning",
        "mock coding interviews",
        "resume and hr round prep"
    ];

    return topicNames.map((name, index) => ({
        name,
        difficulty: 2 + (index % 4),
        estimatedHours: 2 + (index % 5),
        deadline: addDays(2 + index),
        progress: 0,
        status: "pending"
    }));
}

async function deleteExistingShowcase(ownerId) {
    const existingPlans = await Plan.findAll({
        where: {
            ownerId,
            title: SHOWCASE_TITLE,
            sourcePlanId: null
        }
    });

    for (const plan of existingPlans) {
        const runs = await ScheduleRun.findAll({
            where: { planId: plan.id }
        });
        const runIds = runs.map(run => run.id);

        const days = runIds.length
            ? await ScheduleDay.findAll({ where: { scheduleRunId: runIds } })
            : [];
        const dayIds = days.map(day => day.id);

        const items = dayIds.length
            ? await ScheduleItem.findAll({ where: { scheduleDayId: dayIds } })
            : [];
        const itemIds = items.map(item => item.id);

        if (itemIds.length) {
            await StudyLog.destroy({
                where: { scheduleItemId: itemIds }
            });
            await ScheduleItem.destroy({
                where: { id: itemIds }
            });
        }

        if (dayIds.length) {
            await ScheduleDay.destroy({
                where: { id: dayIds }
            });
        }

        if (runIds.length) {
            await ScheduleRun.destroy({
                where: { id: runIds }
            });
        }

        await UserPlanFollow.destroy({
            where: { sourcePlanId: plan.id }
        });

        await PlanTopic.destroy({
            where: { planId: plan.id }
        });

        await plan.destroy();
    }
}

async function run() {
    try {
        await sequelize.authenticate();

        const teacher = await User.findOne({
            where: { email: "teacher1@test.com" }
        });

        if (!teacher) {
            throw new Error("teacher1@test.com not found. Run the demo seed first.");
        }

        await deleteExistingShowcase(teacher.id);

        const plan = await Plan.create({
            ownerId: teacher.id,
            title: SHOWCASE_TITLE,
            visibility: "public",
            status: "published",
            version: 1
        });

        const topics = await PlanTopic.bulkCreate(
            buildTopics().map(topic => ({
                ...topic,
                normalizedName: topic.name.toLowerCase(),
                planId: plan.id
            })),
            { returning: true }
        );

        const formattedTopics = topics.map(topic => ({
            id: Number(topic.id),
            name: topic.name,
            estimatedHours: Number(topic.estimatedHours),
            difficulty: Number(topic.difficulty),
            deadline: topic.deadline,
            progress: 0,
            remainingHours: Number(topic.estimatedHours),
            feedbackScore: 0
        }));

        const draft = generateScheduleDraft({
            topics: formattedTopics,
            constraints: { dailyCapacityHours: 2 },
            today: new Date(),
            allowImpossible: true
        });

        const run = await ScheduleRun.create({
            userId: teacher.id,
            planId: plan.id,
            dailyCapacityHours: 2,
            strategy: draft.strategy,
            status: "active",
            isActive: true,
            feasibilityStatus: draft.feasibility.status,
            requiredHours: draft.feasibility.requiredHours,
            availableHours: draft.feasibility.availableHours,
            deficitHours: draft.feasibility.deficitHours,
            generatedAt: new Date()
        });

        for (const dayDraft of draft.days) {
            const day = await ScheduleDay.create({
                scheduleRunId: run.id,
                date: dayDraft.date,
                totalPlannedHours: dayDraft.totalPlannedHours
            });

            const items = await ScheduleItem.bulkCreate(
                dayDraft.items.map(item => ({
                    scheduleDayId: day.id,
                    topicId: item.topicId,
                    allocatedHours: item.allocatedHours,
                    priorityScore: item.priorityScore,
                    reasonJson: item.reasonJson,
                    status: "planned"
                })),
                { returning: true }
            );

            const completionCount = Math.floor(items.length / 3);
            for (let i = 0; i < completionCount; i++) {
                await StudyLog.create({
                    userId: teacher.id,
                    scheduleItemId: items[i].id,
                    topicId: items[i].topicId,
                    hoursStudied: items[i].allocatedHours,
                    difficultyFeedback: i % 2 === 0 ? "hard" : "medium"
                });
                items[i].status = "completed";
                await items[i].save();
            }
        }

        console.log(`✅ Performance showcase created: ${SHOWCASE_TITLE}`);
        console.log(`Teacher owner: ${teacher.name} (${teacher.email})`);
        console.log(`Topics: ${topics.length}`);
    } catch (err) {
        console.error("❌ Performance showcase seed failed:", err);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

run();
