const { ScheduleItem, StudyLog, Schedule, Topic, sequelize } = require("../models");

const addLog = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { scheduleItemId, hours_studied, difficulty_feedback } = req.body;
        const userId = req.user.id;

        // 🔴 VALIDATION
        if (!scheduleItemId) {
            return res.status(400).json({ message: "scheduleItemId is required" });
        }

        if (
            difficulty_feedback &&
            !["easy", "medium", "hard"].includes(difficulty_feedback)
        ) {
            return res.status(400).json({ message: "Invalid difficulty_feedback" });
        }

        // 🔥 SECURE FETCH
        const scheduleItem = await ScheduleItem.findByPk(scheduleItemId, {
            include: {
                model: Schedule,
                where: { ownerId: userId }
            },
            transaction: t
        });

        if (!scheduleItem) {
            await t.rollback();
            return res.status(404).json({
                message: "Schedule item not found or unauthorized"
            });
        }

        // 🔥 HOURS
        const hours = hours_studied
            ? Number(hours_studied)
            : scheduleItem.allocated_hours;

        if (isNaN(hours) || hours <= 0) {
            await t.rollback();
            return res.status(400).json({
                message: "Invalid hours_studied"
            });
        }

        let log;

        try {
            // 🔥 CREATE LOG (RACE SAFE)
            log = await StudyLog.create({
                ScheduleItemId: scheduleItem.id,
                hours_studied: hours,
                difficulty_feedback: difficulty_feedback || null,
                userId
            }, { transaction: t });

        } catch (err) {
            if (err.name === "SequelizeUniqueConstraintError") {
                await t.rollback();
                return res.status(400).json({
                    message: "Already marked as done"
                });
            }
            throw err;
        }

        // 🔥 UPDATE TOPIC
        const topicId = scheduleItem.sourceItemId;

        if (topicId) {
            const topic = await Topic.findByPk(topicId, { transaction: t });

            if (topic) {
                const currentProgress = topic.progress || 0;

                const progressIncrease = hours / topic.estimated_hours;

                const newProgress = Math.min(1, currentProgress + progressIncrease);

                topic.progress = newProgress;

                if (newProgress >= 1) {
                    topic.status = "completed";
                } else if (newProgress > 0) {
                    topic.status = "in_progress";
                }

                await topic.save({ transaction: t });
            }
        }

        await t.commit();

        return res.json({
            message: "Study session logged & progress updated"
        });

    } catch (err) {
        await t.rollback();
        console.error("❌ LOG ERROR:", err);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

module.exports = { addLog };