const express = require("express");
const router = express.Router();

const { Topic, Schedule, ScheduleItem, StudyLog, sequelize } = require("../models");
const { generateSchedule } = require("../services/scheduler");

// 🔥 ADD AUTH
const auth = require("../middleware/auth");

//
// 🔥 GENERATE SCHEDULE (FIXED FOR MULTI-USER)
//
router.post("/generate", auth, async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { dailyHours } = req.body;

        if (!dailyHours || dailyHours <= 0) {
            return res.status(400).json({ error: "Invalid daily hours" });
        }

        // 🔹 Fetch topics + logs
        const topics = await Topic.findAll({
            include: [{ model: StudyLog, as: "StudyLogs" }],
            transaction: t
        });

        // 🔹 Generate schedule
        const scheduleData = generateSchedule(topics, dailyHours);

        if (!scheduleData || scheduleData.length === 0) {
            throw new Error("Scheduler returned empty data");
        }

        // ==========================================
        // 🔥 DELETE ONLY CURRENT USER'S DATA
        // ==========================================
        const userSchedules = await Schedule.findAll({
            where: { ownerId: req.user.id },
            attributes: ["id"],
            transaction: t
        });

        const scheduleIds = userSchedules.map(s => s.id);

        if (scheduleIds.length > 0) {
            await ScheduleItem.destroy({
                where: { ScheduleId: scheduleIds },
                transaction: t
            });

            await Schedule.destroy({
                where: { id: scheduleIds },
                transaction: t
            });
        }

        let savedSchedules = [];

        // 🔥 PROCESS EACH DAY
        for (let day of scheduleData) {

            if (!day.sessions || day.sessions.length === 0) continue;

            const schedule = await Schedule.create({
                date: day.date,
                total_hours: day.total_hours,
                ownerId: req.user.id, // 🔥 CRITICAL FIX
            }, { transaction: t });

            // 🔥 GROUPING LOGIC (UNCHANGED)
            const grouped = {};

            for (let item of day.sessions) {
                if (!item.topic) continue;

                if (!grouped[item.topic]) {
                    grouped[item.topic] = {
                        hours: 0,
                        priority: item.priority || 0,
                        reason: item.reason || {}
                    };
                }

                grouped[item.topic].hours += item.hours;
            }

            const items = Object.entries(grouped).map(([topic, data]) => ({
                topic_name: topic,
                allocated_hours: data.hours,
                priority_score: data.priority,
                reason: JSON.stringify(data.reason),
                ScheduleId: schedule.id,
            }));

            await ScheduleItem.bulkCreate(items, { transaction: t });

            savedSchedules.push(schedule);
        }

        await t.commit();

        res.json({
            message: "Schedule generated successfully",
            days: savedSchedules.length
        });

    } catch (err) {
        await t.rollback();
        console.error("❌ ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

//
// 🔥 GET TODAY (USER-SPECIFIC)
//
router.get("/today", auth, async (req, res) => {
    try {
        const today = new Date().toISOString().split("T")[0];

        const schedule = await Schedule.findOne({
            where: {
                date: today,
                ownerId: req.user.id // 🔥 FILTER BY USER
            },
            include: ScheduleItem,
        });

        if (!schedule) {
            return res.json({ message: "No schedule for today" });
        }

        res.json({
            date: schedule.date,
            items: schedule.ScheduleItems,
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//
// 🔥 GET FULL SCHEDULE (USER-SPECIFIC)
//
router.get("/", auth, async (req, res) => {
    try {
        const schedules = await Schedule.findAll({
            where: {
                ownerId: req.user.id // 🔥 CRITICAL FIX
            },
            include: ScheduleItem,
            order: [["date", "ASC"]],
        });

        res.json(schedules);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;