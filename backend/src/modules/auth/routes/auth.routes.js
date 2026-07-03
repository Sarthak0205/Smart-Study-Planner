"use strict";

const express = require("express");
const validateRequest = require("../../../shared/middleware/validate.middleware");
const authenticate = require("../../../shared/middleware/authenticate.middleware");
const authRateLimiter = require("../middleware/authRateLimit.middleware");
const authController = require("../controllers/auth.controller");
const {
    registerSchema,
    loginSchema,
    refreshSchema,
    logoutSchema
} = require("../validators/auth.validation");

const router = express.Router();

router.post("/register", authRateLimiter, validateRequest(registerSchema), authController.register);
router.post("/login", authRateLimiter, validateRequest(loginSchema), authController.login);
router.post("/refresh", authRateLimiter, validateRequest(refreshSchema), authController.refresh);
router.post("/logout", validateRequest(logoutSchema), authController.logout);
router.get("/me", authenticate, authController.me);

module.exports = router;
