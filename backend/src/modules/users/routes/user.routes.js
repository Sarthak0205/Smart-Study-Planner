"use strict";

const express = require("express");
const validateRequest = require("../../../shared/middleware/validate.middleware");
const authenticate = require("../../../shared/middleware/authenticate.middleware");
const userController = require("../controllers/user.controller");
const {
    updateProfileSchema,
    changePasswordSchema
} = require("../validators/user.validation");

const router = express.Router();

router.get("/profile", authenticate, userController.getProfile);
router.patch("/profile", authenticate, validateRequest(updateProfileSchema), userController.updateProfile);
router.post("/change-password", authenticate, validateRequest(changePasswordSchema), userController.changePassword);

module.exports = router;
