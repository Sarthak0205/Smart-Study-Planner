const express = require("express");
const router = express.Router();
const { Topic, Schedule, ScheduleItem } = require("../models");
const { generateSchedule } = require("../services/scheduler");
const { StudyLog } = require("../models");

router.post("/generate", async (req, res) => {
    try {
        console.time("schedule");

        const { dailyHours } = req.body;

        const topics = await Topic.findAll({
            include: [{ model: StudyLog, as: "StudyLogs" }],
        });

        const scheduleData = generateSchedule(topics, dailyHours);

        // 🔥 Save efficiently
        let savedSchedules = [];

        for (let day of scheduleData) {
            const schedule = await Schedule.create({
                date: new Date(),
                total_hours: dailyHours,
            });

            const items = day.plan.map(item => ({
                topic_name: item.topic,
                allocated_hours: item.hours,
                priority_score: item.priority,
                ScheduleId: schedule.id,
            }));

            await ScheduleItem.bulkCreate(items);

            savedSchedules.push(schedule);
        }

        console.timeEnd("schedule");

        res.json({
            message: "Schedule generated and saved",
            data: scheduleData,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
// Get today's schedule
router.get("/today", async (req, res) => {
    try {
        const today = new Date().toDateString();

        const schedules = await Schedule.findAll({
            include: ScheduleItem,
        });

        if (schedules.length === 0) {
            return res.json({ message: "No schedules found" });
        }

        // Get latest schedule (simple logic)
        const latest = schedules[schedules.length - 1];

        res.json({
            date: latest.date,
            items: latest.ScheduleItems,
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            error: err.message,
            stack: err.stack
        });
    }
});
module.exports = router;