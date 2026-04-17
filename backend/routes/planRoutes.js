const express = require("express");
const router = express.Router();

const { Schedule, ScheduleItem, UserSchedule, User, sequelize } = require("../models");

const auth = require("../middleware/auth");
const role = require("../middleware/role");

//
// 🔥 CREATE PLAN
//
router.post("/", auth, async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { title, isPublic, topics } = req.body;

        // 🔒 ROLE CHECK (CLEAN)
        if (isPublic && !["teacher", "admin"].includes(req.user.role)) {
            return res.status(403).json({
                message: "Only teachers/admin can create public plans"
            });
        }

        const plan = await Schedule.create({
            title: title || `Plan ${new Date().toLocaleDateString()}`,
            isPublic: isPublic || false,
            ownerId: req.user.id
        }, { transaction: t });

        if (topics && topics.length > 0) {
            const items = topics.map(topic => ({
                topic_name: topic.topic_name,
                allocated_hours: topic.allocated_hours,
                priority_score: topic.priority || 0,
                reason: {},
                ScheduleId: plan.id
            }));

            await ScheduleItem.bulkCreate(items, { transaction: t });
        }

        await t.commit();

        res.json({
            message: "Plan created successfully",
            planId: plan.id
        });

    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: err.message });
    }
});


//
// 🔥 GET PUBLIC PLANS (AUTH REQUIRED)
//
router.get("/public", auth, async (req, res) => {
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

        const originalPlan = await Schedule.findByPk(id, {
            include: [ScheduleItem],
            transaction: t
        });

        if (!originalPlan) {
            await t.rollback();
            return res.status(404).json({ message: "Plan not found" });
        }

        // 🔒 ACCESS CONTROL
        if (!originalPlan.isPublic && originalPlan.ownerId !== req.user.id) {
            await t.rollback();
            return res.status(403).json({ message: "Cannot follow private plan" });
        }

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

        await UserSchedule.create({
            userId: req.user.id,
            scheduleId: id
        }, { transaction: t });

        const newSchedule = await Schedule.create({
            title: originalPlan.title + " (My Copy)",
            isPublic: false,
            ownerId: req.user.id,
            sourcePlanId: originalPlan.id
        }, { transaction: t });

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
            message: "Plan followed successfully",
            newPlanId: newSchedule.id
        });

    } catch (err) {
        await t.rollback();
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

        res.json({ owned, followed });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


//
// 🔥 GET USER PLANS
//
router.get("/", auth, async (req, res) => {
    try {
        const plans = await Schedule.findAll({
            where: {
                ownerId: req.user.id,
                generatedFromPlanId: null
            },
            include: [ScheduleItem]
        });

        res.json(plans);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;