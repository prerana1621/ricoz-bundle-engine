const Product = require("../models/Product");
const BundleRule = require("../models/BundleRule");
const { getRecommendations } = require("./recommendation.service");

const MAX_DISCOUNT_PERCENT = 15;

function roundMoney(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function calculateDiscount(subtotal, discountPercent) {
  if (
    !Number.isFinite(discountPercent) ||
    discountPercent < 0 ||
    discountPercent > MAX_DISCOUNT_PERCENT
  ) {
    const error = new Error("The configured discount is invalid.");
    error.statusCode = 500;
    throw error;
  }

  return roundMoney(subtotal * (discountPercent / 100));
}

async function generateBundleOffers(
  cartProductIds,
  storeId = "demo-store",
  suppliedRecommendations = null,
) {
  const uniqueCartIds = [...new Set(cartProductIds)];

  if (uniqueCartIds.length !== cartProductIds.length) {
    const error = new Error("Duplicate cart product IDs are not allowed.");

    error.statusCode = 400;
    throw error;
  }

  const cartProducts = await Product.find({
    _id: { $in: uniqueCartIds },
    storeId,
    active: true,
  }).lean();

  if (cartProducts.length !== uniqueCartIds.length) {
    const error = new Error(
      "One or more cart products were not found in this store.",
    );

    error.statusCode = 400;
    throw error;
  }

  if (cartProducts.some((product) => product.inventory <= 0)) {
    const error = new Error(
      "A cart product is out of stock. Refresh the cart before generating offers.",
    );

    error.statusCode = 409;
    throw error;
  }

  const cartSubtotal = roundMoney(
    cartProducts.reduce((total, product) => total + product.price, 0),
  );

  const [recommendations, rules] = await Promise.all([
    Array.isArray(suppliedRecommendations)
      ? Promise.resolve(suppliedRecommendations)
      : getRecommendations(uniqueCartIds, 10, storeId),

    BundleRule.find({
      storeId,
      enabled: true,
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean(),
  ]);

  // Only strongly relevant recommendations qualify for
  // discounted bundles. Generic discovery items do not.
  const eligibleAddOns = recommendations.filter(
    ({ product, score }) =>
      score >= 30 &&
      product.active &&
      product.inventory > 0 &&
      !uniqueCartIds.includes(String(product._id)),
  );

  const bundles = rules
    .map((rule) => {
      const addOnProducts = eligibleAddOns
        .slice(0, rule.addOnCount)
        .map(({ product }) => product);

      // Skip a rule if there aren't enough eligible add-ons.
      if (addOnProducts.length !== rule.addOnCount) {
        return null;
      }

      const addOnSubtotal = roundMoney(
        addOnProducts.reduce((total, product) => total + product.price, 0),
      );

      const discountAmount = calculateDiscount(
        addOnSubtotal,
        rule.discountPercent,
      );

      const originalTotal = roundMoney(cartSubtotal + addOnSubtotal);

      const finalTotal = Math.max(
        0,
        roundMoney(originalTotal - discountAmount),
      );

      return {
        id: String(rule._id),
        name: rule.name,
        description: rule.description,
        discountPercent: rule.discountPercent,

        cartProductIds: uniqueCartIds,

        addOnProductIds: addOnProducts.map((product) => String(product._id)),

        cartProducts,
        addOnProducts,

        cartSubtotal,
        addOnSubtotal,
        discountAmount,
        originalTotal,
        finalTotal,

        incrementalRevenue: roundMoney(finalTotal - cartSubtotal),
      };
    })
    .filter(Boolean);

  return {
    currentCartSubtotal: cartSubtotal,
    bundles,
  };
}

module.exports = {
  generateBundleOffers,
};
