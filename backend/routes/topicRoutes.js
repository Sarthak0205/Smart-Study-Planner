const express = require("express");
const router = express.Router();
const { Topic } = require("../models");
const auth = require("../middleware/auth");

// 🔹 GET topics
router.get("/", auth, async (req, res) => {
    try {
        const planId = Number(req.query.planId);

        if (!planId) {
            return res.status(400).json({ message: "planId is required" });
        }

        const topics = await Topic.findAll({
            where: {
                planId: req.query.planId
            },
            order: [["createdAt", "DESC"]] // 🔥 consistent UI ordering
        });

        res.json(topics);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch topics" });
    }
});

// 🔹 CREATE topic
router.post("/", auth, async (req, res) => {
    try {
        const { name, difficulty, estimated_hours, deadline, planId } = req.body;

        const userId = req.user.id;

        if (!name || !estimated_hours || !planId) {
            return res.status(400).json({
                message: "name, estimated_hours, planId required"
            });
        }

        const topic = await Topic.create({
            name: name.trim().toLowerCase(), // normalize
            difficulty,
            estimated_hours,
            deadline,
            userId,
            planId,
            progress: 0,
            status: "pending"
        });

        res.json(topic);

    } catch (err) {
        console.error("❌ TOPIC CREATE ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;