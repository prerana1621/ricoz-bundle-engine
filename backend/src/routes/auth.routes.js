const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  register,
  login,
  logout,
  me,
} = require("../controllers/auth.controller");

const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again later.",
  },
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);

module.exports = router;
