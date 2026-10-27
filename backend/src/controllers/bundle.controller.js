
const mongoose = require("mongoose");
const {
  generateBundleOffers
} = require("../services/bundle.service");

async function generateBundles(req, res, next) {
  try {
    const { cartProductIds } = req.body;

    if (
      !Array.isArray(cartProductIds) ||
      cartProductIds.length === 0 ||
      cartProductIds.length > 50
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide between 1 and 50 cart product IDs."
      });
    }

    if (
      cartProductIds.some(
        (id) => typeof id !== "string" ||
          !mongoose.isValidObjectId(id)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "One or more product IDs are invalid."
      });
    }

    if (new Set(cartProductIds).size !== cartProductIds.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate cart product IDs are not allowed."
      });
    }

    if (
      storeId !== undefined &&
      (
        typeof storeId !== "string" ||
        !/^[a-zA-Z0-9_-]{1,80}$/.test(storeId)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid storeId."
      });
    }

    const result = await generateBundleOffers(cartProductIds, req.user.storeId);

    return res.json({
      success: true,
      currentCartSubtotal: result.currentCartSubtotal,
      count: result.bundles.length,
      bundles: result.bundles
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { generateBundles };
