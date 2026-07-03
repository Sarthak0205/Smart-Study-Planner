"use strict";

const express = require("express");
const authenticate = require("../../../shared/middleware/authenticate.middleware");
const validateRequest = require("../../../shared/middleware/validate.middleware");
const scheduleController = require("../controllers/schedule.controller");
const {
    activeScheduleSchema,
    historySchema,
    runDetailsSchema
} = require("../validators/schedule.validation");

const router = express.Router();

router.use(authenticate);

router.get("/active", validateRequest(activeScheduleSchema), scheduleController.getActiveSchedule);
router.get("/today", validateRequest(activeScheduleSchema), scheduleController.getToday);
router.get("/", validateRequest(historySchema), scheduleController.getHistory);
router.get("/:id", validateRequest(runDetailsSchema), scheduleController.getDetails);
router.get("/:id/days", validateRequest(runDetailsSchema), scheduleController.getDetails);

module.exports = router;
