const express = require("express");
const { getCartInsights } = require("../controllers/cartInsights.controller");

const router = express.Router();

router.post("/", getCartInsights);

module.exports = router;
