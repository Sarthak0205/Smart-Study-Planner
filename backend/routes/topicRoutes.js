const express = require("express");
const router = express.Router();
const { Topic } = require("../models");

// Add topic
router.post("/", async (req, res) => {
    try {
        const topic = await Topic.create(req.body);
        res.json(topic);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get all topics
router.get("/", async (req, res) => {
    const topics = await Topic.findAll();
    res.json(topics);
});

module.exports = router;