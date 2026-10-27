const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Product = require("../models/Product");
const BundleRule = require("../models/BundleRule");
const { initializeDemoStore } = require("../services/demoStore.service");

const COOKIE_NAME = "ricoz_token";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS,
  };
}

function createToken(userId) {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }

  return jwt.sign({ sub: String(userId) }, secret, { expiresIn: "1d" });
}

function setLoginCookie(res, userId) {
  res.cookie(COOKIE_NAME, createToken(userId), getCookieOptions());
}

function publicUser(user) {
  return {
    id: String(user._id),
    email: user.email,
    storeId: user.storeId,
  };
}

async function register(req, res, next) {
  let createdUser = null;

  try {
    const body = req.body || {};
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body.password;

    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: "Password must contain between 8 and 128 characters.",
      });
    }

    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // The first registered account claims the existing demo store.
    // Later accounts receive independent store IDs.
    const demoStoreOwner = await User.findOne({
      storeId: "demo-store",
    })
      .select("_id")
      .lean();

    const storeId = demoStoreOwner
      ? new mongoose.Types.ObjectId().toString()
      : "demo-store";

    const passwordHash = await bcrypt.hash(password, 12);

    createdUser = await User.create({
      email,
      passwordHash,
      storeId,
    });

    try {
      await initializeDemoStore(storeId);
    } catch (setupError) {
      await User.deleteOne({ _id: createdUser._id });

      // Do not remove the existing shared demo catalog when
      // registration fails for the first account.
      if (storeId !== "demo-store") {
        await Product.deleteMany({ storeId });
        await BundleRule.deleteMany({ storeId });
      }

      throw setupError;
    }

    setLoginCookie(res, createdUser._id);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user: publicUser(createdUser),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "The account or store already exists. Please try again.",
      });
    }

    next(error);
  }
}

async function login(req, res, next) {
  try {
    const body = req.body || {};

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body.password;

    if (
      !email ||
      typeof password !== "string" ||
      password.length === 0 ||
      password.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter your email and password.",
      });
    }

    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        success: false,
        message: "Incorrect email or password.",
      });
    }

    setLoginCookie(res, user._id);

    return res.json({
      success: true,
      message: "Signed in successfully.",
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
}

function logout(req, res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res.json({
    success: true,
    message: "Signed out successfully.",
  });
}

function me(req, res) {
  return res.json({
    success: true,
    user: req.user,
  });
}

module.exports = {
  register,
  login,
  logout,
  me,
};
