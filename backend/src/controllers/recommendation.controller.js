const mongoose = require("mongoose");
const { getRecommendations } = require("../services/recommendation.service");

async function recommend(req, res, next) {
  try {
    const { cartProductIds, limit } = req.body;

    if (
      !Array.isArray(cartProductIds) ||
      cartProductIds.length === 0 ||
      cartProductIds.length > 50
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide between 1 and 50 cart product IDs.",
      });
    }

    if (
      cartProductIds.some(
        (id) => typeof id !== "string" || !mongoose.isValidObjectId(id),
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "One or more product IDs are invalid.",
      });
    }

    if (
      limit !== undefined &&
      (!Number.isInteger(limit) || limit < 1 || limit > 10)
    ) {
      return res.status(400).json({
        success: false,
        message: "Limit must be an integer between 1 and 10.",
      });
    }

    if (
      storeId !== undefined &&
      (typeof storeId !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(storeId))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid storeId.",
      });
    }

    const recommendations = await getRecommendations(
      cartProductIds,
      limit || 4,
      req.user.storeId,
    );

    res.json({
      success: true,
      count: recommendations.length,
      recommendations,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { recommend };
