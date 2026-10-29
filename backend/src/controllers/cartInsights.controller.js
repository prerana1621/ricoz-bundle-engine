const mongoose = require("mongoose");

const { getRecommendations } = require("../services/recommendation.service");

const { generateBundleOffers } = require("../services/bundle.service");

async function getCartInsights(req, res, next) {
  try {
    const body = req.body || {};
    const { cartProductIds, limit } = body;

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

    if (new Set(cartProductIds).size !== cartProductIds.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate cart product IDs are not allowed.",
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

    const storeId = req.user.storeId;

    // Compute recommendations once, with enough candidates
    // available for bundle generation.
    const allRecommendations = await getRecommendations(
      cartProductIds,
      10,
      storeId,
    );

    // Pass trusted, server-generated results to the bundle service.
    const bundleResult = await generateBundleOffers(
      cartProductIds,
      storeId,
      allRecommendations,
    );

    return res.json({
      success: true,
      recommendations: allRecommendations.slice(0, limit || 4),
      bundles: bundleResult.bundles,
      currentCartSubtotal: bundleResult.currentCartSubtotal,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getCartInsights };
