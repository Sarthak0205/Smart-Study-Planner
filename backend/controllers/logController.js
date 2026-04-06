const { Topic, StudyLog } = require("../models");

const addLog = async (req, res) => {
    try {
        const { topicId, hours_studied, difficulty_feedback } = req.body;

        const topic = await Topic.findByPk(topicId);

        if (!topic) {
            return res.status(404).json({ message: "Topic not found" });
        }

        // ✅ SAVE LOG
        const log = await StudyLog.create({
            hours_studied,
            difficulty_feedback,
            TopicId: topicId,
        });

        // ✅ UPDATE PROGRESS
        topic.progress += hours_studied / topic.estimated_hours;

        if (topic.progress >= 1) {
            topic.status = "completed";
            topic.progress = 1;
        } else {
            topic.status = "in_progress";
        }

        // ✅ ADAPTIVE DIFFICULTY (FIXED)
        const k = 0.3;
        const expected = topic.difficulty;

        topic.difficulty =
            expected + k * (difficulty_feedback - expected);

        await topic.save();

        res.json({
            message: "Log added & topic updated",
            topic,
        });

    } catch (err) {
        res.status(500).json(err);
    }
};

module.exports = { addLog };