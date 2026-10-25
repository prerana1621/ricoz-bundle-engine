const express = require("express");
const { recommend } = require("../controllers/recommendation.controller");

const router = express.Router();

router.post("/", recommend);

module.exports = router;
