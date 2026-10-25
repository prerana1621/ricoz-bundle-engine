
const express = require("express");
const {
  generateBundles
} = require("../controllers/bundle.controller");

const router = express.Router();

router.post("/", generateBundles);

module.exports = router;

