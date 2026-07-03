require("dotenv").config();

const bcrypt = require("bcryptjs");
const {
    sequelize,
    User,
    Plan,
    PlanTopic,
    UserPlanFollow,
    ScheduleRun,
    ScheduleDay,
    ScheduleItem,
    StudyLog,
    RefreshToken
} = require("../src/db/models");
const { generateScheduleDraft } = require("../src/modules/scheduler/engine/scheduler.engine");

function addDays(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0]; // YYYY-MM-DD format
}

async function createUser({ name, email, role, password = "password123" }) {
    return User.create({
        name,
        email,
        role,
        passwordHash: await bcrypt.hash(password, 10)
    });
}

async function createPlanWithTopics(owner, title, topics, isPublic = false) {
    const transaction = await sequelize.transaction();

    try {
        const plan = await Plan.create({
            ownerId: owner.id,
            title,
            visibility: isPublic ? "public" : "private",
            status: isPublic ? "published" : "draft",
            version: 1
        }, { transaction });

        const createdTopics = await PlanTopic.bulkCreate(
            topics.map(topic => ({
                name: topic.name,
                normalizedName: topic.name.toLowerCase(),
                planId: plan.id,
                difficulty: topic.difficulty,
                estimatedHours: topic.estimatedHours,
                deadline: topic.deadline,
                progress: 0,
                status: "pending"
            })),
            { transaction, returning: true }
        );

        await transaction.commit();

        return { plan, topics: createdTopics };
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}

async function createGeneratedSchedule(plan, topics, dailyHours = 4, completedRatio = 0.3) {
    const formattedTopics = topics.map(topic => ({
        id: Number(topic.id),
        name: topic.name,
        estimatedHours: Number(topic.estimatedHours),
        difficulty: Number(topic.difficulty),
        deadline: topic.deadline,
        progress: topic.progress || 0,
        remainingHours: Number(topic.estimatedHours) * (1 - (topic.progress || 0)),
        feedbackScore: 0
    }));

    const draft = generateScheduleDraft({
        topics: formattedTopics,
        constraints: { dailyCapacityHours: dailyHours },
        today: new Date(),
        allowImpossible: true
    });

    const run = await ScheduleRun.create({
        userId: plan.ownerId,
        planId: plan.id,
        dailyCapacityHours: dailyHours,
        strategy: draft.strategy,
        status: "active",
        isActive: true,
        feasibilityStatus: draft.feasibility.status,
        requiredHours: draft.feasibility.requiredHours,
        availableHours: draft.feasibility.availableHours,
        deficitHours: draft.feasibility.deficitHours,
        generatedAt: new Date()
    });

    const allCreatedItems = [];

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

        allCreatedItems.push(...items);
    }

    const logsToCreate = allCreatedItems.slice(
        0,
        Math.max(1, Math.floor(allCreatedItems.length * completedRatio))
    );

    for (let i = 0; i < logsToCreate.length; i++) {
        const item = logsToCreate[i];
        await StudyLog.create({
            userId: plan.ownerId,
            scheduleItemId: item.id,
            topicId: item.topicId,
            hoursStudied: item.allocatedHours,
            difficultyFeedback: i % 3 === 0 ? "hard" : i % 2 === 0 ? "medium" : "easy"
        });
        item.status = "completed";
        await item.save();
    }

    for (const topic of topics) {
        const studiedHours = await StudyLog.sum("hours_studied", {
            where: { userId: plan.ownerId, topicId: topic.id }
        });
        const progress = Math.max(
            0,
            Math.min(1, Number(studiedHours || 0) / Math.max(Number(topic.estimatedHours), 1))
        );
        topic.progress = progress;
        topic.status = progress >= 1 ? "completed" : progress > 0 ? "in_progress" : "pending";
        await topic.save();
    }
}

async function followPlan(user, sourcePlan, sourceTopics) {
    const copy = await Plan.create({
        title: `${sourcePlan.title} (My Copy)`,
        visibility: "private",
        status: "draft",
        ownerId: user.id,
        sourcePlanId: sourcePlan.id,
        version: sourcePlan.version
    });

    await UserPlanFollow.create({
        userId: user.id,
        sourcePlanId: sourcePlan.id,
        clonedPlanId: copy.id
    });

    const copiedTopics = await PlanTopic.bulkCreate(
        sourceTopics.map(topic => ({
            name: topic.name,
            normalizedName: topic.name.toLowerCase(),
            difficulty: topic.difficulty,
            estimatedHours: topic.estimatedHours,
            deadline: topic.deadline,
            progress: 0,
            status: "pending",
            planId: copy.id
        })),
        { returning: true }
    );

    return { copy, topics: copiedTopics };
}

