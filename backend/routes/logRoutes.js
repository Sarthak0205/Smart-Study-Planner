const express = require("express");
const router = express.Router();
const { addLog } = require("../controllers/logController");

router.post("/", addLog);

module.exports = router;