const express = require("express");
const router = express.Router();

const { Schedule, ScheduleItem, UserSchedule, User, sequelize } = require("../models");

const auth = require("../middleware/auth");

//
// 🔥 CREATE PLAN
//
router.post("/", auth, async (req, res) => {
    try {
        const { title, isPublic } = req.body;

        // 🔥 ONLY teacher/admin can create public plans
        if (isPublic && !["teacher", "admin"].includes(req.user.role)) {
            return res.status(403).json({
                message: "Only teachers can create public plans"
            });
        }

        const plan = await Schedule.create({
            title: title || "Untitled Plan",
            isPublic: isPublic || false,
            ownerId: req.user.id
        });

        res.json(plan);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//
// 🔥 GET PUBLIC PLANS
//
router.get("/public", async (req, res) => {
    try {
        const plans = await Schedule.findAll({
            where: { isPublic: true },
            include: [{
                model: User,
                as: "owner",
                attributes: ["id", "name"]
            }]
        });

        res.json(plans);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//
// 🔥 FOLLOW + CLONE PLAN
//
router.post("/:id/follow", auth, async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { id } = req.params;

        console.log("🔥 FOLLOW API HIT");

        // 🔹 Fetch original plan WITH items
        const originalPlan = await Schedule.findByPk(id, {
            include: [{
                model: ScheduleItem
            }],
            transaction: t
        });

        if (!originalPlan) {
            await t.rollback();
            return res.status(404).json({ message: "Plan not found" });
        }

        // 🔹 Prevent duplicate follow
        const existing = await UserSchedule.findOne({
            where: {
                userId: req.user.id,
                scheduleId: id
            },
            transaction: t
        });

        if (existing) {
            await t.rollback();
            return res.status(400).json({ message: "Already following" });
        }

        console.log("🔥 CLONING STARTED");

        // 🔹 Create follow entry
        await UserSchedule.create({
            userId: req.user.id,
            scheduleId: id
        }, { transaction: t });

        // 🔹 Create cloned schedule
        const newSchedule = await Schedule.create({
            title: originalPlan.title + " (My Copy)",
            isPublic: false,
            ownerId: req.user.id,
            sourcePlanId: originalPlan.id // 🔥 NEW
        });
        console.log("🔥 NEW SCHEDULE CREATED:", newSchedule.id);

        // 🔹 Clone items
        const items = (originalPlan.ScheduleItems || []).map(item => ({
            topic_name: item.topic_name,
            allocated_hours: item.allocated_hours,
            priority_score: item.priority_score,
            reason: item.reason,
            ScheduleId: newSchedule.id
        }));

        if (items.length > 0) {
            await ScheduleItem.bulkCreate(items, { transaction: t });
        }

        await t.commit();

        res.json({
            message: "Plan followed and cloned successfully",
            newPlanId: newSchedule.id
        });

    } catch (err) {
        await t.rollback();
        console.error("❌ FOLLOW ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

//
// 🔥 GET MY PLANS
//
router.get("/my", auth, async (req, res) => {
    try {
        const owned = await Schedule.findAll({
            where: { ownerId: req.user.id }
        });

        const followed = await req.user.getFollowedPlans();

        res.json({
            owned,
            followed
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;