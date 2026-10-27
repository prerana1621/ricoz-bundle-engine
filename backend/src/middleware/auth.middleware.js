const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.ricoz_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please sign in to continue.",
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 32) {
      throw new Error("JWT_SECRET is missing or too short.");
    }

    const payload = jwt.verify(token, secret);

    const user = await User.findById(payload.sub)
      .select("_id email storeId")
      .lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Your session is no longer valid. Please sign in again.",
      });
    }

    req.user = {
      id: String(user._id),
      email: user.email,
      storeId: user.storeId,
    };

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Your session has expired. Please sign in again.",
      });
    }

    next(error);
  }
}

module.exports = { requireAuth };
