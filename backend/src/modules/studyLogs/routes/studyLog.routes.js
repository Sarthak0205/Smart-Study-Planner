"use strict";

const express = require("express");
const authenticate = require("../../../shared/middleware/authenticate.middleware");
const validateRequest = require("../../../shared/middleware/validate.middleware");
const controller = require("../controllers/studyLog.controller");
const {
    submitStudyLogSchema,
    planExecutionQuerySchema,
    topicProgressSchema
} = require("../validators/studyLog.validation");

const router = express.Router();

router.use(authenticate);

router.post("/schedule-items/:id/logs", validateRequest(submitStudyLogSchema), controller.submitStudyLog);
router.get("/status", validateRequest(planExecutionQuerySchema), controller.getExecutionStatus);
router.get("/topics/:id/progress", validateRequest(topicProgressSchema), controller.getTopicProgress);
router.get("/adherence", validateRequest(planExecutionQuerySchema), controller.getAdherenceSummary);
router.get("/missed", validateRequest(planExecutionQuerySchema), controller.getMissedSessions);
router.get("/recovery", validateRequest(planExecutionQuerySchema), controller.getRecoveryState);

module.exports = router;
