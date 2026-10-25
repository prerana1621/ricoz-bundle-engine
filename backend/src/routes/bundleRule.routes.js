const express = require("express");

const {
  listBundleRules,
  createBundleRule,
  updateBundleRule,
} = require("../controllers/bundleRule.controller");

const router = express.Router();

router.get("/", listBundleRules);
router.post("/", createBundleRule);
router.patch("/:id", updateBundleRule);

module.exports = router;
