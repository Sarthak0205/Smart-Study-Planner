// routes/logRoutes.js

const express = require("express");
const router = express.Router();

const { addLog } = require("../controllers/logController");
const auth = require("../middleware/auth"); // 🔥 REQUIRED

router.post("/", auth, addLog);

module.exports = router;