async function run() {
    try {
        await sequelize.authenticate();

        await RefreshToken.destroy({ where: {}, force: true });
        await StudyLog.destroy({ where: {}, force: true });
        await ScheduleItem.destroy({ where: {}, force: true });
        await ScheduleDay.destroy({ where: {}, force: true });
        await ScheduleRun.destroy({ where: {}, force: true });
        await UserPlanFollow.destroy({ where: {}, force: true });
        await PlanTopic.destroy({ where: {}, force: true });
        await Plan.destroy({ where: {}, force: true });
        await User.destroy({ where: {}, force: true });

        const admin = await createUser({
            name: "Admin",
            email: "admin@test.com",
            role: "admin",
            password: "password123"
        });

        const teachers = await Promise.all([
            createUser({ name: "Teacher One", email: "teacher1@test.com", role: "teacher", password: "password123" }),
            createUser({ name: "Teacher Two", email: "teacher2@test.com", role: "teacher", password: "password123" }),
            createUser({ name: "Teacher Three", email: "teacher3@test.com", role: "teacher", password: "password123" })
        ]);

        const students = await Promise.all(
            Array.from({ length: 8 }, (_, index) => createUser({
                name: `Student ${index + 1}`,
                email: `student${index + 1}@test.com`,
                role: "student",
                password: "password123"
            }))
        );

        const planBlueprints = [
            {
                title: "Operating Systems Mastery",
                topics: [
                    { name: "process scheduling", difficulty: 4, estimatedHours: 5, deadline: addDays(3) },
                    { name: "memory management", difficulty: 5, estimatedHours: 6, deadline: addDays(5) },
                    { name: "deadlocks", difficulty: 3, estimatedHours: 4, deadline: addDays(7) },
                    { name: "file systems", difficulty: 3, estimatedHours: 3, deadline: addDays(8) }
                ]
            },
            {
                title: "DSA Interview Sprint",
                topics: [
                    { name: "arrays and hashing", difficulty: 2, estimatedHours: 3, deadline: addDays(2) },
                    { name: "trees", difficulty: 4, estimatedHours: 5, deadline: addDays(4) },
                    { name: "graphs", difficulty: 5, estimatedHours: 6, deadline: addDays(6) },
                    { name: "dynamic programming", difficulty: 5, estimatedHours: 7, deadline: addDays(9) }
                ]
            },
            {
                title: "Database Systems Core",
                topics: [
                    { name: "normalization", difficulty: 3, estimatedHours: 3, deadline: addDays(3) },
                    { name: "transactions", difficulty: 4, estimatedHours: 5, deadline: addDays(4) },
                    { name: "indexing", difficulty: 4, estimatedHours: 4, deadline: addDays(5) },
                    { name: "query optimization", difficulty: 5, estimatedHours: 6, deadline: addDays(7) }
                ]
            }
        ];

        const publicPlans = [];

        for (let i = 0; i < teachers.length; i++) {
            const blueprint = planBlueprints[i];
            const created = await createPlanWithTopics(
                teachers[i],
                blueprint.title,
                blueprint.topics,
                true
            );

            await createGeneratedSchedule(created.plan, created.topics, 4, 0.35);
            publicPlans.push(created);
        }

        for (let i = 0; i < students.length; i++) {
            const blueprint = planBlueprints[i % planBlueprints.length];
            const privatePlan = await createPlanWithTopics(
                students[i],
                `${blueprint.title} Personal`,
                blueprint.topics.map((topic, index) => ({
                    ...topic,
                    name: `${topic.name} ${i + 1}-${index + 1}`
                })),
                false
            );

            await createGeneratedSchedule(privatePlan.plan, privatePlan.topics, 3 + (i % 2), 0.25);

            if (i < publicPlans.length + 2) {
                const source = publicPlans[i % publicPlans.length];
                const followed = await followPlan(students[i], source.plan, source.topics);
                await createGeneratedSchedule(followed.copy, followed.topics, 3, 0.2);
            }
        }

        console.log("✅ Demo data seeded successfully");
        console.log("Admin: admin@test.com / password123");
        console.log("Teachers: teacher1@test.com ... teacher3@test.com / password123");
        console.log("Students: student1@test.com ... student8@test.com / password123");
    } catch (err) {
        console.error("❌ Seed failed:", err);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

run();
