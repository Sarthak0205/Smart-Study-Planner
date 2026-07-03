"use strict";

const express = require("express");
const authenticate = require("../../../shared/middleware/authenticate.middleware");
const validateRequest = require("../../../shared/middleware/validate.middleware");
const planController = require("../controllers/plan.controller");
const topicController = require("../../topics/controllers/topic.controller");
const scheduleController = require("../../schedules/controllers/schedule.controller");
const {
    createPlanSchema,
    updatePlanSchema,
    planIdSchema,
    listPlansSchema,
    publicPlansSchema
} = require("../validators/plan.validation");
const {
    createTopicSchema,
    updateTopicSchema,
    deleteTopicSchema,
    listTopicsSchema,
    reorderTopicsSchema
} = require("../../topics/validators/topic.validation");
const { generateScheduleSchema } = require("../../schedules/validators/schedule.validation");

const router = express.Router();

router.use(authenticate);

router.get("/public", validateRequest(publicPlansSchema), planController.listPublicPlans);
router.get("/", validateRequest(listPlansSchema), planController.listOwnedPlans);
router.post("/", validateRequest(createPlanSchema), planController.createPlan);
router.get("/:id", validateRequest(planIdSchema), planController.getPlan);
router.patch("/:id", validateRequest(updatePlanSchema), planController.updatePlan);
router.delete("/:id", validateRequest(planIdSchema), planController.deletePlan);
router.post("/:id/publish", validateRequest(planIdSchema), planController.publishPlan);
router.post("/:id/archive", validateRequest(planIdSchema), planController.archivePlan);
router.post("/:id/follow", validateRequest(planIdSchema), planController.followPlan);
router.post("/:id/schedule-runs", validateRequest(generateScheduleSchema), scheduleController.generateSchedule);

router.get("/:id/topics", validateRequest(listTopicsSchema), topicController.listTopics);
router.post("/:id/topics", validateRequest(createTopicSchema), topicController.createTopic);
router.patch("/:id/topics/reorder", validateRequest(reorderTopicsSchema), topicController.reorderTopics);
router.patch("/:id/topics/:topicId", validateRequest(updateTopicSchema), topicController.updateTopic);
router.delete("/:id/topics/:topicId", validateRequest(deleteTopicSchema), topicController.deleteTopic);

module.exports = router;
