const express = require("express");
const router = express.Router();

const {
    Topic,
    Schedule,
    ScheduleItem,
    StudyLog,
    sequelize
} = require("../models");

const { generateSchedule } = require("../services/scheduler");
const { Op } = require("sequelize");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

router.post(
    "/plans/:id/generate",
    auth,
    role("student", "teacher"),
    async (req, res) => {

        const t = await sequelize.transaction();

        try {
            console.log("🔥 GENERATE STARTED");

            const userId = req.user.id;
            const planId = req.params.id;
            const { dailyHours = 4 } = req.body;
            console.log("🔍 PLAN ID:", planId);
            console.log("🔍 USER ID:", userId);

            if (!planId) {
                await t.rollback();
                return res.status(400).json({ error: "Invalid planId" });
            }

            // 🔒 LOCK PLAN
            const plan = await Schedule.findOne({
                where: { id: planId, ownerId: userId },
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (!plan) {
                await t.rollback();
                return res.status(403).json({ error: "Unauthorized plan access" });
            }

            // 🔥 PREVENT DOUBLE GENERATION
            const existingActive = await Schedule.findOne({
                where: {
                    ownerId: userId,
                    generatedFromPlanId: planId,
                    isActive: true
                },
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (existingActive) {
                await t.rollback();
                return res.status(400).json({
                    message: "Schedule already generated"
                });
            }

            // 🔹 FETCH TOPICS
            const topics = await Topic.findAll({
                where: { userId, planId },
                transaction: t,
                lock: t.LOCK.UPDATE
            });
            console.log("🔍 TOPICS FOUND:", topics.length);
            if (!topics.length) {
                await t.rollback();
                return res.status(400).json({ error: "No topics found" });
            }

            // 🔥 FETCH LOGS (SAFE)
            const logs = await StudyLog.findAll({
                where: { userId },
                attributes: ["difficulty_feedback"],
                include: [{
                    model: ScheduleItem,
                    attributes: ["sourceItemId"],
                    required: false
                }],
                transaction: t
            });

            // 🔥 BUILD FEEDBACK MAP
            const feedbackMap = {};

            logs.forEach(log => {
                const topicId = log.ScheduleItem?.sourceItemId;
                if (!topicId) return;

                if (!feedbackMap[topicId]) {
                    feedbackMap[topicId] = [];
                }

                if (log.difficulty_feedback) {
                    feedbackMap[topicId].push(log.difficulty_feedback);
                }
            });

            // 🔥 SAFE FEEDBACK SCORING
            function getFeedbackScore(arr = []) {
                if (!arr.length) return 0;

                const map = {
                    easy: -0.15,
                    medium: 0,
                    hard: 0.25
                };

                const total = arr.reduce((sum, val) => {
                    if (!val) return sum;
                    return sum + (map[val] || 0);
                }, 0);

                let score = total / arr.length;

                // 🔥 CLAMP
                score = Math.max(-0.2, Math.min(0.3, score));

                return score;
            }

            // 🔹 PREPARE TOPICS
            const formattedTopics = topics.map(t => {
                const progress = t.progress || 0;

                return {
                    id: t.id,
                    name: t.name,
                    estimated_hours: t.estimated_hours,
                    difficulty: t.difficulty,
                    deadline: t.deadline,
                    progress,
                    remaining_hours:
                        t.estimated_hours * (1 - progress),
                    feedbackScore: getFeedbackScore(feedbackMap[t.id])
                };
            });

            // 🔥 GENERATE
            const generated = generateSchedule(formattedTopics, dailyHours);

            if (!generated.length) {
                await t.commit();
                return res.json({ message: "All topics completed 🎉" });
            }

            // 🔥 RESET ACTIVE
            await Schedule.update(
                { isActive: false },
                {
                    where: {
                        ownerId: userId,
                        generatedFromPlanId: planId
                    },
                    transaction: t
                }
            );

            // 🔹 STORE SCHEDULE
            for (const day of generated) {

                const schedule = await Schedule.create({
                    ownerId: userId,
                    date: day.date,
                    total_hours: day.total_hours,
                    generatedFromPlanId: planId,
                    isActive: true
                }, { transaction: t });

                const items = day.sessions.map(s => ({
                    topic_name: s.topic,
                    allocated_hours: s.hours,
                    priority_score: s.priority,
                    reason: JSON.stringify(s.reason),
                    ScheduleId: schedule.id,
                    sourceItemId: s.sourceId
                }));

                await ScheduleItem.bulkCreate(items, { transaction: t });
            }

            await t.commit();

            console.log("✅ GENERATE SUCCESS");

            res.json({ message: "Schedule generated successfully" });

        } catch (err) {
            await t.rollback();

            console.error("❌ GENERATE ERROR FULL:", err);

            res.status(500).json({
                error: err.message || "Internal Server Error"
            });
        }
    }
);
router.get("/today", auth, async (req, res) => {
    try {
        const planId = req.query.planId; // ✅ FIXED (NO Number())

        if (!planId) {
            return res.json(null);
        }

        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        let schedule = await Schedule.findOne({
            where: {
                ownerId: req.user.id,
                generatedFromPlanId: planId,
                isActive: true,
                date: {
                    [Op.between]: [start, end]
                }
            },
            include: [
                {
                    model: ScheduleItem,
                    include: [StudyLog]
                }
            ]
        });

        if (!schedule) {
            schedule = await Schedule.findOne({
                where: {
                    ownerId: req.user.id,
                    generatedFromPlanId: planId,
                    isActive: true,
                    date: {
                        [Op.gte]: start
                    }
                },
                order: [["date", "ASC"]],
                include: [
                    {
                        model: ScheduleItem,
                        include: [StudyLog]
                    }
                ]
            });
        }

        // 🔥 DO NOT RETURN 404
        if (!schedule) {
            return res.json(null);
        }

        res.json(schedule);

    } catch (err) {
        console.error("❌ TODAY ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get("/", auth, async (req, res) => {
    try {
        const planId = req.query.planId;

        if (!planId) {
            return res.status(400).json({ message: "planId required" });
        }

        const schedules = await Schedule.findAll({
            where: {
                ownerId: req.user.id,
                generatedFromPlanId: planId,
                isActive: true
            },
            include: [ScheduleItem],
            order: [["date", "ASC"]]
        });

        // 🔥 IMPORTANT: DO NOT RETURN 404
        if (!schedules.length) {
            return res.json([]); // 👈 this fixes your UI errors
        }

        res.json(schedules);

    } catch (err) {
        console.error("❌ SCHEDULE FETCH ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;